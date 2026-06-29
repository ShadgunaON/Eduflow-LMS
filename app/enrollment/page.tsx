"use client";

import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import type { Status } from "../data/types";
import { enrollmentSchema } from "../lib/schemas";
import { DashboardCard } from "../components/ui/DashboardCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { StatCard } from "../components/ui/StatCard";
import { UserAvatar } from "../components/ui/UserAvatar";
import { motion } from "framer-motion";
import { Search, Filter, Edit2, Trash2, BookOpen, Users, CheckCircle, Clock } from "lucide-react";

const STATUS_OPTIONS: Status[] = ["Active", "Pending", "Completed"];

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export default function EnrollmentPage() {
  const { students, courses, enrollments, addEnrollment, updateEnrollment, deleteEnrollment, hydrated } = useApp();
  const { addToast } = useToast();

  const [studentName, setStudentName] = useState<string>("");
  const [courseName,  setCourseName]  = useState<string>("");
  const [status,      setStatus]      = useState<Status>("Active");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  type SortField = "studentName" | "courseName" | "status" | "enrolledDate";
  const [sortField, setSortField] = useState<SortField>("enrolledDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [errors, setErrors] = useState<{ studentName?: string; courseName?: string }>({});
  const isEditing = editingId !== null;

  if (!hydrated) {
    return <div className="p-10 animate-pulse bg-slate-900 h-screen" />;
  }

  const filtered = enrollments.filter(
    (e) =>
      e.studentName.toLowerCase().includes(search.toLowerCase()) ||
      e.courseName.toLowerCase().includes(search.toLowerCase())  ||
      e.status.toLowerCase().includes(search.toLowerCase())
  );

  const sortedFiltered = [...filtered].sort((a, b) => {
    let valA = a[sortField].toLowerCase();
    let valB = b[sortField].toLowerCase();
    
    if (sortField === "enrolledDate") {
      const dateA = new Date(a.enrolledDate).getTime();
      const dateB = new Date(b.enrolledDate).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    }
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const activeCount    = enrollments.filter((e) => e.status === "Active").length;
  const pendingCount   = enrollments.filter((e) => e.status === "Pending").length;
  const completedCount = enrollments.filter((e) => e.status === "Completed").length;

  function validate(): boolean {
    const result = enrollmentSchema.safeParse({ studentName, courseName, enrolledDate: todayISO(), status });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => fieldErrors[String(issue.path[0])] = issue.message);
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleAdd() {
    if (!validate()) return;
    try {
      await addEnrollment({ studentName, courseName, enrolledDate: todayISO(), status });
      addToast("Enrollment added successfully", "success");
      resetForm();
    } catch (e: unknown) {
      if (e instanceof Error) addToast(e.message, "error");
    }
  }

  function startEdit(enrollment: { id: string; studentName: string; courseName: string; status: Status }) {
    setEditingId(enrollment.id);
    setStudentName(enrollment.studentName);
    setCourseName(enrollment.courseName);
    setStatus(enrollment.status);
    setErrors({});
  }

  async function handleSaveEdit() {
    if (!validate() || editingId === null) return;
    try {
      const existing = enrollments.find((e) => e.id === editingId);
      await updateEnrollment(editingId, { studentName, courseName, enrolledDate: existing?.enrolledDate || todayISO(), status });
      addToast("Enrollment updated successfully", "success");
      resetForm();
    } catch (e: unknown) {
      if (e instanceof Error) addToast(e.message, "error");
    }
  }

  function promptDelete(id: string) { setDeleteId(id); }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteEnrollment(deleteId);
      addToast("Enrollment deleted", "info");
      if (editingId === deleteId) resetForm();
    } catch (e: unknown) {
      if (e instanceof Error) addToast(e.message, "error");
    } finally {
      setDeleteId(null);
    }
  }

  function resetForm() {
    setStudentName("");
    setCourseName("");
    setStatus("Active");
    setEditingId(null);
    setErrors({});
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto w-full space-y-6">
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Enrollment"
        message="Are you sure you want to delete this enrollment? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        confirmText="Delete"
      />

      <div className="mb-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight truncate">Enrollments</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Manage and track student course registrations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Enrollments" value={enrollments.length} icon={<Users size={24} />} />
        <StatCard title="Active" value={activeCount} icon={<BookOpen size={24} />} />
        <StatCard title="Pending" value={pendingCount} icon={<Clock size={24} />} />
        <StatCard title="Completed" value={completedCount} icon={<CheckCircle size={24} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <DashboardCard>
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-5">
              {isEditing ? "✏️ Edit Enrollment" : "➕ New Enrollment"}
            </h2>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-bold text-foreground mb-1.5">Student</label>
                <select
                  value={studentName}
                  onChange={(e) => { setStudentName(e.target.value); setErrors(prev => ({ ...prev, studentName: undefined })); }}
                  className={`w-full bg-surface-muted border ${errors.studentName ? "border-danger" : "border-surface-border"} rounded-xl px-4 py-3 pr-10 text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground appearance-none cursor-pointer`}
                >
                  <option value="" disabled className="text-slate-400">Select Student</option>
                  {students.map((s) => <option key={s.id} value={s.name} className="text-foreground bg-surface">{s.name}</option>)}
                </select>
                <div className="absolute top-[38px] right-3 flex items-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
                {errors.studentName && <p className="text-danger text-xs mt-1 font-semibold">{errors.studentName}</p>}
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-foreground mb-1.5">Course</label>
                <select
                  value={courseName}
                  onChange={(e) => { setCourseName(e.target.value); setErrors(prev => ({ ...prev, courseName: undefined })); }}
                  className={`w-full bg-surface-muted border ${errors.courseName ? "border-danger" : "border-surface-border"} rounded-xl px-4 py-3 pr-10 text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground appearance-none cursor-pointer`}
                >
                  <option value="" disabled className="text-slate-400">Select Course</option>
                  {courses.map((c) => <option key={c.id} value={c.name} className="text-foreground bg-surface">{c.name}</option>)}
                </select>
                <div className="absolute top-[38px] right-3 flex items-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
                {errors.courseName && <p className="text-danger text-xs mt-1 font-semibold">{errors.courseName}</p>}
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-foreground mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  className="w-full bg-surface-muted border border-surface-border rounded-xl px-4 py-3 pr-10 text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium text-foreground appearance-none cursor-pointer"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s} className="text-foreground bg-surface">{s}</option>)}
                </select>
                <div className="absolute top-[38px] right-3 flex items-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={isEditing ? handleSaveEdit : handleAdd}
                  className="w-full bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all active:scale-95"
                >
                  {isEditing ? "Save Changes" : "Enroll Student"}
                </button>
                {isEditing && (
                  <button
                    onClick={resetForm}
                    className="w-full mt-3 bg-surface-muted border border-surface-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-border transition-all"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          </DashboardCard>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <DashboardCard className="flex flex-col h-full" noPadding>
            <div className="p-6 border-b border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search enrollments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface-muted border border-surface-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                />
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Filter size={16} className="text-slate-400" />
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="bg-transparent text-sm font-medium text-foreground outline-none cursor-pointer"
                >
                  <option value="enrolledDate">Sort by Date</option>
                  <option value="studentName">Sort by Student</option>
                  <option value="courseName">Sort by Course</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto bg-surface rounded-b-2xl">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-surface-muted/50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Student</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Course</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Date</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {sortedFiltered.map((enrollment, idx) => (
                    <motion.tr 
                      key={enrollment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-surface-muted transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={enrollment.studentName} size="sm" />
                          <span className="font-bold text-foreground">{enrollment.studentName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground font-semibold">
                        {enrollment.courseName}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                        {enrollment.enrolledDate}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={enrollment.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(enrollment)} className="p-2 text-slate-400 hover:text-primary bg-surface rounded-lg shadow-sm border border-surface-border transition-all hover:scale-105">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => promptDelete(enrollment.id)} className="p-2 text-slate-400 hover:text-danger bg-surface rounded-lg shadow-sm border border-surface-border transition-all hover:scale-105">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {sortedFiltered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No enrollments found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}