"use client";

import { useEffect, useState } from "react";
import { apiFetch, getSocketUrl } from "@/lib/api";
import { Canteen, MenuItem } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

interface CanteenWithDetails extends Canteen {
  is_open: boolean;
  accepting_orders: boolean;
  current_time: string;
  active_orders: number;
  can_accept_orders: boolean;
  menu_items: MenuItem[];
  admin_name?: string;
  admin_phone?: string;
  admin_email?: string;
}

interface NewCanteen {
  name: string;
  hours_open: string;
  hours_close: string;
  avg_prep_minutes: string;
  upi_id: string;
  max_active_orders: string;
}

interface NewMenuItem {
  name: string;
  price: string;
}

export default function CampusAdminPage() {
  const { user } = useAuth();
  const [canteens, setCanteens] = useState<CanteenWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCanteen, setExpandedCanteen] = useState<number | null>(null);
  const [showAddCanteen, setShowAddCanteen] = useState(false);
  const [showAddMenuItem, setShowAddMenuItem] = useState<number | null>(null);
  const [newCanteen, setNewCanteen] = useState<NewCanteen>({
    name: "",
    hours_open: "08:00",
    hours_close: "20:00",
    avg_prep_minutes: "15",
    upi_id: "",
    max_active_orders: "20",
  });
  const [newMenuItem, setNewMenuItem] = useState<NewMenuItem>({
    name: "",
    price: "",
  });
  const [editingEmail, setEditingEmail] = useState<number | null>(null);
  const [newEmail, setNewEmail] = useState("");

  const loadCanteens = async () => {
    try {
      setError(null);
      const canteensList = await apiFetch<Canteen[]>("/canteens");
      
      const detailedCanteens = await Promise.all(
        canteensList.map(async (canteen) => {
          try {
            const [status, menu] = await Promise.all([
              apiFetch<any>(`/canteens/${canteen.id}/status`),
              apiFetch<MenuItem[]>(`/canteens/${canteen.id}/menu`)
            ]);
            
            return {
              ...canteen,
              is_open: status.is_open,
              accepting_orders: status.accepting_orders,
              current_time: status.current_time,
              active_orders: status.active_orders,
              can_accept_orders: status.can_accept_orders,
              menu_items: menu,
              admin_name: status.admin_name,
              admin_phone: status.admin_phone,
              admin_email: status.admin_email,
            };
          } catch (err) {
            return {
              ...canteen,
              is_open: false,
              accepting_orders: false,
              current_time: "",
              active_orders: 0,
              can_accept_orders: false,
              menu_items: [],
            };
          }
        })
      );
      
      setCanteens(detailedCanteens);
    } catch (err: any) {
      setError(`Failed to load canteens: ${err?.message || 'Unknown error'}`);
      setCanteens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "CAMPUS_ADMIN") {
      loadCanteens();
    }
  }, [user]);

  // Real-time updates
  useEffect(() => {
    if (user?.role !== "CAMPUS_ADMIN") return;
    
    let ws: WebSocket | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const startPolling = () => {
      pollingInterval = setInterval(() => loadCanteens(), 10000);
    };
    
    const connect = () => {
      try {
        ws = new WebSocket(getSocketUrl());
        ws.onopen = () => {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type?.startsWith("order.")) loadCanteens();
          } catch (err) {}
        };
        ws.onclose = () => startPolling();
        ws.onerror = () => startPolling();
      } catch (err) {
        startPolling();
      }
    };
    
    connect();
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      if (ws) ws.close();
    };
  }, [user]);

  const addCanteen = async () => {
    if (!newCanteen.name || !newCanteen.upi_id) {
      setError("Please fill in all required fields");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/campus/canteens", {
        method: "POST",
        body: JSON.stringify({
          name: newCanteen.name,
          hours_open: newCanteen.hours_open,
          hours_close: newCanteen.hours_close,
          avg_prep_minutes: parseInt(newCanteen.avg_prep_minutes),
          upi_id: newCanteen.upi_id,
          max_active_orders: parseInt(newCanteen.max_active_orders),
          is_active: true,
        }),
      });
      setNewCanteen({
        name: "",
        hours_open: "08:00",
        hours_close: "20:00",
        avg_prep_minutes: "15",
        upi_id: "",
        max_active_orders: "20",
      });
      setShowAddCanteen(false);
      await loadCanteens();
    } catch (err: any) {
      setError(`Failed to add canteen: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteCanteen = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/campus/canteens/${id}`, { method: "DELETE" });
      await loadCanteens();
    } catch (err: any) {
      setError(`Failed to delete canteen: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const addMenuItem = async (canteenId: number) => {
    if (!newMenuItem.name || !newMenuItem.price) {
      setError("Please fill in all fields");
      return;
    }
    
    const price_cents = Math.round(parseFloat(newMenuItem.price) * 100);
    if (isNaN(price_cents) || price_cents <= 0) {
      setError("Invalid price");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/campus/canteens/${canteenId}/menu`, {
        method: "POST",
        body: JSON.stringify({
          name: newMenuItem.name,
          price_cents,
          is_available: true,
        }),
      });
      setNewMenuItem({ name: "", price: "" });
      setShowAddMenuItem(null);
      await loadCanteens();
    } catch (err: any) {
      setError(`Failed to add menu item: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteMenuItem = async (canteenId: number, itemId: number, itemName: string) => {
    if (!confirm(`Delete ${itemName}?`)) return;
    
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/campus/canteens/${canteenId}/menu/${itemId}`, { method: "DELETE" });
      await loadCanteens();
    } catch (err: any) {
      setError(`Failed to delete menu item: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateAdminEmail = async (canteenId: number) => {
    if (!newEmail || !newEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/campus/canteens/${canteenId}/admin-email`, {
        method: "PUT",
        body: JSON.stringify({ new_email: newEmail }),
      });
      
      setEditingEmail(null);
      setNewEmail("");
      await loadCanteens();
      
      // If a new user was created, show the temporary password
      if (response.is_new_user && response.temporary_password) {
        alert(
          `Canteen admin account created successfully!\n\n` +
          `Email: ${response.user.email}\n` +
          `Temporary Password: ${response.temporary_password}\n\n` +
          `Please share these credentials with the canteen admin. ` +
          `They should change their password after first login.`
        );
      }
    } catch (err: any) {
      setError(`Failed to update email: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "CAMPUS_ADMIN") {
    return (
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">You do not have access to this page.</p>
      </div>
    );
  }

  if (loading && canteens.length === 0) {
    return (
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading canteens...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">Campus Admin Dashboard</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Manage all canteens and menus</p>
        </div>
        <button
          onClick={() => setShowAddCanteen(true)}
          className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-6 py-3 text-sm text-neutral-900 dark:text-white font-bold transition-all"
        >
          + Add Canteen
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-900/20 border border-red-700 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Add Canteen Modal */}
      {showAddCanteen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">Add New Canteen</h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Canteen Name *</label>
                <input
                  type="text"
                  value={newCanteen.name}
                  onChange={(e) => setNewCanteen({ ...newCanteen, name: e.target.value })}
                  className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none"
                  placeholder="e.g., Main Canteen"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Opens At</label>
                  <input
                    type="time"
                    value={newCanteen.hours_open}
                    onChange={(e) => setNewCanteen({ ...newCanteen, hours_open: e.target.value })}
                    className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Closes At</label>
                  <input
                    type="time"
                    value={newCanteen.hours_close}
                    onChange={(e) => setNewCanteen({ ...newCanteen, hours_close: e.target.value })}
                    className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">UPI ID *</label>
                <input
                  type="text"
                  value={newCanteen.upi_id}
                  onChange={(e) => setNewCanteen({ ...newCanteen, upi_id: e.target.value })}
                  className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none"
                  placeholder="e.g., canteen@upi"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    value={newCanteen.avg_prep_minutes}
                    onChange={(e) => setNewCanteen({ ...newCanteen, avg_prep_minutes: e.target.value })}
                    className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Max Orders</label>
                  <input
                    type="number"
                    value={newCanteen.max_active_orders}
                    onChange={(e) => setNewCanteen({ ...newCanteen, max_active_orders: e.target.value })}
                    className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddCanteen(false)}
                className="flex-1 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 dark:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={addCanteen}
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-4 py-2 text-sm text-neutral-900 dark:text-white font-bold"
              >
                Add Canteen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {canteens.length === 0 && (
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">No canteens found. Click "Add Canteen" to create one.</p>
          </div>
        )}

        {canteens.map((canteen) => (
          <div key={canteen.id} className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{canteen.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    canteen.accepting_orders
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {canteen.accepting_orders ? '🟢 Accepting Orders' : '🔴 Not Accepting Orders'}
                  </span>
                  {canteen.accepting_orders && !canteen.can_accept_orders && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      ⚠️ At Capacity
                    </span>
                  )}
                </div>
                
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-600 dark:text-neutral-400">Operating Hours</p>
                    <p className="font-medium text-neutral-900 dark:text-white">{canteen.hours_open} - {canteen.hours_close}</p>
                  </div>
                  <div>
                    <p className="text-neutral-600 dark:text-neutral-400">Current Time</p>
                    <p className="font-medium text-neutral-900 dark:text-white">{canteen.current_time || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-neutral-600 dark:text-neutral-400">Active Orders</p>
                    <p className="font-medium text-neutral-900 dark:text-white">{canteen.active_orders} / {canteen.max_active_orders}</p>
                  </div>
                  <div>
                    <p className="text-neutral-600 dark:text-neutral-400">Avg Prep Time</p>
                    <p className="font-medium text-neutral-900 dark:text-white">{canteen.avg_prep_minutes} min</p>
                  </div>
                </div>

                {canteen.upi_id && (
                  <div className="mt-3 text-sm">
                    <p className="text-neutral-600 dark:text-neutral-400">UPI ID</p>
                    <p className="font-medium font-mono text-neutral-900 dark:text-white">{canteen.upi_id}</p>
                  </div>
                )}

                {/* Admin Email Section */}
                <div className="mt-3 text-sm">
                  <p className="text-neutral-600 dark:text-neutral-400">Admin Email</p>
                  <div className="flex items-center gap-2 mt-1">
                    {editingEmail === canteen.id ? (
                      <>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="admin@example.com"
                          className="flex-1 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-1 text-sm focus:border-orange-500 focus:outline-none"
                        />
                        <button
                          onClick={() => updateAdminEmail(canteen.id)}
                          disabled={loading}
                          className="px-3 py-1 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-neutral-900 dark:text-white text-xs font-bold hover:from-green-600 hover:to-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingEmail(null);
                            setNewEmail("");
                          }}
                          className="px-3 py-1 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs hover:bg-neutral-50 dark:bg-neutral-800"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="font-medium font-mono text-neutral-900 dark:text-white">{canteen.admin_email || 'Not set'}</p>
                        <button
                          onClick={() => {
                            setEditingEmail(canteen.id);
                            setNewEmail(canteen.admin_email || "");
                          }}
                          className="px-3 py-1 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs hover:bg-neutral-50 dark:bg-neutral-800"
                        >
                          ✏️ Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => setExpandedCanteen(expandedCanteen === canteen.id ? null : canteen.id)}
                  className="px-4 py-2 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white hover:bg-neutral-50 dark:bg-neutral-800"
                >
                  {expandedCanteen === canteen.id ? 'Hide' : 'Manage'} Menu
                </button>
                <button
                  onClick={() => deleteCanteen(canteen.id, canteen.name)}
                  className="px-4 py-2 rounded-xl border-2 border-red-700 text-sm text-red-400 hover:bg-red-900/20"
                >
                  Delete
                </button>
              </div>
            </div>

            {expandedCanteen === canteen.id && (
              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Menu Items</h3>
                  <button
                    onClick={() => setShowAddMenuItem(canteen.id)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-neutral-900 dark:text-white text-sm font-bold"
                  >
                    + Add Item
                  </button>
                </div>

                {showAddMenuItem === canteen.id && (
                  <div className="mb-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newMenuItem.name}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                        placeholder="Item name"
                        className="rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none placeholder:text-neutral-600 dark:text-neutral-500"
                      />
                      <input
                        type="number"
                        step="0.5"
                        value={newMenuItem.price}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                        placeholder="Price (₹)"
                        className="rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 focus:border-orange-500 focus:outline-none placeholder:text-neutral-600 dark:text-neutral-500"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setShowAddMenuItem(null)}
                        className="flex-1 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 px-4 py-2 text-sm hover:bg-white dark:bg-neutral-900"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => addMenuItem(canteen.id)}
                        disabled={loading}
                        className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-4 py-2 text-sm text-neutral-900 dark:text-white font-bold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {canteen.menu_items.length === 0 ? (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">No menu items. Click "Add Item" to create one.</p>
                ) : (
                  <div className="grid gap-3">
                    {canteen.menu_items.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🍽️</span>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                              {item.is_available ? 'Available' : 'Not Available'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-semibold text-neutral-900 dark:text-white">₹{(item.price_cents / 100).toFixed(2)}</p>
                          <button
                            onClick={() => deleteMenuItem(canteen.id, item.id, item.name)}
                            className="px-3 py-1 rounded-lg border-2 border-red-700 text-xs text-red-400 hover:bg-red-900/20"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
