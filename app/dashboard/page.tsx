"use client";

import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useRouter } from "next/navigation";
import { StatCard } from "../components/ui/StatCard";
import { DashboardCard } from "../components/ui/DashboardCard";
import { RevenueChart } from "../components/dashboard/RevenueChart";
import { EnrollmentDistribution } from "../components/dashboard/EnrollmentDistribution";
import { CoursePopularityChart } from "../components/dashboard/CoursePopularityChart";
import { MonthlyActivityChart } from "../components/dashboard/MonthlyActivityChart";
import QuickActions from "../components/QuickActions";
import PopularCoursesWidget from "../components/PopularCoursesWidget";
import UpcomingTasks from "../components/UpcomingTasks";
import ActivityTimeline from "../components/ActivityTimeline";
import { motion } from "framer-motion";
import { Users, BookOpen, ClipboardList, IndianRupee, Award } from "lucide-react";

export default function Dashboard() {
  const { students, courses, enrollments, activities, hydrated } = useApp();
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  if (!hydrated) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-48 bg-surface-muted rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-muted rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  const isStudent = user?.role === "STUDENT";
  const isTutor = user?.role?.toUpperCase() === "TUTOR";
  const firstName = user?.name?.split(" ")[0] || "User";

  // Overall Stats
  const totalRevenue = enrollments.reduce((sum, e) => {
    const course = courses.find((c) => c.name === e.courseName);
    return sum + (course ? parseInt(course.fee, 10) : 0);
  }, 0);

  const completedCount = enrollments.filter(e => e.status === "Completed").length;
  const completionRate = enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0;

  // Compute Revenue Data (Monthly)
  const revenueByMonth = enrollments.reduce((acc: Record<string, number>, e) => {
    const course = courses.find(c => c.name === e.courseName);
    const date = new Date(e.enrolledDate);
    const month = date.toLocaleString("default", { month: "short" });
    acc[month] = (acc[month] || 0) + (course ? parseInt(course.fee, 10) : 0);
    return acc;
  }, {});
  const revenueData = Object.keys(revenueByMonth).map(month => ({ name: month, revenue: revenueByMonth[month] })).reverse();
  if (revenueData.length === 0) revenueData.push({ name: "No Data", revenue: 0 });

  // Compute Enrollment Distribution
  const distByCategory = enrollments.reduce((acc: Record<string, number>, e) => {
    const course = courses.find(c => c.name === e.courseName);
    const cat = course?.category || "Other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const distributionData = Object.keys(distByCategory).map(cat => ({ name: cat, value: distByCategory[cat] }));

  // Compute Course Popularity (Top 5)
  const popularityCount = enrollments.reduce((acc: Record<string, number>, e) => {
    acc[e.courseName] = (acc[e.courseName] || 0) + 1;
    return acc;
  }, {});
  const popularityData = Object.keys(popularityCount)
    .map(name => ({ name, enrollments: popularityCount[name] }))
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 5);
    
  // Compute Monthly Activity
  const activityByMonth = activities.reduce((acc: Record<string, number>, a) => {
    const date = new Date(a.timestamp);
    const month = date.toLocaleString("default", { month: "short" });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  const activityData = Object.keys(activityByMonth).map(month => ({ name: month, activities: activityByMonth[month] })).reverse();
  if (activityData.length === 0) activityData.push({ name: "No Data", activities: 0 });

  // Define animations
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={container}
      className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* ── HERO SECTION ────────────────────────────────────────────── */}
      <motion.div variants={item} className="bg-surface border border-surface-border rounded-2xl shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-2 truncate">
            Welcome back, {firstName}
          </h1>
          <p className="text-slate-500 text-base max-w-xl">
            {isStudent 
              ? "Here is what's happening with your courses today."
              : "Here is your global overview of EduFlow LMS platform operations."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (isStudent) router.push('/courses');
              else addToast("Reports module coming in Phase 4", "info");
            }}
            className="px-4 py-2 text-sm bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm active:scale-95"
          >
            {isStudent ? "Browse Courses" : "View Reports"}
          </button>
          {!isStudent && (
            <button 
              onClick={() => router.push('/courses')}
              className="px-4 py-2 text-sm bg-white text-slate-700 font-medium rounded-lg border border-surface-border hover:bg-slate-50 transition-colors shadow-sm active:scale-95"
            >
              Add New Course
            </button>
          )}
        </div>
      </motion.div>

      {/* ── ADMIN VIEW ──────────────────────────────────────────────── */}
      {!isStudent && (
        <>
          <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              title="Students"
              value={students.length}
              icon={<Users size={20} />}
              iconColorClass="text-blue-600"
              iconBgClass="bg-blue-50"
              delay={0.1}
            />
            <StatCard
              title="Courses"
              value={courses.length}
              icon={<BookOpen size={20} />}
              iconColorClass="text-indigo-600"
              iconBgClass="bg-indigo-50"
              delay={0.2}
            />
            <StatCard
              title="Enrollments"
              value={enrollments.length}
              icon={<ClipboardList size={20} />}
              iconColorClass="text-emerald-600"
              iconBgClass="bg-emerald-50"
              delay={0.3}
            />
            <StatCard
              title="Revenue"
              value={totalRevenue}
              icon={<IndianRupee size={20} />}
              prefix="₹"
              iconColorClass="text-amber-600"
              iconBgClass="bg-amber-50"
              delay={0.4}
            />
            <StatCard
              title="Completion Rate"
              value={completionRate}
              suffix="%"
              icon={<Award size={20} />}
              iconColorClass="text-rose-600"
              iconBgClass="bg-rose-50"
              delay={0.5}
            />
          </motion.div>

          {/* CHARTS ROW 1 */}
          <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <DashboardCard className="xl:col-span-2 flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue Trend</h3>
                <p className="text-sm text-slate-500">Live monthly revenue tracking</p>
              </div>
              <div className="flex-1 min-h-[300px]">
                <RevenueChart data={revenueData} />
              </div>
            </DashboardCard>
            <DashboardCard className="flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Course Popularity</h3>
                <p className="text-sm text-slate-500">Top 5 courses by enrollment</p>
              </div>
              <div className="flex-1 min-h-[300px]">
                <CoursePopularityChart data={popularityData} />
              </div>
            </DashboardCard>
          </motion.div>

          {/* CHARTS ROW 2 */}
          <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <DashboardCard className="flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Enrollment by Category</h3>
                <p className="text-sm text-slate-500">Distribution across topics</p>
              </div>
              <div className="flex-1 min-h-[300px]">
                <EnrollmentDistribution data={distributionData} />
              </div>
            </DashboardCard>
            <DashboardCard className="xl:col-span-2 flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Platform Activity</h3>
                <p className="text-sm text-slate-500">Live platform engagement events</p>
              </div>
              <div className="flex-1 min-h-[300px]">
                <MonthlyActivityChart data={activityData} />
              </div>
            </DashboardCard>
          </motion.div>

          {/* WIDGETS ROW */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DashboardCard className="lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Popular Courses</h3>
              <PopularCoursesWidget courses={courses} enrollments={enrollments} />
            </DashboardCard>
            <div className="space-y-6">
              <DashboardCard>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h3>
                <QuickActions />
              </DashboardCard>
              <DashboardCard>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Upcoming Tasks</h3>
                <UpcomingTasks />
              </DashboardCard>
            </div>
          </motion.div>

          {/* ACTIVITY ROW */}
          <motion.div variants={item}>
            <DashboardCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Live Activity</h3>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-semibold rounded-full border border-emerald-500/20">
                  Real-time
                </span>
              </div>
              <ActivityTimeline activities={activities} maxItems={8} />
            </DashboardCard>
          </motion.div>
        </>
      )}

      {/* ── STUDENT VIEW ────────────────────────────────────────────── */}
      {isStudent && (
        <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <DashboardCard>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">My Courses</h3>
              {/* Fallback to Popular Courses widget for demo */}
              <PopularCoursesWidget courses={courses} enrollments={enrollments} />
            </DashboardCard>
            <DashboardCard>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Recent Activity</h3>
              <ActivityTimeline activities={activities.filter(a => a.type === "enrollment")} maxItems={5} />
            </DashboardCard>
          </div>
          <div className="space-y-6">
            <DashboardCard>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Upcoming Assignments</h3>
              <UpcomingTasks />
            </DashboardCard>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}