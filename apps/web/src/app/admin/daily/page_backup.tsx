"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Order } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/components/AuthProvider";

export default function DailyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (showLoading = true) => {
    if (!user?.canteen_id) {
      setError("User not authenticated or missing canteen access");
      return;
    }
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Order[]>(`/admin/orders/daily?date=${date}`);
      setOrders(data);
    } catch (err: any) {
      console.error("Daily orders fetch error:", err);
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        setError("Authentication failed. Please log in again.");
      } else if (err?.message?.includes('Failed to fetch')) {
        setError("Unable to connect to server. Please check your connection and ensure the backend is running.");
      } else {
        setError(err?.message || "Failed to load orders");
      }
      setOrders([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "CANTEEN_ADMIN" && user.canteen_id) {
      load();
    } else if (user && user.role !== "CANTEEN_ADMIN") {
      setError("Access denied. Canteen admin role required.");
    }
  }, [user, date]);

  // Enhanced polling connection as fallback for WebSocket issues
  useEffect(() => {
    if (user?.role === "CANTEEN_ADMIN") {
      load();
    }
  }, [user, date]);

  if (authLoading) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (user?.role !== "CANTEEN_ADMIN") {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm text-neutral-500">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 rounded-3xl bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Daily Orders</h1>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-neutral-200 px-3 py-2"
          suppressHydrationWarning
        />
        <button
          onClick={() => load()}
          disabled={loading}
          className="rounded-full bg-black px-4 py-2 text-sm text-neutral-900 dark:text-white disabled:opacity-60"
        >
          {loading ? "Loading..." : "Reload"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="grid gap-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-lg font-semibold">Order #{order.id}</p>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-neutral-600 mb-3">
                  {new Date(order.created_at).toLocaleString()}
                </p>
                
                {/* Student Information */}
                <div className="mb-4 space-y-1">
                  {order.student_name && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Student:</span> {order.student_name}
                    </p>
                  )}
                  {order.student_roll_number && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Roll:</span> {order.student_roll_number}
                    </p>
                  )}
                  {order.student_phone_number && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Phone:</span> 
                      <a href={`tel:${order.student_phone_number}`} className="text-blue-600 hover:underline ml-1">
                        {order.student_phone_number}
                      </a>
                    </p>
                  )}
                </div>
                
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium text-gray-700">Items:</p>
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm pl-4">
                      <span className="text-gray-700">{item.menu_item_name || `Item ${item.menu_item_id}`}</span>
                      <span className="text-neutral-500">{item.quantity} × ₹{(item.unit_price_cents / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-lg">₹{(order.total_amount_cents / 100).toFixed(2)}</span>
                </div>
                
                {order.pickup_code && (
                  <div className="mt-3 inline-block rounded-lg bg-blue-50 px-3 py-2">
                    <p className="text-xs text-blue-600">Pickup Code</p>
                    <p className="text-xl font-bold text-blue-800">{order.pickup_code}</p>
                  </div>
                )}
                
                {order.decline_reason && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600 font-medium">Decline Reason:</p>
                    <p className="text-sm text-red-700">{order.decline_reason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-sm text-neutral-500">No orders for this date.</p>}
      </div>
    </div>
  );
}
