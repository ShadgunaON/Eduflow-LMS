"use client";

import { motion } from "framer-motion";
import { Clock, IndianRupee, Users, PlayCircle, Edit2, Trash2 } from "lucide-react";
import { UserAvatar } from "./ui/UserAvatar";
import Link from "next/link";
import Image from "next/image";

type Props = {
  id: string;
  name: string;
  duration: string;
  fee: string;
  category?: string;
  imageUrl?: string | null;
  enrollmentCount?: number;
  onEdit: () => void;
  onDelete: () => void;
  canEdit?: boolean;
};

export default function CourseCard({ id, name, duration, fee, category, imageUrl, enrollmentCount = 0, onEdit, onDelete, canEdit = true }: Props) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-surface-border rounded-xl overflow-hidden shadow-card hover:shadow-card-dark hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full"
    >
      {/* Thumbnail Header */}
      <div className={`h-32 sm:h-40 w-full relative flex items-center justify-center overflow-hidden bg-surface-muted`}>
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill className="object-cover group-hover:scale-110 transition-transform duration-700 mix-blend-multiply opacity-90" />
        ) : (
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay group-hover:scale-110 transition-transform duration-700" />
        )}
        <PlayCircle className="text-white/90 w-12 h-12 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md scale-75 group-hover:scale-100 duration-300" />
        {category && (
          <span className="absolute top-4 left-4 bg-black/60 text-white text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-md font-bold z-20 shadow-sm border border-white/10">
            {category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-lg font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {name}
          </h2>
        </div>
        
        <div className="flex items-center gap-2 text-sm mb-4">
          <Users className="w-4 h-4 text-warning" />
          <span className="font-bold text-foreground">{enrollmentCount}</span>
          <span className="text-slate-500 font-medium">Students</span>
        </div>

        <div className="space-y-2.5 mb-6">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <Clock className="w-4 h-4 text-primary" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <IndianRupee className="w-4 h-4 text-success" />
            <span>{fee}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mt-3 pt-3 border-t border-surface-border">
            <UserAvatar name={`Instructor ${name}`} size="sm" />
            <span>Instructor {name.split(" ")[0]}</span>
          </div>
        </div>

        <div className="flex-1"></div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4">
          <Link
            href={`/courses/${id}`}
            className="flex-1 text-center bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg text-sm font-medium transition-colors"
          >
            View Details
          </Link>
          {canEdit && (
            <>
              <button
                onClick={onEdit}
                title="Edit Course"
                aria-label="Edit Course"
                className="p-2 bg-surface-muted hover:bg-surface-border text-foreground rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={onDelete}
                title="Delete Course"
                aria-label="Delete Course"
                className="p-2 bg-danger-light/30 hover:bg-danger-light/50 text-danger rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
