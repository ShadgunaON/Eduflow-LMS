"use client";

import { useState, useEffect, useRef } from "react";
import { useSettings } from "../context/SettingsContext";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ProfileService } from "../lib/api";
import { DashboardCard } from "../components/ui/DashboardCard";
import { UserAvatar } from "../components/ui/UserAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database, 
  Moon, 
  Sun, 
  Save, 
  LogIn, 
  Camera, 
  Key, 
  Loader2,
  Mail,
  ShieldAlert
} from "lucide-react";

type Tab = "profile" | "appearance" | "security" | "data";

export default function SettingsPage() {
  const { user, updateUser, login, getToken } = useAuth();
  const { settings, updateSettings, resetSettings } = useSettings();
  const { resetAll } = useApp();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile data from database
  const [profileData, setProfileData] = useState<{
    name: string;
    email: string;
    role: string;
    image: string;
  } | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Profile picture upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await ProfileService.getProfile();
        if (data) {
          setProfileData({
            name: data.name || "",
            email: data.email || "",
            role: data.role || "STUDENT",
            image: data.image || "",
          });
        } else {
          addToast("Failed to load profile details", "error");
        }
      } catch (err) {
        console.error(err);
        addToast("Error fetching profile", "error");
      } finally {
        setIsFetchingProfile(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileData) return;

    if (!profileData.name.trim() || profileData.name.length < 2) {
      addToast("Display Name must be at least 2 characters", "error");
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await ProfileService.updateProfile({ name: profileData.name });
      setProfileData((prev) => prev ? { ...prev, name: updated.name } : null);
      // Update local session context state
      await updateUser({ name: updated.name });
      addToast("Profile updated successfully", "success");
    } catch (err: any) {
      addToast(err.message || "Error saving profile changes", "error");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size limit check
    if (file.size > 5 * 1024 * 1024) {
      addToast("Image size must be less than 5MB", "error");
      return;
    }
    // File type check
    if (!file.type.startsWith("image/")) {
      addToast("Please upload an image file", "error");
      return;
    }

    setIsUploading(true);
    addToast("Uploading image...", "info");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = await getToken();

      const res = await fetch("/api/profile/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProfileData((prev) => prev ? { ...prev, image: data.imageUrl } : null);
        // Update local session context state
        await updateUser({ image: data.imageUrl });
        addToast("Profile picture updated", "success");
      } else {
        const errData = await res.json();
        addToast(errData.error || "Failed to upload image", "error");
      }
    } catch (err) {
      console.error("Upload fetch error:", err);
      addToast("Error uploading profile image", "error");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (passwordForm.newPassword.length < 6) {
      addToast("New password must be at least 6 characters", "error");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast("Passwords do not match", "error");
      return;
    }

    setIsSavingPassword(true);
    try {
      await ProfileService.updateProfile({
        type: "password",
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      addToast("Password changed successfully", "success");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      addToast(err.message || "Error changing password", "error");
    } finally {
      setIsSavingPassword(false);
    }
  }

  function handleResetData() {
    resetAll();
    addToast("All data reset to defaults", "info");
  }

  async function handleSwitchUser(email: string) {
    addToast("Switching account...", "info");
    const password = email === "admin@eduflow.com" ? "admin123" : email === "tutor@eduflow.com" ? "tutor123" : "student123";
    try {
      await login({ email, password });
      window.location.href = "/settings";
    } catch (err: any) {
      addToast("Failed to switch account: " + err.message, "error");
    }
  }

  function handleResetSettings() {
    resetSettings();
    addToast("Settings reset to defaults", "info");
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security & Passwords", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "data", label: "Data Management", icon: Database },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Manage your account profile, settings, and password options.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 hide-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-slate-500 hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-primary" : ""} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  {isFetchingProfile ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-surface border border-surface-border rounded-2xl shadow-card">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <p className="text-sm text-slate-500 mt-4 font-medium">Loading profile information...</p>
                    </div>
                  ) : profileData ? (
                    <div className="space-y-6">
                      <DashboardCard className="shadow-card border-surface-border bg-surface">
                        <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-6">Personal Profile</h2>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-surface-border">
                          {/* Avatar upload wrapper */}
                          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <UserAvatar
                              name={profileData.name}
                              src={profileData.image}
                              size="xl"
                              className="border-2 border-primary/20"
                            />
                            {/* Upload Hover Overlay */}
                            <div className="absolute inset-0 bg-slate-950/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {isUploading ? (
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                              ) : (
                                <>
                                  <Camera size={18} />
                                  <span className="text-[10px] mt-1 font-bold tracking-wider">CHANGE</span>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageChange}
                              accept="image/*"
                              className="hidden"
                              disabled={isUploading}
                            />
                          </div>

                          <div className="text-center sm:text-left flex-1">
                            <h3 className="text-xl font-extrabold text-foreground">{profileData.name}</h3>
                            <p className="text-sm font-medium text-slate-500 mt-0.5">{profileData.email}</p>
                            <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider shadow-sm">
                                {profileData.role}
                              </span>
                            </div>
                          </div>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-5 mt-6 max-w-xl">
                          <div>
                            <label className="block text-sm font-bold text-foreground mb-1.5">
                              Display Name
                            </label>
                            <input
                              type="text"
                              value={profileData.name}
                              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                              className="w-full bg-surface-muted border border-surface-border rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all text-foreground font-medium"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1.5">
                              Email Address
                            </label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                              <input
                                type="email"
                                value={profileData.email}
                                disabled
                                className="w-full bg-surface-muted border border-transparent rounded-xl pl-11 pr-4 py-3 text-sm text-slate-400 cursor-not-allowed outline-none font-medium"
                              />
                            </div>
                            <p className="text-[11px] font-semibold text-slate-400 mt-1.5">Email addresses are tied to sign-in credentials and cannot be edited.</p>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1.5">
                              User Role
                            </label>
                            <input
                              type="text"
                              value={profileData.role}
                              disabled
                              className="w-full bg-surface-muted border border-transparent rounded-xl px-4 py-3 text-sm text-slate-400 cursor-not-allowed outline-none font-medium"
                            />
                            <p className="text-[11px] font-semibold text-slate-400 mt-1.5">Roles are managed by LMS administrators and determine navigation access.</p>
                          </div>

                          <div className="pt-4">
                            <button
                              type="submit"
                              disabled={isSavingProfile}
                              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-md active:scale-95"
                            >
                              {isSavingProfile ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save size={16} />
                              )}
                              Save Profile Changes
                            </button>
                          </div>
                        </form>
                      </DashboardCard>

                      <DashboardCard className="shadow-card border-surface-border bg-surface">
                        <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-6">Test Accounts</h2>
                        <p className="text-sm font-medium text-slate-500 mb-6">Switch between roles for authorization check (RBAC).</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                          <div 
                            onClick={() => handleSwitchUser("admin@eduflow.com")}
                            className="p-5 bg-surface-muted border border-surface-border rounded-xl cursor-pointer hover:border-primary transition-all group flex justify-between items-center shadow-sm"
                          >
                            <div>
                              <h3 className="font-extrabold text-foreground">Admin Account</h3>
                              <p className="text-xs font-semibold text-slate-500 mt-2">Email: <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-foreground">admin@eduflow.com</span></p>
                              <p className="text-xs font-semibold text-slate-500 mt-1">Password: <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-foreground">admin123</span></p>
                            </div>
                            <button className="p-3 bg-primary/10 text-primary rounded-xl opacity-0 group-hover:opacity-100 transition-all group-hover:scale-105">
                              <LogIn size={18} />
                            </button>
                          </div>
                          
                          <div 
                            onClick={() => handleSwitchUser("siddhi@example.com")}
                            className="p-5 bg-surface-muted border border-surface-border rounded-xl cursor-pointer hover:border-primary transition-all group flex justify-between items-center shadow-sm"
                          >
                            <div>
                              <h3 className="font-extrabold text-foreground">Student Account</h3>
                              <p className="text-xs font-semibold text-slate-500 mt-2">Email: <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-foreground">siddhi@example.com</span></p>
                              <p className="text-xs font-semibold text-slate-500 mt-1">Password: <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-foreground">student123</span></p>
                            </div>
                            <button className="p-3 bg-primary/10 text-primary rounded-xl opacity-0 group-hover:opacity-100 transition-all group-hover:scale-105">
                              <LogIn size={18} />
                            </button>
                          </div>
                          
                          <div 
                            onClick={() => handleSwitchUser("tutor@eduflow.com")}
                            className="p-5 bg-surface-muted border border-surface-border rounded-xl cursor-pointer hover:border-primary transition-all group flex justify-between items-center shadow-sm"
                          >
                            <div>
                              <h3 className="font-extrabold text-foreground">Tutor Account</h3>
                              <p className="text-xs font-semibold text-slate-500 mt-2">Email: <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-foreground">tutor@eduflow.com</span></p>
                              <p className="text-xs font-semibold text-slate-500 mt-1">Password: <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-foreground">tutor123</span></p>
                            </div>
                            <button className="p-3 bg-primary/10 text-primary rounded-xl opacity-0 group-hover:opacity-100 transition-all group-hover:scale-105">
                              <LogIn size={18} />
                            </button>
                          </div>
                        </div>
                      </DashboardCard>
                    </div>
                  ) : (
                    <div className="p-10 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl flex items-start gap-4">
                      <ShieldAlert className="text-rose-500 shrink-0" size={24} />
                      <div>
                        <h3 className="font-bold text-rose-900 dark:text-rose-400 text-sm">Profile Load Error</h3>
                        <p className="text-sm text-rose-800/80 dark:text-rose-400/80 mt-1">
                          We could not authenticate or fetch your profile information. Please log out and sign back in.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <DashboardCard className="shadow-card border-surface-border bg-surface">
                    <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-6">Change Security Credentials</h2>
                    
                    <form onSubmit={handleChangePassword} className="space-y-5 max-w-xl">
                      <div>
                        <label className="block text-sm font-bold text-foreground mb-1.5">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          className="w-full bg-surface-muted border border-surface-border rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all text-foreground font-medium"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-foreground mb-1.5">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="w-full bg-surface-muted border border-surface-border rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all text-foreground font-medium"
                          required
                          minLength={6}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-foreground mb-1.5">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          className="w-full bg-surface-muted border border-surface-border rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all text-foreground font-medium"
                          required
                          minLength={6}
                        />
                      </div>

                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={isSavingPassword}
                          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-md active:scale-95"
                        >
                          {isSavingPassword ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Key size={16} />
                          )}
                          Update Password
                        </button>
                      </div>
                    </form>
                  </DashboardCard>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <DashboardCard className="shadow-card border-surface-border bg-surface">
                    <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-6">Theme Preferences</h2>
                    <div className="space-y-6 max-w-xl">
                      <div className="flex items-center justify-between p-5 bg-surface-muted rounded-2xl border border-surface-border shadow-sm">
                        <div>
                          <p className="text-sm font-bold text-foreground">Dark Mode</p>
                          <p className="text-xs font-semibold text-slate-500 mt-1">Toggle dark theme across the application.</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
                          className={`relative w-14 h-7 rounded-full transition-colors duration-300 shadow-inner ${
                            settings.theme === "dark" ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 flex items-center justify-center ${
                              settings.theme === "dark" ? "translate-x-8" : "translate-x-1"
                            }`}
                          >
                            {settings.theme === "dark" ? <Moon size={12} className="text-primary" /> : <Sun size={12} className="text-slate-400" />}
                          </span>
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-foreground mb-1.5">LMS Platform Name</label>
                        <input
                          type="text"
                          value={settings.lmsName}
                          onChange={(e) => updateSettings({ lmsName: e.target.value })}
                          className="w-full bg-surface-muted border border-surface-border rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all text-foreground font-medium"
                        />
                        <p className="text-xs font-semibold text-slate-500 mt-2">This name appears in the sidebar and navigation.</p>
                      </div>
                    </div>
                  </DashboardCard>
                </div>
              )}

              {/* Data Tab */}
              {activeTab === "data" && (
                <div className="space-y-6">
                  <DashboardCard className="shadow-card border-surface-border bg-surface">
                    <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-6">Data Management</h2>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-surface-muted rounded-2xl border border-surface-border gap-4 shadow-sm">
                        <div>
                          <p className="text-sm font-extrabold text-foreground">Reset Settings</p>
                          <p className="text-xs font-semibold text-slate-500 mt-1">Restore appearance and profile defaults.</p>
                        </div>
                        <button onClick={handleResetSettings} className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-foreground rounded-xl text-sm font-bold transition-all shrink-0 active:scale-95">
                          Reset Settings
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-danger/10 rounded-2xl border border-danger/20 gap-4 shadow-sm">
                        <div>
                          <p className="text-sm font-extrabold text-danger">Reset Application Data</p>
                          <p className="text-xs font-semibold text-danger/80 mt-1">Clear all students, courses, and enrollments.</p>
                        </div>
                        <button onClick={handleResetData} className="px-5 py-2.5 bg-danger hover:bg-danger/90 text-white rounded-xl text-sm font-bold transition-all shrink-0 shadow-sm active:scale-95">
                          Reset All Data
                        </button>
                      </div>
                    </div>
                  </DashboardCard>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
