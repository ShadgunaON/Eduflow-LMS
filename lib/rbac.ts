/**
 * Centralized Role Definitions
 * Ensures we use identical casing across the app, matching the Prisma enum.
 */
export const ROLES = {
  ADMIN: "ADMIN",
  
  STUDENT: "STUDENT",
  TUTOR: "TUTOR",
} as const;

export type AppRole = typeof ROLES[keyof typeof ROLES];

/**
 * Permission check utility to be used in Server Components, API routes, and Middleware.
 * Returns true if the user's role is in the array of allowed roles.
 */
export function hasRole(userRole: AppRole | string | undefined | null, allowedRoles: AppRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole.toUpperCase() as AppRole);
}

/**
 * Route protection mapping for Middleware.
 * Define which roles can access which route prefixes.
 */
export const ROUTE_PERMISSIONS: Record<string, AppRole[]> = {
  "/dashboard": [ROLES.ADMIN, ROLES.STUDENT, ROLES.TUTOR],
  "/students": [ROLES.ADMIN, ROLES.TUTOR],
  "/courses": [ROLES.ADMIN, ROLES.STUDENT, ROLES.TUTOR], 
  "/enrollment": [ROLES.ADMIN, ROLES.STUDENT, ROLES.TUTOR],
  "/assignments": [ROLES.ADMIN, ROLES.STUDENT, ROLES.TUTOR],
  "/quizzes": [ROLES.ADMIN, ROLES.STUDENT, ROLES.TUTOR],
  "/settings": [ROLES.ADMIN, ROLES.STUDENT, ROLES.TUTOR],
  "/api/students": [ROLES.ADMIN, ROLES.TUTOR],
};
