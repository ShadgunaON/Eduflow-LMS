"use client";

import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedStatsCard
//
// A premium stat card with:
//  • Count-up animation on mount
//  • Gradient icon background
//  • Subtle trend indicator
//  • Glassmorphism styling
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  title: string;
  value: number;
  icon: string;
  prefix?: string;
  suffix?: string;
  trend?: { value: number; label: string };
  gradient: string;        // Tailwind gradient classes e.g. "from-indigo-500 to-purple-600"
  delay?: number;          // stagger animation in ms
};

export default function AnimatedStatsCard({
  title,
  value,
  icon,
  prefix = "",
  suffix = "",
  trend,
  gradient,
  delay = 0,
}: Props) {
  const [displayed, setDisplayed] = useState(0);
  const [visible, setVisible] = useState(false);

  // Count-up animation
  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), delay);

    const duration = 1200; // ms
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const countTimer = setTimeout(() => {
      const interval = setInterval(() => {
        step++;
        current = Math.min(Math.round(increment * step), value);
        setDisplayed(current);
        if (step >= steps) clearInterval(interval);
      }, duration / steps);
    }, delay + 200);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(countTimer);
    };
  }, [value, delay]);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-slate-900/50 backdrop-blur-2xl p-4 sm:p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-2xl shadow-sm dark:shadow-none hover:shadow-indigo-500/10 dark:hover:border-indigo-500/30 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{ minWidth: 220 }}
    >
      {/* Decorative Gradient Background */}
      <div
        className={`absolute -bottom-16 -right-16 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-[0.15] dark:opacity-20 blur-3xl group-hover:scale-125 transition-transform duration-700`}
      />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {prefix}
              {displayed.toLocaleString("en-IN")}
              {suffix}
            </p>
            {trend && (
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-100 dark:border-white/5">
                <span
                  className={`text-xs font-bold ${
                    trend.value >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
              </div>
            )}
          </div>
          {trend && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
              Compared to {trend.label}
            </p>
          )}
        </div>

        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} p-[1px] shadow-lg overflow-hidden group-hover:scale-110 transition-transform duration-500`}
        >
          <div className="w-full h-full bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl text-white">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
