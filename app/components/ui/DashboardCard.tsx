import React from "react";
import { cn } from "../../lib/utils";

interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function DashboardCard({ children, className, noPadding = false, ...props }: DashboardCardProps) {
  return (
    <div
      className={cn(
        "bg-surface dark:bg-surface border border-surface-border rounded-2xl shadow-card dark:shadow-card-dark transition-all duration-300",
        !noPadding && "p-4 sm:p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
