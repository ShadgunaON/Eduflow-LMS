"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, getCurrentUser, fetchAuthSession, AuthUser } from "aws-amplify/auth";
import { Amplify } from "aws-amplify";

// Configure Amplify Auth manually since we deleted NextAuth
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "us-east-1_hhb2NN8Nw",
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "5veprdb5kg4nq3r4cc82qf5u3s",
      loginWith: {
        email: true,
      },
    },
  },
});

interface User {
  name: string;
  email: string;
  role: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: { name?: string; image?: string }) => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        const session = await fetchAuthSession();
        const payload = session.tokens?.idToken?.payload;
        const role = (payload?.["custom:role"] as string) || "STUDENT";
        const name = (payload?.name as string) || "User";
        
        setUser({
          email: currentUser.signInDetails?.loginId || "",
          name: name,
          role: role.toUpperCase(),
        });
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  async function login(data: Record<string, unknown>) {
    setLoading(true);
    try {
      const { isSignedIn } = await signIn({
        username: data.email as string,
        password: data.password as string,
      });
      if (isSignedIn) {
        const currentUser = await getCurrentUser();
        const session = await fetchAuthSession();
        const payload = session.tokens?.idToken?.payload;
        const role = (payload?.["custom:role"] as string) || "STUDENT";
        const name = (payload?.name as string) || "User";
        
        setUser({
          email: currentUser.signInDetails?.loginId || data.email as string,
          name: name,
          role: role.toUpperCase(),
        });
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("Login failed", err);
      throw new Error(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await signOut();
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(data: { name?: string; image?: string }) {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  }

  async function getToken() {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      console.error("Failed to get token:", error);
      return null;
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
