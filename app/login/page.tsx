"use client";

import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Eye, 
  EyeOff, 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight,
  Mail,
  Lock,
  User
} from "lucide-react";
import { cn } from "../lib/utils";

type AuthMode = "login" | "register" | "forgot" | "verify";

export default function PremiumAuthPage() {
  const router = useRouter();
  
  // State
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  // Password Strength Logic
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 7) score += 1;
    if (pass.match(/[A-Z]/)) score += 1;
    if (pass.match(/[0-9]/)) score += 1;
    if (pass.match(/[^A-Za-z0-9]/)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength(password);
  
  const getStrengthColor = (score: number) => {
    if (score === 0) return "bg-slate-200 dark:bg-slate-700";
    if (score <= 1) return "bg-rose-500";
    if (score <= 2) return "bg-amber-500";
    if (score <= 3) return "bg-emerald-400";
    return "bg-emerald-500";
  };

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (mode === "login") {
        await login({ email, password });
      } else if (mode === "register") {
        const { signUp } = await import("aws-amplify/auth");
        await signUp({
          username: email,
          password,
          options: {
            userAttributes: {
              email,
              name,
              "custom:role": "STUDENT",
            }
          }
        });
        setMode("verify");
        setSuccessMsg("Registration successful! Please check your email for the verification code.");
      } else if (mode === "verify") {
        const { confirmSignUp } = await import("aws-amplify/auth");
        await confirmSignUp({
          username: email,
          confirmationCode: verificationCode,
        });
        setMode("login");
        setSuccessMsg("Email verified successfully! You can now log in.");
      } else {
        const { resetPassword } = await import("aws-amplify/auth");
        await resetPassword({ username: email });
        setMode("login");
        setSuccessMsg("Password reset link sent! Check your email.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    "Enterprise-grade Security",
    "Real-time Analytics",
    "Interactive Learning Paths",
    "Role-based Access Control"
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground selection:bg-primary/30">
      
      {/* ── LEFT SPLIT: BRANDING & FEATURES (Hidden on Mobile) ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden bg-slate-950">
        {/* Background Gradients & Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-slate-900/40 to-slate-950 z-0" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 z-0" />
        
        <motion.div 
          className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary/30 blur-[120px] mix-blend-screen"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-hover/30 blur-[100px] mix-blend-screen"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/25">
              <GraduationCap size={24} />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">EduFlow</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight mb-6">
              The Next Generation<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary">
                Learning Platform
              </span>
            </h1>
            <p className="text-lg text-slate-300 max-w-md leading-relaxed mb-10">
              Manage courses, engage students, and drive growth with our powerful, intuitive ecosystem designed for modern education.
            </p>

            <div className="space-y-4">
              {features.map((feature, i) => (
                <motion.div 
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="flex items-center gap-3 text-slate-300"
                >
                  <CheckCircle2 size={20} className="text-primary-light" />
                  <span className="font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} EduFlow Technologies Inc.
        </div>
      </div>

      {/* ── RIGHT SPLIT: INTERACTIVE FORM ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-background">
        <div className="w-full max-w-[440px]">
          
          {/* Mobile Logo Header */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/25">
              <GraduationCap size={24} />
            </div>
            <span className="text-2xl font-bold text-foreground tracking-tight">EduFlow</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-2">
                  {mode === "login" && "Welcome back"}
                  {mode === "register" && "Create an account"}
                  {mode === "forgot" && "Reset password"}
                  {mode === "verify" && "Verify Email"}
                </h2>
                <p className="text-slate-500">
                  {mode === "login" && "Enter your credentials to access your workspace."}
                  {mode === "register" && "Join thousands of educators and students today."}
                  {mode === "forgot" && "Enter your email and we'll send you a reset link."}
                  {mode === "verify" && "Enter the 6-digit code sent to your email."}
                </p>
              </div>

              {/* Social Logins */}
              {(mode !== "forgot" && mode !== "verify") && (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface border border-surface-border rounded-xl text-sm font-semibold hover:bg-surface-muted transition-colors shadow-sm">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google
                    </button>
                    <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface border border-surface-border rounded-xl text-sm font-semibold hover:bg-surface-muted transition-colors shadow-sm text-foreground">
                      <svg className="w-5 h-5 text-current" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                      GitHub
                    </button>
                  </div>

                  <div className="relative flex items-center mb-8">
                    <div className="flex-grow border-t border-surface-border"></div>
                    <span className="flex-shrink-0 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Or continue with
                    </span>
                    <div className="flex-grow border-t border-surface-border"></div>
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 bg-danger-light/50 border border-danger-light rounded-xl text-sm font-medium text-danger-foreground"
                  >
                    {error}
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-sm font-medium text-emerald-600 dark:text-emerald-400"
                  >
                    {successMsg}
                  </motion.div>
                )}

                {mode === "register" && (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-foreground">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-surface-muted border border-surface-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-foreground placeholder:text-slate-400"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                {mode !== "verify" && (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-foreground">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-surface-muted border border-surface-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-foreground placeholder:text-slate-400"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                )}

                {(mode !== "forgot" && mode !== "verify") && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-foreground">Password</label>
                      {mode === "login" && (
                        <button 
                          type="button" 
                          onClick={() => { setMode("forgot"); setError(""); }}
                          className="text-xs font-bold text-primary hover:text-primary-hover"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-surface-muted border border-surface-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-foreground tracking-wide placeholder:text-slate-400"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Password Strength Meter (Register Mode Only) */}
                    {mode === "register" && password.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
                        <div className="flex gap-1.5 mt-2">
                          {[1, 2, 3, 4].map((level) => (
                            <div 
                              key={level} 
                              className={cn(
                                "h-1.5 w-full rounded-full transition-colors duration-300",
                                strengthScore >= level ? getStrengthColor(strengthScore) : "bg-surface-border"
                              )} 
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5 flex justify-between font-medium">
                          <span>{
                            strengthScore <= 1 ? "Weak" :
                            strengthScore <= 2 ? "Fair" :
                            strengthScore <= 3 ? "Good" : "Strong"
                          }</span>
                          {strengthScore < 4 && <span>Include uppercase, numbers, and symbols</span>}
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}

                {mode === "verify" && (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-foreground">Verification Code</label>
                    <div className="relative">
                      <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        required
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-surface-muted border border-surface-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-foreground tracking-[0.5em] text-center font-mono placeholder:text-slate-400 placeholder:tracking-normal"
                        placeholder="123456"
                        maxLength={6}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || (mode === "register" && strengthScore < 2)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mt-6 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-all disabled:opacity-50 shadow-md active:scale-[0.98]"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === "login" && "Sign In"}
                      {mode === "register" && "Create Account"}
                      {mode === "forgot" && "Send Reset Link"}
                      {mode === "verify" && "Verify Code"}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer Links */}
              <div className="mt-8 text-center text-sm text-slate-500 font-medium">
                {mode === "login" && (
                  <p>
                    Don't have an account?{" "}
                    <button onClick={() => { setMode("register"); setError(""); }} className="font-bold text-primary hover:underline">
                      Sign up
                    </button>
                  </p>
                )}
                {mode === "register" && (
                  <p>
                    Already have an account?{" "}
                    <button onClick={() => { setMode("login"); setError(""); }} className="font-bold text-primary hover:underline">
                      Log in
                    </button>
                  </p>
                )}
                {mode === "forgot" && (
                  <button onClick={() => { setMode("login"); setError(""); }} className="font-bold text-primary hover:underline">
                    Back to login
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
