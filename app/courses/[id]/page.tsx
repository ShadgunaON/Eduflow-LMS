"use client";

import { useApp } from "../../context/AppContext";
import { useParams, useRouter } from "next/navigation";
import { DashboardCard } from "../../components/ui/DashboardCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, IndianRupee, Users, Star, BarChart3, ListChecks, Award, PlayCircle, MessageSquare } from "lucide-react";
import ActivityTimeline from "../../components/ActivityTimeline";
import { ProgressRing } from "../../components/ui/ProgressRing";
import { UserAvatar } from "../../components/ui/UserAvatar";

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { courses, enrollments, activities } = useApp();
  
  const course = courses.find((c) => c.id === params?.id);
  
  if (!course) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Course not found</h2>
        <button 
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const courseEnrollments = enrollments.filter((e) => e.courseName === course.name);
  const courseActivities = activities.filter((a) => a.message.includes(course.name));
  
  const revenue = courseEnrollments.length * parseInt(course.fee, 10) || 0;
  const completedEnrollments = courseEnrollments.filter((e) => e.status === "Completed").length;
  const completionRate = courseEnrollments.length > 0 ? Math.round((completedEnrollments / courseEnrollments.length) * 100) : 0;
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to Courses
      </button>

      {/* 1. Overview Hero Banner */}
      <DashboardCard className="relative overflow-hidden p-0 sm:p-0 border-0 shadow-sm rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500 rounded-full mix-blend-overlay filter blur-[120px] opacity-60 translate-x-1/3 -translate-y-1/3" />
        
        <div className="relative flex flex-col md:flex-row z-10">
          <div className="w-full md:w-1/3 h-48 md:h-auto bg-white/5 backdrop-blur-sm border-r border-white/10 flex items-center justify-center p-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white text-center leading-tight drop-shadow-lg truncate">
              {course.name}
            </h1>
          </div>
          <div className="w-full md:w-2/3 p-6 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-white/10 text-white border border-white/20 text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                {course.category || "Frontend"}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight truncate">{course.name}</h2>
            <p className="text-indigo-100/80 max-w-2xl leading-relaxed">
              Comprehensive learning module designed to take students from beginner to advanced. Master the fundamentals and build production-ready projects.
            </p>
            
            <div className="flex flex-wrap items-center gap-8 mt-8 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md inline-flex w-max">
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 bg-indigo-500/20 rounded-lg"><Clock className="text-indigo-300" size={18} /></div>
                <span className="font-semibold">{course.duration}</span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 bg-emerald-500/20 rounded-lg"><IndianRupee className="text-emerald-300" size={18} /></div>
                <span className="font-semibold">{course.fee}</span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 bg-blue-500/20 rounded-lg"><Users className="text-blue-300" size={18} /></div>
                <span className="font-semibold">{courseEnrollments.length} Enrolled</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* 2. Enrolled Students List */}
          <DashboardCard>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="text-indigo-500" size={20} />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Enrollments</h2>
              </div>
              <button className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                View All
              </button>
            </div>
            
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Student ID</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {courseEnrollments.slice(0, 5).map((e) => (
                    <tr key={e.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                        <UserAvatar name={e.studentName} size="sm" />
                        {e.studentName}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{e.enrolledDate}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={e.status} />
                      </td>
                    </tr>
                  ))}
                  {courseEnrollments.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Users size={32} className="mb-2 opacity-20" />
                          <p>No students enrolled yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DashboardCard>
          
          {/* 5. Course Activity */}
          <DashboardCard>
            <div className="flex items-center gap-2 mb-6">
              <ListChecks className="text-rose-500" size={20} />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Course Activity Log</h2>
            </div>
            {courseActivities.length > 0 ? (
              <ActivityTimeline activities={courseActivities} maxItems={6} />
            ) : (
              <p className="text-slate-500 text-sm">No recent activity.</p>
            )}
          </DashboardCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Instructor Card */}
          <DashboardCard className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full mix-blend-overlay filter blur-[50px] opacity-30 translate-x-1/2 -translate-y-1/2" />
            <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-6">Course Instructor</h2>
            <div className="flex items-center gap-4 mb-4">
              <UserAvatar name="Dr. Emily Chen" size="lg" />
              <div>
                <h3 className="text-lg font-bold text-white">Dr. Emily Chen</h3>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Senior engineer with 10+ years of experience building scalable enterprise architectures. Passionate about teaching modern web stacks.
            </p>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-semibold transition-colors">
                <MessageSquare size={16} /> Contact
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors">
                View Profile
              </button>
            </div>
          </DashboardCard>

          {/* 3. Revenue Metrics */}
          <DashboardCard>
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="text-emerald-500" size={20} />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Course Metrics</h2>
            </div>
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                <p className="text-emerald-100 text-sm font-medium mb-1">Total Revenue</p>
                <p className="text-3xl font-black">₹{revenue.toLocaleString("en-IN")}</p>
              </div>
              
              <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Completion Rate</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Based on enrolled students</p>
                </div>
                <ProgressRing progress={completionRate} size={64} strokeWidth={6} />
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg. Time to Complete</p>
                  <p className="font-bold text-slate-900 dark:text-white">12 Days</p>
                </div>
              </div>
            </div>
          </DashboardCard>
          
          <DashboardCard>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-semibold transition-colors">
                Edit Course Content
              </button>
              <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors">
                Message All Students
              </button>
              <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors">
                Export Analytics
              </button>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
