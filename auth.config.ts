import type { NextAuthConfig } from "next-auth";
import { ROUTE_PERMISSIONS, hasRole } from "./lib/rbac";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
      const isAuthPage = nextUrl.pathname.startsWith("/auth");
      
      // Allow API auth routes and Auth UI routes (verify, new-password)
      if (isApiAuth || isAuthPage) {
        return true;
      }

      // Allow login page access if not logged in
      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      // Require login for all other routes
      if (!isLoggedIn) {
        return false; // Redirects to signIn page
      }

      // Role-based authorization using RBAC constants
      // Default to "STUDENT" if role is missing (e.g. from an old session cookie)
      const role = (auth?.user as any)?.role || "STUDENT";
      
      // Check ROUTE_PERMISSIONS
      for (const [route, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
        if (nextUrl.pathname.startsWith(route)) {
          if (!hasRole(role, allowedRoles)) {
            // Return false to let NextAuth redirect unauthorized users safely to /login
            return false;
          }
        }
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        // KEEP IT UPPERCASE to match database ENUM
        token.role = (user as any).role || "STUDENT";
        token.id = user.id;
        token.name = user.name;
        token.picture = user.image;
      }
      if (trigger === "update" && session) {
        if (session.name !== undefined) token.name = session.name;
        if (session.image !== undefined) token.picture = session.image;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role as string;
        (session.user as any).id = (token.id as string) || (token.sub as string);
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  providers: [], // Providers added in auth.ts
} satisfies NextAuthConfig;
