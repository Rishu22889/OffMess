"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { MessMenu, MessMenuListResponse } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

interface Hostel {
  id: number;
  name: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Monday", emoji: "📅" },
  { value: 1, label: "Tuesday", emoji: "📅" },
  { value: 2, label: "Wednesday", emoji: "📅" },
  { value: 3, label: "Thursday", emoji: "📅" },
  { value: 4, label: "Friday", emoji: "📅" },
  { value: 5, label: "Saturday", emoji: "📅" },
  { value: 6, label: "Sunday", emoji: "📅" },
];

export default function MessMenuManagementPage() {
  const { user } = useAuth();
  const [menus, setMenus] = useState<MessMenu[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MessMenu | null>(null);
  const [selectedHostel, setSelectedHostel] = useState("Amber Hostel");
  
  // Form state
  const [formData, setFormData] = useState({
    hostel_name: "",
    day_of_week: 0,
    breakfast: "",
    lunch: "",
    snacks: "",
    dinner: "",
  });

  const loadHostels = async () => {
    try {
      const data = await apiFetch<{ total: number; items: Hostel[] }>("/campus/hostels");
      setHostels(data.items);
      if (data.items.length > 0 && !selectedHostel) {
        setSelectedHostel(data.items[0].name);
      }
    } catch (err: any) {
      console.error("Failed to load hostels:", err);
      // Fallback to default hostels if API fails
      setHostels([{ id: 1, name: "Amber Hostel" }]);
    }
  };

  const loadMenus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `/campus/mess-menus?hostel_name=${encodeURIComponent(selectedHostel)}`;
      const data = await apiFetch<MessMenuListResponse>(url);
      setMenus(data.items);
    } catch (err: any) {
      setError(err?.message || "Failed to load menus");
      setMenus([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "CAMPUS_ADMIN") {
      loadHostels();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "CAMPUS_ADMIN" && selectedHostel) {
      loadMenus();
    }
  }, [user, selectedHostel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.hostel_name) {
      setError("Hostel name is required");
      return;
    }

    try {
      setLoading(true);
      
      if (editingMenu) {
        // Update existing menu (only meal fields)
        await apiFetch(`/campus/mess-menu/${editingMenu.id}`, {
          method: "PUT",
          body: JSON.stringify({
            breakfast: formData.breakfast,
            lunch: formData.lunch,
            snacks: formData.snacks,
            dinner: formData.dinner,
          }),
        });
        setSuccess("Menu updated successfully!");
      } else {
        // Create new menu
        await apiFetch("/campus/mess-menu", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        setSuccess("Menu created successfully!");
      }
      
      setShowForm(false);
      setEditingMenu(null);
      setFormData({
        hostel_name: "",
        day_of_week: 0,
        breakfast: "",
        lunch: "",
        snacks: "",
        dinner: "",
      });
      await loadMenus();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to save menu");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (menu: MessMenu) => {
    setEditingMenu(menu);
    setFormData({
      hostel_name: menu.hostel_name,
      day_of_week: menu.day_of_week,
      breakfast: menu.breakfast || "",
      lunch: menu.lunch || "",
      snacks: menu.snacks || "",
      dinner: menu.dinner || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (menu: MessMenu) => {
    const dayName = DAYS_OF_WEEK[menu.day_of_week].label;
    if (!confirm(`Delete ${dayName} menu for ${menu.hostel_name}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await apiFetch(`/campus/mess-menu/${menu.id}`, { method: "DELETE" });
      setSuccess("Menu deleted successfully!");
      await loadMenus();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to delete menu");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMenu(null);
    setFormData({
      hostel_name: "",
      day_of_week: 0,
      breakfast: "",
      lunch: "",
      snacks: "",
      dinner: "",
    });
  };

  if (user?.role !== "CAMPUS_ADMIN") {
    return (
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">Weekly Mess Menu</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Set weekly schedule that repeats every week</p>
        </div>
      </div>

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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-2xl w-full my-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              {editingMenu ? `Edit ${DAYS_OF_WEEK[editingMenu.day_of_week].label} Menu` : "Add New Menu"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Hostel Name *
                  </label>
                  <select
                    value={formData.hostel_name}
                    onChange={(e) => setFormData({ ...formData, hostel_name: e.target.value })}
                    className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none"
                    required
                    disabled={!!editingMenu}
                  >
                    <option value="">Select hostel</option>
                    {hostels.map((hostel) => (
                      <option key={hostel.id} value={hostel.name}>
                        {hostel.name}
                      </option>
                    ))}
                  </select>
                  {editingMenu && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-500 mt-1">
                      Cannot change hostel when editing
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Day of Week *
                  </label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                    className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none"
                    required
                    disabled={!!editingMenu}
                  >
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                  {editingMenu && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-500 mt-1">
                      Cannot change day when editing
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  🌅 Breakfast
                </label>
                <textarea
                  value={formData.breakfast}
                  onChange={(e) => setFormData({ ...formData, breakfast: e.target.value })}
                  placeholder="Enter breakfast items..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  🌞 Lunch
                </label>
                <textarea
                  value={formData.lunch}
                  onChange={(e) => setFormData({ ...formData, lunch: e.target.value })}
                  placeholder="Enter lunch items..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  ☕ Snacks
                </label>
                <textarea
                  value={formData.snacks}
                  onChange={(e) => setFormData({ ...formData, snacks: e.target.value })}
                  placeholder="Enter snacks items..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  🌙 Dinner
                </label>
                <textarea
                  value={formData.dinner}
                  onChange={(e) => setFormData({ ...formData, dinner: e.target.value })}
                  placeholder="Enter dinner items..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 dark:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-4 py-2 text-sm text-neutral-900 dark:text-white font-bold disabled:opacity-60"
                >
                  {loading ? "Saving..." : editingMenu ? "Update Menu" : "Create Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hostel Selector */}
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6">
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Select Hostel
        </label>
        <select
          value={selectedHostel}
          onChange={(e) => setSelectedHostel(e.target.value)}
          className="w-full sm:w-64 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none"
        >
          {hostels.map((hostel) => (
            <option key={hostel.id} value={hostel.name}>
              {hostel.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2">
          This weekly schedule will repeat every week for {selectedHostel}
        </p>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="space-y-4">
        {loading && menus.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">Loading menus...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {DAYS_OF_WEEK.map((day) => {
              const menu = menus.find(m => m.day_of_week === day.value);
              const today = new Date().getDay();
              // Convert Sunday (0) to 6, and shift others down by 1
              const todayAdjusted = today === 0 ? 6 : today - 1;
              const isToday = day.value === todayAdjusted;
              
              return (
                <div
                  key={day.value}
                  className={`rounded-3xl border p-6 ${
                    isToday 
                      ? 'bg-orange-500/10 border-orange-500' 
                      : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                        {day.emoji} {day.label}
                        {isToday && <span className="ml-2 text-orange-500">• Today</span>}
                      </h3>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        Repeats every {day.label}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {menu ? (
                        <>
                          <button
                            onClick={() => handleEdit(menu)}
                            className="px-3 py-1.5 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white hover:bg-neutral-50 dark:bg-neutral-800"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(menu)}
                            className="px-3 py-1.5 rounded-lg border-2 border-red-700 text-xs text-red-400 hover:bg-red-900/20"
                          >
                            🗑️
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingMenu(null);
                            setFormData({
                              hostel_name: selectedHostel,
                              day_of_week: day.value,
                              breakfast: "",
                              lunch: "",
                              snacks: "",
                              dinner: "",
                            });
                            setShowForm(true);
                          }}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-xs text-neutral-900 dark:text-white font-bold"
                        >
                          + Add Menu
                        </button>
                      )}
                    </div>
                  </div>

                  {menu ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3">
                        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">🌅 Breakfast</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-line line-clamp-3">
                          {menu.breakfast || "Not set"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3">
                        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">🌞 Lunch</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-line line-clamp-3">
                          {menu.lunch || "Not set"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3">
                        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">☕ Snacks</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-line line-clamp-3">
                          {menu.snacks || "Not set"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3">
                        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">🌙 Dinner</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-line line-clamp-3">
                          {menu.dinner || "Not set"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-neutral-600 dark:text-neutral-500">No menu set for this day</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
