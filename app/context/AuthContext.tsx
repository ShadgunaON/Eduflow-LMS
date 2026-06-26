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
        // Since we are decoupling, we will temporarily assign a default role and name.
        // Once the API Gateway is setup, we can fetch the user's DynamoDB profile here.
        setUser({
          email: currentUser.signInDetails?.loginId || "",
          name: "User", // Will fetch from DB later
          role: "Student", // Will fetch from DB later
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
        setUser({
          email: currentUser.signInDetails?.loginId || data.email as string,
          name: "User",
          role: "Student",
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
