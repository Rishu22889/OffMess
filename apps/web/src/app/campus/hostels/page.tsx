"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";

interface Hostel {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function HostelManagement() {
  const { user } = useAuth();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [newHostelName, setNewHostelName] = useState("");
  const [editHostelName, setEditHostelName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user?.role === "CAMPUS_ADMIN") {
      fetchHostels();
    }
  }, [user]);

  const fetchHostels = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ total: number; items: Hostel[] }>("/campus/hostels");
      setHostels(data.items);
    } catch (error) {
      console.error("Error fetching hostels:", error);
      setError("Failed to load hostels");
    } finally {
      setLoading(false);
    }
  };

  const handleAddHostel = async () => {
    if (!newHostelName.trim()) {
      setError("Hostel name cannot be empty");
      return;
    }

    try {
      await apiFetch("/campus/hostels", {
        method: "POST",
        body: JSON.stringify({ name: newHostelName.trim() }),
      });

      setSuccess("Hostel added successfully!");
      setNewHostelName("");
      setShowAddModal(false);
      fetchHostels();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      setError(error?.message || "Failed to add hostel");
    }
  };

  const handleEditHostel = async () => {
    if (!editHostelName.trim() || !selectedHostel) {
      setError("Hostel name cannot be empty");
      return;
    }

    try {
      await apiFetch(`/campus/hostels/${selectedHostel.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editHostelName.trim() }),
      });

      setSuccess("Hostel updated successfully!");
      setEditHostelName("");
      setSelectedHostel(null);
      setShowEditModal(false);
      fetchHostels();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      setError(error?.message || "Failed to update hostel");
    }
  };

  const handleDeleteHostel = async (hostel: Hostel) => {
    if (
      !confirm(
        `Are you sure you want to delete "${hostel.name}"? This will fail if the hostel has mess menus.`
      )
    ) {
      return;
    }

    try {
      await apiFetch(`/campus/hostels/${hostel.id}`, {
        method: "DELETE",
      });

      setSuccess("Hostel deleted successfully!");
      fetchHostels();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      setError(error?.message || "Failed to delete hostel");
    }
  };

  const openEditModal = (hostel: Hostel) => {
    setSelectedHostel(hostel);
    setEditHostelName(hostel.name);
    setShowEditModal(true);
    setError("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-neutral-900 dark:text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
              🏨 Hostel Management
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Add, edit, or remove hostels from the system
            </p>
          </div>
          <button
            onClick={() => {
              setShowAddModal(true);
              setNewHostelName("");
              setError("");
            }}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-neutral-900 dark:text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all"
          >
            ➕ Add Hostel
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-900/40 border border-green-700 rounded-xl text-green-300">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-900/40 border border-red-700 rounded-xl text-red-300">
            ✗ {error}
          </div>
        )}

        {/* Hostels List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostels.map((hostel) => (
            <div
              key={hostel.id}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 hover:border-orange-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                    {hostel.name}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">ID: {hostel.id}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(hostel)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-neutral-900 dark:text-white font-medium rounded-lg transition-all"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteHostel(hostel)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-neutral-900 dark:text-white font-medium rounded-lg transition-all"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {hostels.length === 0 && (
          <div className="text-center py-12 text-neutral-600 dark:text-neutral-400">
            No hostels found. Add your first hostel to get started.
          </div>
        )}
      </div>

      {/* Add Hostel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              ➕ Add New Hostel
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Hostel Name
              </label>
              <input
                type="text"
                value={newHostelName}
                onChange={(e) => setNewHostelName(e.target.value)}
                placeholder="Enter hostel name"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddHostel}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-neutral-900 dark:text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all"
              >
                Add Hostel
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewHostelName("");
                  setError("");
                }}
                className="flex-1 px-6 py-3 bg-neutral-700 text-neutral-900 dark:text-white font-semibold rounded-xl hover:bg-neutral-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Hostel Modal */}
      {showEditModal && selectedHostel && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              ✏️ Edit Hostel
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Hostel Name
              </label>
              <input
                type="text"
                value={editHostelName}
                onChange={(e) => setEditHostelName(e.target.value)}
                placeholder="Enter hostel name"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleEditHostel}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-neutral-900 dark:text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedHostel(null);
                  setEditHostelName("");
                  setError("");
                }}
                className="flex-1 px-6 py-3 bg-neutral-700 text-neutral-900 dark:text-white font-semibold rounded-xl hover:bg-neutral-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
