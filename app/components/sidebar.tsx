"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  FileText,
  HelpCircle
} from "lucide-react";

import { ROLES, AppRole, hasRole } from "../../lib/rbac";
import { UserAvatar } from "./ui/UserAvatar";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: AppRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard, roles: [ROLES.ADMIN, ROLES.INSTRUCTOR, ROLES.STUDENT, ROLES.TUTOR] },
  { href: "/students",   label: "Students",   icon: Users,           roles: [ROLES.ADMIN, ROLES.INSTRUCTOR, ROLES.TUTOR] },
  { href: "/courses",    label: "Courses",    icon: BookOpen,        roles: [ROLES.ADMIN, ROLES.INSTRUCTOR, ROLES.STUDENT, ROLES.TUTOR] },
  { href: "/enrollment", label: "Enrollments",icon: ClipboardList,   roles: [ROLES.ADMIN, ROLES.INSTRUCTOR, ROLES.STUDENT, ROLES.TUTOR] },
  { href: "/assignments",label: "Assignments",icon: FileText,        roles: [ROLES.ADMIN, ROLES.INSTRUCTOR, ROLES.STUDENT, ROLES.TUTOR] },
  { href: "/quizzes",    label: "Quizzes",    icon: HelpCircle,      roles: [ROLES.ADMIN, ROLES.INSTRUCTOR, ROLES.STUDENT, ROLES.TUTOR] },
  { href: "/settings",   label: "Settings",   icon: Settings,        roles: [ROLES.ADMIN, ROLES.INSTRUCTOR, ROLES.STUDENT, ROLES.TUTOR] },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const { settings } = useSettings();
  const { user, loading, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved) setIsCollapsed(saved === "true");
    setMounted(true);
  }, []);

  // Save collapsed state
  useEffect(() => {
    if (mounted) localStorage.setItem("sidebar_collapsed", String(isCollapsed));
  }, [isCollapsed, mounted]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (window.innerWidth < 1024) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const userRole = user?.role as AppRole | undefined;
  // If no userRole is provided yet (e.g. initial load), default to empty or rely on hasRole handling undefined safely.
  const filteredNavItems = NAV_ITEMS.filter((item) => hasRole(userRole || ROLES.STUDENT, item.roles));

  // Prevent incorrect role rendering before session is loaded
  const displayNavItems = loading ? [] : filteredNavItems;

  return (
    <>
      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 min-h-screen bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800/60 flex-shrink-0 transition-all duration-300 shadow-2xl lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-[80px]" : "w-[260px]"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/60 flex-shrink-0">
          <div className={cn("flex items-center gap-3 overflow-hidden", isCollapsed ? "justify-center w-full" : "")}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-primary/20">
              <GraduationCap size={20} />
            </div>
            {!isCollapsed && mounted && (
              <div className="whitespace-nowrap">
                <h1 className="text-sm font-bold text-white tracking-tight">
                  {settings.lmsName}
                </h1>
                <p className="text-[10px] font-medium text-primary-light uppercase tracking-wider">
                  Workspace
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle Button (Desktop Only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title="Toggle Sidebar"
          aria-label="Toggle Sidebar"
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-50 shadow-sm"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-6 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden no-scrollbar">
          {displayNavItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group outline-none overflow-hidden",
                  isActive ? "text-white" : "text-slate-400 hover:text-slate-100",
                  isCollapsed ? "justify-center" : "justify-start"
                )}
                title={isCollapsed ? label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-primary/20 rounded-xl border border-primary/30"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className={cn("relative z-10 flex items-center gap-3 flex-shrink-0", isCollapsed ? "" : "w-full")}>
                  <Icon
                    size={18}
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      isActive ? "text-primary-light" : "group-hover:text-slate-300"
                    )}
                  />
                  {!isCollapsed && mounted && (
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                      {label}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800/60 flex-shrink-0">
          <div className={cn("flex items-center gap-3 overflow-hidden", isCollapsed ? "justify-center" : "")}>
            {user ? (
              <UserAvatar
                name={user.name}
                src={user.image}
                size="sm"
                className="w-9 h-9 border border-slate-700/50 bg-slate-800 text-white font-bold"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">U</span>
              </div>
            )}
            
            {!isCollapsed && mounted && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.name || "User"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate">
                    {userRole}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => logout()}
            className={cn(
              "mt-4 flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-rose-400 transition-colors w-full rounded-lg py-2 overflow-hidden flex-shrink-0",
              isCollapsed ? "justify-center px-0 hover:bg-slate-800/50" : "px-3 hover:bg-rose-500/10"
            )}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!isCollapsed && mounted && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
}