"use client";

import React from "react";
import Image from "next/image";

export default function PopularCoursesWidget({ courses, enrollments }: { courses: any[], enrollments: any[] }) {
  // Calculate enrollments per course
  const popularity = courses.map((course) => {
    const count = enrollments.filter((e) => e.courseName === course.name).length;
    return { ...course, students: count };
  }).sort((a, b) => b.students - a.students).slice(0, 4);

  return (
    <div className="bg-white dark:bg-slate-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl dark:hover:shadow-2xl shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Popular Courses
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Based on recent enrollments</p>
        </div>
        <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium hidden sm:block">
          Explore Catalog
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {popularity.map((course, idx) => (
          <div key={course.id} className="group flex flex-col bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className={`h-24 w-full relative overflow-hidden bg-gradient-to-br ${
              !course.imageUrl ? (
                idx % 4 === 0 ? "from-indigo-500 to-purple-600" :
                idx % 4 === 1 ? "from-emerald-400 to-teal-500" :
                idx % 4 === 2 ? "from-amber-400 to-orange-500" :
                "from-rose-400 to-red-500"
              ) : "bg-slate-200"
            }`}>
              {course.imageUrl && (
                <Image src={course.imageUrl} alt={course.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
              )}
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
              <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end z-20">
                <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-md text-slate-800 dark:text-slate-100">
                  {course.category}
                </span>
                <span className="text-white font-semibold text-sm drop-shadow-md shadow-black">₹{course.fee}</span>
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {course.name}
              </h3>
              <div className="mt-auto pt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  4.{8 - (idx % 3)}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {course.students} 
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
