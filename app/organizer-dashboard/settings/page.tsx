"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { FormInput } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { Save, User, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";

function PasswordChangeForm() {
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [isChanging, setIsChanging] = useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        setIsChanging(true);

        try {
            const { useAuthStore } = await import("@/lib/store/auth.store");
            const { token } = useAuthStore.getState();
            
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch("/api/users/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to change password");
            }

            toast.success("Password changed successfully!");
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        } catch (error: any) {
            toast.error(error.message || "Failed to change password");
        } finally {
            setIsChanging(false);
        }
    };

    return (
        <form onSubmit={handlePasswordChange} className="space-y-4">
            <FormInput
                label="Current Password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
            />
            <FormInput
                label="New Password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
            />
            <FormInput
                label="Confirm New Password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
            />
            <Button type="submit" disabled={isChanging}>
                <Lock className="w-4 h-4 mr-2" />
                {isChanging ? "Changing..." : "Change Password"}
            </Button>
        </form>
    );
}

export default function SettingsPage() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const { useAuthStore } = await import("@/lib/store/auth.store");
            const { token } = useAuthStore.getState();
            
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch("/api/users/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: formData.name }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to update profile");
            }

            toast.success("Settings saved successfully!");
            // Refresh user data
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message || "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-2">Manage your account settings</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Profile Settings */}
                <div className="p-6 border rounded-md bg-card">
                    <div className="flex items-center gap-3 mb-6">
                        <User className="w-5 h-5" />
                        <h2 className="text-xl font-semibold">Profile Information</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormInput
                            label="Full Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />

                        <FormInput
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            disabled
                        />

                        <Button type="submit" disabled={isSaving}>
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </form>
                </div>

                {/* Security Settings */}
                <div className="p-6 border rounded-md bg-card">
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="w-5 h-5" />
                        <h2 className="text-xl font-semibold">Security</h2>
                    </div>

                    <PasswordChangeForm />
                </div>
            </div>
        </div>
    );
}

