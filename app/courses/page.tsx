"use client";

// =============================================================================
// courses/page.tsx  — EduFlow LMS  |  Courses Module
//
// CHANGES:
//   • Removed local Course interface, DEFAULT_COURSES, generateId()
//   • Now reads courses from AppContext via useApp() hook
//   • Added category field (was missing from original)
//   • Toast notifications on every add/edit/delete
// =============================================================================

import { useState, useRef } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import CourseCard from "../components/CourseCard";
import FormInput from "../components/FormInput";
import ConfirmModal from "../components/ConfirmModal";
import { courseSchema } from "../lib/schemas";

const CATEGORIES = ["Frontend", "Backend", "Fullstack", "Language", "DevOps", "Other"];

export default function CoursesPage() {
  const { courses, enrollments, addCourse, updateCourse, deleteCourse } = useApp();
  const { user, getToken } = useAuth();
  const { addToast } = useToast();
  const isStudent = user?.role?.toUpperCase() === "STUDENT";

  // Local form state
  const [name, setName]         = useState("");
  const [duration, setDuration] = useState("");
  const [fee, setFee]           = useState("");
  const [category, setCategory] = useState("Frontend");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageChanged, setImageChanged] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit & Delete state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Search
  const [search, setSearch] = useState("");

  // Sort
  type SortField = "name" | "fee" | "category";
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Validation errors
  const [errors, setErrors] = useState<{ name?: string; duration?: string; fee?: string }>({});

  function validate(): boolean {
    const result = courseSchema.safeParse({ name: name.trim(), duration: duration.trim(), fee: fee.trim(), category });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  // ── Add ────────────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!validate()) return;
    try {
      await addCourse({
        name: name.trim(),
        duration: duration.trim(),
        fee: fee.trim(),
        category,
        ...(imageUrl ? { imageUrl } : {}),
      });
      addToast("Course added successfully", "success");
      resetForm();
    } catch (e: unknown) {
      if (e instanceof Error) addToast(e.message, "error");
    }
  }

  // ── Start editing ──────────────────────────────────────────────────────
  function startEdit(course: { id: string; name: string; duration: string; fee: string; category: string; imageUrl?: string | null }) {
    setEditingId(course.id);
    setName(course.name);
    setDuration(course.duration);
    setFee(course.fee);
    setCategory(course.category);
    setImageUrl(course.imageUrl || "");
    setPreviewUrl(course.imageUrl || "");
    setImageChanged(false);
    setErrors({});
    const scrollContainer = document.querySelector('main');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Save edit ──────────────────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!validate() || editingId === null) return;
    try {
      await updateCourse(editingId, {
        name: name.trim(),
        duration: duration.trim(),
        fee: fee.trim(),
        category,
        ...(imageChanged ? { imageUrl: imageUrl || null } : {}),
      });
      addToast("Course updated successfully", "success");
      resetForm();
    } catch (e: unknown) {
      if (e instanceof Error) addToast(e.message, "error");
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  function promptDelete(id: string) {
    setDeleteId(id);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteCourse(deleteId);
      addToast("Course deleted", "info");
      if (editingId === deleteId) resetForm();
    } catch (e: unknown) {
      if (e instanceof Error) addToast(e.message, "error");
    } finally {
      setDeleteId(null);
    }
  }

  // ── Reset form ─────────────────────────────────────────────────────────
  function resetForm() {
    setName("");
    setDuration("");
    setFee("");
    setCategory("Frontend");
    setImageUrl("");
    setPreviewUrl("");
    setImageChanged(false);
    setEditingId(null);
    setErrors({});
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast("Image size must be less than 5MB", "error");
      return;
    }
    if (!file.type.startsWith("image/")) {
      addToast("Please upload an image file", "error");
      return;
    }

    setIsUploading(true);
    addToast("Uploading thumbnail...", "info");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = await getToken();

      const res = await fetch("/api/courses/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.imageUrl);
        setPreviewUrl(data.previewUrl || data.imageUrl);
        setImageChanged(true);
        addToast("Thumbnail uploaded successfully", "success");
      } else {
        const errData = await res.json();
        addToast(errData.error || "Failed to upload image", "error");
      }
    } catch (err) {
      console.error("Course upload fetch error:", err);
      addToast("Error uploading thumbnail", "error");
    } finally {
      setIsUploading(false);
    }
  }

  // ── Filtered list ──────────────────────────────────────────────────────
  const filtered = courses.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.duration.toLowerCase().includes(search.toLowerCase()) ||
    c.fee.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  const sortedFiltered = [...filtered].sort((a, b) => {
    let valA = a[sortField].toLowerCase();
    let valB = b[sortField].toLowerCase();
    if (sortField === "fee") {
      valA = a.fee.replace(/[^0-9.]/g, "");
      valB = b.fee.replace(/[^0-9.]/g, "");
      return sortOrder === "asc" ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    }
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const isEditing = editingId !== null;

  return (
    <div className="p-4 sm:p-8 flex-1 max-w-6xl mx-auto w-full">
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Course"
        message="Are you sure you want to delete this course? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        confirmText="Delete"
      />
      {/* Page header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight truncate">Courses</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            Manage your {courses.length} educational programs
          </p>
        </div>
      </div>

      {/* Add / Edit Form */}
      {!isStudent && (
        <div className="bg-surface p-4 sm:p-6 rounded-2xl mb-8 border border-surface-border shadow-card">
        <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-5">
          {isEditing ? "✏️  Edit Course" : "➕  Add New Course"}
        </h2>

        {/* Thumbnail Upload Area */}
        <div className="mb-6 flex items-start gap-4">
          <div 
            className={`relative w-32 h-20 sm:w-40 sm:h-24 rounded-xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-colors group ${
              previewUrl ? 'border-primary' : 'border-surface-border hover:border-primary hover:bg-primary/5'
            }`}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <>
                <Image src={previewUrl} alt="Thumbnail preview" fill className="object-cover opacity-80 group-hover:opacity-50 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/40">
                  <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded">Change</span>
                </div>
              </>
            ) : isUploading ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-6 h-6 text-slate-400 group-hover:text-primary mb-1 transition-colors" />
                <span className="text-xs font-bold text-slate-500 group-hover:text-primary transition-colors">Upload Cover</span>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
              disabled={isUploading} 
            />
          </div>
          
          {previewUrl && (
            <button 
              onClick={() => { setImageUrl(""); setPreviewUrl(""); setImageChanged(true); }}
              className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors mt-1"
              title="Remove Thumbnail"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-4 w-full">
          <FormInput
            className="flex-1"
            type="text"
            placeholder="Course Name"
            value={name}
            error={errors.name}
            onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
            onKeyDown={(e) => { if (e.key === "Enter") { if (isEditing) handleSaveEdit(); else handleAdd(); } }}
          />
          <FormInput
            className="flex-1"
            type="text"
            placeholder="Duration (e.g. 8 Weeks)"
            value={duration}
            error={errors.duration}
            onChange={(e) => { setDuration(e.target.value); setErrors(prev => ({ ...prev, duration: undefined })); }}
            onKeyDown={(e) => { if (e.key === "Enter") { if (isEditing) handleSaveEdit(); else handleAdd(); } }}
          />
          <FormInput
            className="flex-1"
            type="text"
            placeholder="Fee (₹)"
            value={fee}
            error={errors.fee}
            onChange={(e) => { setFee(e.target.value); setErrors(prev => ({ ...prev, fee: undefined })); }}
            onKeyDown={(e) => { if (e.key === "Enter") { if (isEditing) handleSaveEdit(); else handleAdd(); } }}
          />
          <div className="flex flex-col flex-1 w-full relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface-muted border border-surface-border text-foreground rounded-xl px-4 py-3 pr-10 appearance-none text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all font-medium cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="text-foreground bg-surface">{cat}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <button
            onClick={isEditing ? handleSaveEdit : handleAdd}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all active:scale-95 whitespace-nowrap mt-1 sm:mt-0"
          >
            {isEditing ? "Save Changes" : "+ Add Course"}
          </button>

          {isEditing && (
            <button
              onClick={resetForm}
              className="bg-surface-muted hover:bg-surface-border text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap mt-1 sm:mt-0"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="🔍  Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72 bg-surface border border-surface-border text-foreground placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all shadow-sm font-medium"
          />
          <span className="text-slate-500 text-sm whitespace-nowrap hidden sm:inline-block font-medium">
            {filtered.length} / {courses.length}
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500 font-semibold">Sort by:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="bg-surface border border-surface-border text-foreground rounded-lg px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm font-medium"
          >
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="fee">Fee</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className="bg-surface border border-surface-border text-foreground p-2.5 rounded-lg hover:bg-surface-muted transition-colors shadow-sm"
            title="Toggle Sort Order"
          >
            {sortOrder === "asc" ? "⬇️" : "⬆️"}
          </button>
        </div>
      </div>

      {/* Course List */}
      {sortedFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface/50 border border-dashed border-surface-border rounded-[24px]">
          <div className="w-20 h-20 bg-surface-muted rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">📚</span>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No courses found</h3>
          <p className="text-slate-500 text-sm font-medium">
            {search
              ? `Your search for "${search}" did not match any courses.`
              : "Get started by adding your first course above!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedFiltered.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              name={course.name}
              duration={course.duration}
              fee={course.fee}
              category={course.category}
              imageUrl={course.imageUrl}
              enrollmentCount={enrollments ? enrollments.filter(e => e.courseId === course.id).length : 0}
              canEdit={!isStudent}
              onEdit={() => startEdit(course as any)}
              onDelete={() => promptDelete(course.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}