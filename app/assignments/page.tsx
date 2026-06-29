"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useApp } from "../context/AppContext";
import { AssignmentService } from "../lib/api";
import { DashboardCard } from "../components/ui/DashboardCard";
import { motion } from "framer-motion";
import { 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Filter,
  Search,
  MoreVertical,
  ChevronRight
} from "lucide-react";
import { cn } from "../lib/utils";

// Mock Data Types
type AssignmentStatus = "Pending" | "Submitted" | "Graded" | "Overdue";

interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: AssignmentStatus;
  score?: string;
  studentName?: string; // For Admin/Instructor view
}

// Assignment list logic
export default function AssignmentsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { assignments, reloadAssignments, courses } = useApp();
  const isStudent = user?.role?.toUpperCase() === "STUDENT";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // State for creating assignment (Instructor only)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});

  const handleFileChange = (assignmentId: string, file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [assignmentId]: file }));
  };

  const handleCreateAssignment = async () => {
    if (!newTitle || !newCourseId || !newDueDate) {
      return addToast("Please fill all fields", "error");
    }
    try {
      await AssignmentService.addAssignment({
        title: newTitle,
        courseId: newCourseId,
        dueDate: newDueDate
      });
      addToast("Assignment created!", "success");
      setShowCreateForm(false);
      setNewTitle("");
      setNewCourseId("");
      setNewDueDate("");
      await reloadAssignments();
    } catch (err: any) {
      addToast(err.message, "error");
    }
  };

  // Filtering Logic
  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (a.studentName && a.studentName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "All" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAction = async (a: any) => {
    if (isStudent && a.status === "Pending") {
      const file = selectedFiles[a.assignmentId];
      if (!file) {
        addToast("Please select a file to submit", "error");
        return;
      }
      const formData = new FormData();
      formData.append("assignmentId", a.assignmentId);
      formData.append("textResponse", "Here is my submission.");
      formData.append("file", file);

      try {
        addToast("Uploading submission...", "info");
        await AssignmentService.submitAssignment(formData);
        addToast("Assignment submitted!", "success");
        setSelectedFiles(prev => ({ ...prev, [a.assignmentId]: null }));
        await reloadAssignments();
      } catch (e: any) {
        addToast(e.message, "error");
      }
    } else if (!isStudent && a.status === "Submitted") {
      try {
        addToast("Grading assignment...", "info");
        await AssignmentService.gradeAssignment({
          assignmentId: a.assignmentId,
          studentId: a.studentId,
          score: "95/100"
        });
        addToast("Grade recorded!", "success");
        await reloadAssignments();
      } catch (e: any) {
        addToast(e.message, "error");
      }
    }
  };

  const getStatusBadge = (status: AssignmentStatus) => {
    const styles = {
      Pending: "bg-warning/10 text-warning border-warning/20",
      Submitted: "bg-primary/10 text-primary border-primary/20",
      Graded: "bg-success/10 text-success border-success/20",
      Overdue: "bg-danger/10 text-danger border-danger/20",
    };

    return (
      <span className={cn("px-3 py-1.5 text-xs font-bold rounded-full border shadow-sm", styles[status])}>
        {status}
      </span>
    );
  };

  const getStatusIcon = (status: AssignmentStatus) => {
    switch (status) {
      case "Pending": return <Clock size={16} className="text-warning" />;
      case "Submitted": return <FileText size={16} className="text-primary" />;
      case "Graded": return <CheckCircle2 size={16} className="text-success" />;
      case "Overdue": return <AlertCircle size={16} className="text-danger" />;
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight truncate">Assignments</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            Manage your course work, submissions, and deadlines.
          </p>
        </div>
        {!isStudent && (
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-all shadow-md active:scale-95"
          >
            {showCreateForm ? "Cancel" : "Create Assignment"}
          </button>
        )}
      </div>

      {showCreateForm && !isStudent && (
        <DashboardCard className="p-4 sm:p-6 bg-surface border border-surface-border shadow-card rounded-2xl">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-5">New Assignment</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              type="text" 
              placeholder="Assignment Title" 
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="px-4 py-3 bg-surface-muted border border-surface-border text-foreground rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
            />
            <select 
              value={newCourseId}
              onChange={e => setNewCourseId(e.target.value)}
              className="px-4 py-3 bg-surface-muted border border-surface-border text-foreground rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
            >
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input 
              type="date" 
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="px-4 py-3 bg-surface-muted border border-surface-border text-foreground rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
            />
          </div>
          <button onClick={handleCreateAssignment} className="mt-5 px-4 py-2 bg-success hover:bg-success/90 text-white text-sm font-medium rounded-lg shadow-md transition-all active:scale-95">Save Assignment</button>
        </DashboardCard>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Assignments List */}
        <div className="xl:col-span-2 space-y-6">
          <DashboardCard className="p-0 overflow-hidden shadow-card">
            <div className="p-6 border-b border-surface-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search assignments or courses..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-muted border border-surface-border rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-medium text-foreground"
                />
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Filter size={18} className="text-slate-400" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 sm:w-40 px-3 py-3 bg-surface-muted border border-surface-border rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-medium text-foreground"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Graded">Graded</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>

            <div className="divide-y divide-surface-border">
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((assignment) => (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={assignment.id} 
                    className="p-6 bg-surface hover:bg-surface-muted transition-colors flex flex-col sm:flex-row sm:items-center gap-6"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-muted border border-surface-border flex items-center justify-center">
                      {getStatusIcon(assignment.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-foreground truncate">{assignment.title}</h3>
                        {getStatusBadge(assignment.status)}
                      </div>
                      <p className="text-sm text-slate-500 font-medium">
                        {assignment.course} {assignment.studentName && `• Student: ${assignment.studentName}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-48">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {assignment.status === "Graded" ? "Score" : "Due Date"}
                        </p>
                        <p className={cn("text-sm font-extrabold", assignment.status === "Overdue" ? "text-danger" : "text-foreground")}>
                          {assignment.status === "Graded" ? assignment.score : new Date(assignment.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {isStudent && assignment.status === "Pending" && (
                          <input 
                            type="file" 
                            onChange={(e) => handleFileChange(assignment.assignmentId, e.target.files?.[0] || null)}
                            className="text-xs max-w-[200px]"
                          />
                        )}
                        <button 
                          onClick={() => handleAction(assignment)}
                          disabled={assignment.status === "Graded" || assignment.status === "Overdue" || (isStudent && assignment.status === "Submitted")}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                            (assignment.status === "Graded" || assignment.status === "Overdue" || (isStudent && assignment.status === "Submitted"))
                              ? "bg-surface-muted text-slate-400 cursor-not-allowed border border-surface-border"
                              : "bg-primary text-white hover:bg-primary-hover active:scale-95"
                          )}
                          title={isStudent ? "Submit Assignment" : "Grade Assignment"}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-500 font-medium bg-surface">
                  <FileText size={48} className="mx-auto mb-4 opacity-20 text-slate-400" />
                  <p>No assignments found matching your criteria.</p>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>

        {/* Right Column: Widgets */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <DashboardCard className="p-6 flex items-center gap-4 bg-primary text-white border-0 shadow-lg">
              <div className="p-3 bg-white/20 rounded-xl">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-white/80 text-sm font-bold">Total</p>
                <p className="text-3xl font-extrabold">{assignments.length}</p>
              </div>
            </DashboardCard>
            
            <DashboardCard className="p-6 flex items-center gap-4 bg-surface border border-surface-border shadow-card">
              <div className="p-3 bg-warning/10 text-warning rounded-xl border border-warning/20">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-bold">Pending</p>
                <p className="text-3xl font-extrabold text-foreground">
                  {assignments.filter(a => a.status === "Pending" || a.status === "Submitted").length}
                </p>
              </div>
            </DashboardCard>
          </div>

          {/* Deadlines Calendar Widget */}
          <DashboardCard className="shadow-card border-surface-border bg-surface">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="text-primary" size={20} />
              <h2 className="text-lg font-bold text-foreground">Upcoming Deadlines</h2>
            </div>
            
            <div className="space-y-4">
              {assignments
                .filter(a => a.status === "Pending")
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, 4)
                .map((a) => (
                  <div key={a.id} className="flex gap-4 p-3 rounded-xl hover:bg-surface-muted border border-transparent hover:border-surface-border transition-all">
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary flex-shrink-0 shadow-sm border border-primary/20">
                      <span className="text-xs font-bold uppercase">{new Date(a.dueDate).toLocaleString('en-US', { month: 'short' })}</span>
                      <span className="text-xl font-extrabold leading-none mt-0.5">{new Date(a.dueDate).getDate()}</span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="font-bold text-foreground line-clamp-1">{a.title}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1 font-semibold">{a.course}</p>
                    </div>
                  </div>
              ))}
              {assignments.filter(a => a.status === "Pending").length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4 font-medium">No upcoming deadlines! 🎉</p>
              )}
            </div>
            
            <button className="w-full mt-6 py-3 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 active:scale-95">
              View Full Calendar
            </button>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
