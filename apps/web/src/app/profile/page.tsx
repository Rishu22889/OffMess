"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { User } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

interface Hostel {
  id: number;
  name: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    hostel_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  useEffect(() => {
    loadHostels();
  }, []);

  useEffect(() => {
    if (user) {
      setProfile(user);
      setFormData({
        name: user.name || "",
        phone_number: user.phone_number || "",
        hostel_name: user.hostel_name || "",
      });
    }
  }, [user]);

  const loadHostels = async () => {
    try {
      const data = await apiFetch<{ total: number; items: Hostel[] }>("/hostels");
      setHostels(data.items);
    } catch (error) {
      console.error("Failed to load hostels:", error);
      // Fallback to default hostels
      setHostels([
        { id: 1, name: "Amber Hostel" },
        { id: 2, name: "Hostel A" },
        { id: 3, name: "Hostel B" },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(false);
    setError(null);
    setSuccess(null);

    try {
      const updatedUser = await apiFetch<User>("/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: formData.name.trim() || null,
          phone_number: formData.phone_number.trim() || null,
          hostel_name: formData.hostel_name.trim() || null,
        }),
      });
      
      setProfile(updatedUser);
      updateUser(updatedUser);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  if (!user) {
    return (
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Profile Card */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Profile</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Read-only fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                Role
              </label>
              <input
                type="text"
                value={user.role}
                disabled
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400"
              />
            </div>
            
            {user.roll_number && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={user.roll_number}
                  disabled
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400"
                />
              </div>
            )}
            
            {user.email && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400"
                />
              </div>
            )}
          </div>

          {/* Editable fields */}
          <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:border-orange-500 dark:focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                suppressHydrationWarning
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleChange("phone_number", e.target.value)}
                placeholder="Enter your phone number"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:border-orange-500 dark:focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                suppressHydrationWarning
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                Hostel Name
              </label>
              <select
                value={formData.hostel_name}
                onChange={(e) => handleChange("hostel_name", e.target.value)}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-900 dark:text-white focus:border-orange-500 dark:focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                suppressHydrationWarning
              >
                <option value="">Select your hostel</option>
                {hostels.map((hostel) => (
                  <option key={hostel.id} value={hostel.name}>
                    {hostel.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Set your hostel to view today's mess menu on your dashboard
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 p-4">
              <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 px-6 py-3 text-neutral-900 dark:text-white font-medium transition-colors disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update Profile"}
          </button>
        </form>
      </div>

      {/* Logout Button */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Account Actions</h2>
        <button
          onClick={handleLogout}
          className="w-full rounded-xl border-2 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-6 py-3 text-red-500 dark:text-red-400 font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}