"use client";

import { UserAvatar } from "./ui/UserAvatar";
import { StatusBadge } from "./ui/StatusBadge";
import { Edit2, Trash2, Mail, BookOpen, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";

type Props = {
  id: string;
  name: string;
  email: string;
  course: string;
  onEdit: () => void;
  onDelete: () => void;
};

export default function StudentCard({ id, name, email, course, onEdit, onDelete }: Props) {
  const { assignments, quizzes, enrollments } = useApp();

  // Find enrollment date
  const studentEnrollment = enrollments.find(e => e.userId === id);
  const date = studentEnrollment ? new Date(studentEnrollment.enrolledDate).toLocaleDateString() : "Pending";

  // Calculate progress
  const studentAssignments = assignments.filter(a => a.studentId === id);
  const studentQuizzes = quizzes.filter(q => q.studentId === id);
  
  const totalTasks = studentAssignments.length + studentQuizzes.length;
  const completedTasks = 
    studentAssignments.filter(a => a.status === "Graded" || a.status === "Submitted").length +
    studentQuizzes.filter(q => q.status === "Completed").length;

  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const status = progress === 100 ? "Completed" : progress > 0 ? "Active" : "Pending";

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface border border-surface-border p-3 sm:p-5 rounded-2xl flex flex-col shadow-card hover:shadow-card-dark hover:-translate-y-1 transition-all duration-300 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <UserAvatar name={name} size="lg" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{name}</h2>
            <div className="flex items-center gap-1.5 text-slate-500 font-medium text-sm mt-0.5">
              <Mail size={12} />
              <span className="truncate max-w-[150px]">{email}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="bg-surface-muted rounded-xl p-3 flex-1 mb-4 border border-surface-border/50">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
          <BookOpen size={16} className="text-primary" />
          <span className="truncate">{course}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-5">
          <Clock size={14} />
          <span>Enrolled {date}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold">Course Progress</span>
            <span className="text-foreground font-extrabold">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-surface-border rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <a
          href={`/students/${id}`}
          className="flex-[2] flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg text-sm font-medium transition-colors"
        >
          View Profile
        </a>
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 bg-surface-muted hover:bg-surface-border text-foreground py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-2 bg-danger-light/30 hover:bg-danger-light/50 text-danger py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}