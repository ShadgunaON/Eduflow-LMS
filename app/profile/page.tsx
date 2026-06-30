"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { DashboardCard } from "../components/ui/DashboardCard";
import { UserAvatar } from "../components/ui/UserAvatar";
import { Save, User, Mail, Shield, Key, Camera, Loader2 } from "lucide-react";
import { profileUpdateSchema, changePasswordSchema } from "../lib/schemas";
import { z } from "zod";

export default function ProfilePage() {
  const { user, updateUser, getToken } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast("Image size must be less than 5MB", "error");
      return;
    }
    if (!file.type.startsWith("image/")) {
      addToast("Please upload an image file", "error");
      return;
    }

    setIsUploadingImage(true);
    addToast("Uploading profile picture...", "info");

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
        await updateUser({ image: data.image });
        addToast("Profile picture updated", "success");
      } else {
        const errData = await res.json();
        addToast(errData.error || "Failed to upload image", "error");
      }
    } catch (err) {
      console.error("Profile upload fetch error:", err);
      addToast("Error uploading profile picture", "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      profileUpdateSchema.parse({ name });
      setIsSavingProfile(true);
      
      // Attempt to update name in session
      await updateUser({ name });
      
      // In a real app, you would also PUT /api/users/profile
      addToast("Profile updated successfully", "success");
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        addToast((err as any).errors[0].message, "error");
      } else {
        addToast("An error occurred", "error");
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      changePasswordSchema.parse({ currentPassword, newPassword, confirmPassword });
      setIsSavingPassword(true);
      
      // In a real app, this would be a POST /api/users/change-password
      // We will just mock success for now
      await new Promise(r => setTimeout(r, 1000));
      
      addToast("Password changed successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        addToast((err as any).errors[0].message, "error");
      } else {
        addToast("An error occurred", "error");
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">My Profile</h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">
          Manage your account settings and personal information.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - User Info summary */}
        <div className="space-y-6">
          <DashboardCard className="p-8 flex flex-col items-center text-center bg-surface border border-surface-border shadow-card">
            <div 
              className="relative mb-6 cursor-pointer group rounded-full overflow-hidden"
              onClick={() => !isUploadingImage && fileInputRef.current?.click()}
            >
              <UserAvatar name={user.name} src={user.image} size="lg" className="w-32 h-32 text-4xl shadow-xl ring-4 ring-primary/10 group-hover:opacity-75 transition-opacity" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploadingImage ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">{user.name}</h2>
            <p className="text-slate-500 font-medium text-sm mb-4">{user.email}</p>
            
            <div className="px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm border border-primary/20 uppercase tracking-widest">
              {user.role}
            </div>
          </DashboardCard>
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          <DashboardCard className="p-6 sm:p-8 bg-surface border border-surface-border shadow-card">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-border">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <User size={20} />
              </div>
              <h3 className="text-xl font-bold text-foreground">Personal Information</h3>
            </div>
            
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-muted border border-surface-border text-foreground rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="email" 
                      value={user.email}
                      disabled
                      className="w-full pl-11 pr-4 py-3 bg-surface-muted/50 border border-surface-border text-slate-500 cursor-not-allowed rounded-xl font-medium"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Email cannot be changed.</p>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button 
                  type="submit"
                  disabled={isSavingProfile || name === user.name}
                  className="px-6 py-3 bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <Save size={18} />
                  {isSavingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </DashboardCard>

          <DashboardCard className="p-6 sm:p-8 bg-surface border border-surface-border shadow-card">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-border">
              <div className="p-2 bg-warning/10 text-warning rounded-lg">
                <Shield size={20} />
              </div>
              <h3 className="text-xl font-bold text-foreground">Security Settings</h3>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-bold text-slate-500">Current Password</label>
                <div className="relative">
                  <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-11 pr-4 py-3 bg-surface-muted border border-surface-border text-foreground rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-4 py-3 bg-surface-muted border border-surface-border text-foreground rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">Confirm Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retype new password"
                    className="w-full px-4 py-3 bg-surface-muted border border-surface-border text-foreground rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button 
                  type="submit"
                  disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="px-6 py-3 bg-foreground hover:bg-slate-800 dark:hover:bg-slate-200 disabled:bg-surface-muted disabled:text-slate-400 disabled:cursor-not-allowed text-background font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  {isSavingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </DashboardCard>

        </div>
      </div>
    </div>
  );
}
