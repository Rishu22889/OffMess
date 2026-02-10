"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

interface CanteenProfile {
  id: number;
  name: string;
  hours_open: string;
  hours_close: string;
  avg_prep_minutes: number;
  upi_id: string;
  max_active_orders: number;
  is_active: boolean;
  accepting_orders: boolean;
}

interface ActiveOrdersStats {
  active_orders: number;
  max_orders: number;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState<CanteenProfile | null>(null);
  const [activeStats, setActiveStats] = useState<ActiveOrdersStats | null>(null);
  const [editData, setEditData] = useState<Partial<CanteenProfile>>({});
  const [userFormData, setUserFormData] = useState({
    name: "",
    phone_number: "",
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const loadProfile = async () => {
    try {
      const [profileData, statsData] = await Promise.all([
        apiFetch<CanteenProfile>("/admin/profile"),
        apiFetch<ActiveOrdersStats>("/admin/stats/active-orders")
      ]);
      setProfile(profileData);
      setActiveStats(statsData);
      setEditData({
        name: profileData.name,
        hours_open: profileData.hours_open,
        hours_close: profileData.hours_close,
        avg_prep_minutes: profileData.avg_prep_minutes,
        upi_id: profileData.upi_id,
        max_active_orders: profileData.max_active_orders,
      });
      setError(null);
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError("Failed to load profile. Please check your authentication.");
    }
  };

  useEffect(() => {
    if (user?.role === "CANTEEN_ADMIN" && user.canteen_id) {
      loadProfile();
      setUserFormData({
        name: user.name || "",
        phone_number: user.phone_number || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!editData) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const updated = await apiFetch<CanteenProfile>("/admin/profile", {
        method: "PUT",
        body: JSON.stringify(editData),
      });
      setProfile(updated);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CanteenProfile, value: string | number) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleUserChange = (field: string, value: string) => {
    setUserFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUserSave = async () => {
    setUserLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const updatedUser = await apiFetch<any>("/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: userFormData.name.trim() || null,
          phone_number: userFormData.phone_number.trim() || null,
        }),
      });
      
      updateUser(updatedUser);
      setSuccess("Personal information updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Failed to update user profile:", err);
      setError(err?.message || "Failed to update personal information. Please try again.");
    } finally {
      setUserLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validate passwords
    if (!passwordData.current_password || !passwordData.new_password) {
      setPasswordError("Please fill in all password fields");
      setPasswordLoading(false);
      return;
    }

    if (passwordData.new_password.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      setPasswordLoading(false);
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError("New passwords do not match");
      setPasswordLoading(false);
      return;
    }

    try {
      await apiFetch("/profile/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      setPasswordSuccess("Password changed successfully!");
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (err: any) {
      console.error("Failed to change password:", err);
      // Show specific error message from backend
      const errorMessage = err?.message || "Failed to change password";
      if (errorMessage.toLowerCase().includes("incorrect") || errorMessage.toLowerCase().includes("current password")) {
        setPasswordError("Current password is incorrect.");
      } else {
        setPasswordError(errorMessage);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  if (user?.role !== "CANTEEN_ADMIN") {
    return (
      <div className="rounded-3xl bg-white dark:bg-neutral-900 p-8 shadow-sm">
        <p className="text-sm text-neutral-500">You do not have access to this page.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-3xl bg-white dark:bg-neutral-900 p-8 shadow-sm">
        <p className="text-sm text-neutral-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {(success || error) && (
        <div className={`rounded-2xl border-2 p-4 ${
          success ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'
        }`}>
          <p className={`text-sm font-medium ${success ? 'text-green-400' : 'text-red-400'}`}>
            {success || error}
          </p>
        </div>
      )}

      {/* Personal Information Section */}
      <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
            <span className="text-2xl">👤</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Personal Information</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Your account details</p>
          </div>
        </div>

        <div className="grid gap-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-800 px-4 py-3 text-sm bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Role
              </label>
              <input
                type="text"
                value={user?.role || ""}
                disabled
                className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-800 px-4 py-3 text-sm bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={userFormData.name}
                onChange={(e) => handleUserChange("name", e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none transition-all"
                suppressHydrationWarning
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={userFormData.phone_number}
                onChange={(e) => handleUserChange("phone_number", e.target.value)}
                placeholder="Enter your phone number"
                className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none transition-all"
                suppressHydrationWarning
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleUserSave}
              disabled={userLoading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-neutral-900 dark:text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
            >
              {userLoading ? "⏳ Updating..." : "💾 Update Personal Info"}
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Change Password</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Update your account password</p>
          </div>
        </div>

        {/* Password-specific Success/Error Messages */}
        {(passwordSuccess || passwordError) && (
          <div className={`rounded-2xl border-2 p-4 mb-6 ${
            passwordSuccess ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'
          }`}>
            <p className={`text-sm font-medium ${passwordSuccess ? 'text-green-400' : 'text-red-400'}`}>
              {passwordSuccess || passwordError}
            </p>
          </div>
        )}

        <div className="grid gap-4 max-w-2xl">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
              placeholder="Enter current password"
              className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 text-sm focus:border-red-400 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                placeholder="Enter new password"
                className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 text-sm focus:border-red-400 focus:outline-none transition-all"
              />
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">At least 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                placeholder="Confirm new password"
                className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 text-sm focus:border-red-400 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handlePasswordChange}
              disabled={passwordLoading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-neutral-900 dark:text-white font-bold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
            >
              {passwordLoading ? "⏳ Changing..." : "🔒 Change Password"}
            </button>
          </div>
        </div>
      </div>

      {/* Canteen Profile Section */}
      <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
            <span className="text-2xl">🍽️</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Canteen Settings</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Configure your canteen details</p>
          </div>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {activeStats && (
            <div className="rounded-2xl border-2 border-blue-700 bg-gradient-to-br from-blue-900/40 to-blue-800/40 p-5">
              <p className="text-sm font-semibold text-blue-300 mb-2">📊 Current Status</p>
              <p className="text-4xl font-black text-neutral-900 dark:text-white mb-1">
                {activeStats.active_orders} / {activeStats.max_orders}
              </p>
              <p className="text-sm text-blue-200 font-medium">Active Orders Right Now</p>
            </div>
          )}
          
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Canteen Name
              </label>
              <input
                type="text"
                value={editData.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 focus:border-orange-400 focus:outline-none transition-all"
                suppressHydrationWarning
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  ⏰ Opening Time
                </label>
                <input
                  type="time"
                  value={editData.hours_open || ""}
                  onChange={(e) => handleChange("hours_open", e.target.value)}
                  className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 focus:border-orange-400 focus:outline-none transition-all"
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  🌙 Closing Time
                </label>
                <input
                  type="time"
                  value={editData.hours_close || ""}
                  onChange={(e) => handleChange("hours_close", e.target.value)}
                  className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 focus:border-orange-400 focus:outline-none transition-all"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                ⏱️ Average Preparation Time (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={editData.avg_prep_minutes || ""}
                onChange={(e) => handleChange("avg_prep_minutes", parseInt(e.target.value))}
                className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 focus:border-orange-400 focus:outline-none transition-all"
                suppressHydrationWarning
              />
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">How long it typically takes to prepare an order</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                💳 UPI ID for Payments
              </label>
              <input
                type="text"
                value={editData.upi_id || ""}
                onChange={(e) => handleChange("upi_id", e.target.value)}
                className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 focus:border-orange-400 focus:outline-none transition-all"
                placeholder="your-upi-id@bank"
                suppressHydrationWarning
              />
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Students will use this UPI ID to pay for orders</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                📦 Maximum Active Orders
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={editData.max_active_orders || ""}
                onChange={(e) => handleChange("max_active_orders", parseInt(e.target.value))}
                className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-3 focus:border-orange-400 focus:outline-none transition-all"
                suppressHydrationWarning
              />
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Maximum number of orders that can be active at the same time
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-neutral-900 dark:text-white font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? "⏳ Saving..." : "💾 Save Canteen Settings"}
            </button>
            <button
              onClick={loadProfile}
              disabled={loading}
              className="px-6 py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-50 dark:bg-neutral-800 transition-all disabled:opacity-60"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </div>

      {/* Logout Section */}
      <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800 border-2 border-red-700 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
            <span className="text-2xl">🚪</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Account Actions</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Logout from your account</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-neutral-900 dark:text-white font-bold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all transform hover:scale-105"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}