"use client";

import { useEffect, useState } from "react";
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
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<CanteenProfile | null>(null);
  const [activeStats, setActiveStats] = useState<ActiveOrdersStats | null>(null);
  const [editData, setEditData] = useState<Partial<CanteenProfile>>({});
  const [userFormData, setUserFormData] = useState({
    name: "",
    phone_number: "",
  });
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  if (user?.role !== "CANTEEN_ADMIN") {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm text-neutral-500">You do not have access to this page.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm text-neutral-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {(success || error) && (
        <div className={`rounded-2xl border-2 p-4 ${
          success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-sm font-medium ${success ? 'text-green-800' : 'text-red-800'}`}>
            {success || error}
          </p>
        </div>
      )}

      {/* Personal Information Section */}
      <div className="rounded-3xl bg-gradient-to-br from-white to-gray-50 border-2 border-neutral-200 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
            <span className="text-2xl">👤</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Personal Information</h2>
            <p className="text-sm text-neutral-600">Your account details</p>
          </div>
        </div>

        <div className="grid gap-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full rounded-xl border-2 border-neutral-200 px-4 py-3 text-sm bg-gray-50 text-neutral-600"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role
              </label>
              <input
                type="text"
                value={user?.role || ""}
                disabled
                className="w-full rounded-xl border-2 border-neutral-200 px-4 py-3 text-sm bg-gray-50 text-neutral-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={userFormData.name}
                onChange={(e) => handleUserChange("name", e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl border-2 border-neutral-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none transition-all"
                suppressHydrationWarning
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={userFormData.phone_number}
                onChange={(e) => handleUserChange("phone_number", e.target.value)}
                placeholder="Enter your phone number"
                className="w-full rounded-xl border-2 border-neutral-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none transition-all"
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

      {/* Canteen Profile Section */}
      <div className="rounded-3xl bg-gradient-to-br from-white to-gray-50 border-2 border-neutral-200 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
            <span className="text-2xl">🍽️</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Canteen Settings</h2>
            <p className="text-sm text-neutral-600">Configure your canteen details</p>
          </div>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {activeStats && (
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-5">
              <p className="text-sm font-semibold text-blue-800 mb-2">📊 Current Status</p>
              <p className="text-4xl font-black text-blue-900 mb-1">
                {activeStats.active_orders} / {activeStats.max_orders}
              </p>
              <p className="text-sm text-blue-700 font-medium">Active Orders Right Now</p>
            </div>
          )}
          
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Canteen Name
              </label>
              <input
                type="text"
                value={editData.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full rounded-xl border-2 border-neutral-200 px-4 py-3 focus:border-orange-400 focus:outline-none transition-all"
                suppressHydrationWarning
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ⏰ Opening Time
                </label>
                <input
                  type="time"
                  value={editData.hours_open || ""}
                  onChange={(e) => handleChange("hours_open", e.target.value)}
                  className="w-full rounded-xl border-2 border-neutral-200 px-4 py-3 focus:border-orange-400 focus:outline-none transition-all"
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🌙 Closing Time
                </label>
                <input
                  type="time"
                  value={editData.hours_close || ""}
                  onChange={(e) => handleChange("hours_close", e.target.value)}
                  className="w-full rounded-xl border-2 border-neutral-200 px-4 py-3 focus:border-orange-400 focus:outline-none transition-all"
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ⏱️ Average Preparation Time (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={editData.avg_prep_minutes || ""}
                onChange={(e) => handleChange("avg_prep_minutes", parseInt(e.target.value))}
                className="w-full rounded-xl border-2 border-neutral-200 px-4 py-3 focus:border-orange-400 focus:outline-none transition-all"
                suppressHydrationWarning
              />
              <p className="text-xs text-neutral-600 mt-1">How long it typically takes to prepare an order</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                💳 UPI ID for Payments
              </label>
              <input
                type="text"
                value={editData.upi_id || ""}
                onChange={(e) => handleChange("upi_id", e.target.value)}
                className="w-full rounded-xl border-2 border-neutral-200 px-4 py-3 focus:border-orange-400 focus:outline-none transition-all"
                placeholder="your-upi-id@bank"
                suppressHydrationWarning
              />
              <p className="text-xs text-neutral-600 mt-1">Students will use this UPI ID to pay for orders</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📦 Maximum Active Orders
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={editData.max_active_orders || ""}
                onChange={(e) => handleChange("max_active_orders", parseInt(e.target.value))}
                className="w-full rounded-xl border-2 border-neutral-200 px-4 py-3 focus:border-orange-400 focus:outline-none transition-all"
                suppressHydrationWarning
              />
              <p className="text-xs text-neutral-600 mt-1">
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
              className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-60"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}