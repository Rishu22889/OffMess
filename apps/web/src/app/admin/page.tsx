"use client";

import { useEffect, useState, useRef } from "react";
import { apiFetch, getSocketUrl } from "@/lib/api";
import { MenuItem, Order, OrderResponse, OrderStatus, PaymentMethod } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import StatusBadge from "@/components/StatusBadge";
import { QRCodeSVG } from "qrcode.react";
import { requestNotificationPermission, notifyNewOrder } from "@/lib/notifications";
import NotificationButton from "@/components/NotificationButton";

const statusToNext: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: "READY",  // For backward compatibility with existing orders
  PREPARING: "READY",
  READY: "COLLECTED",
};

interface CanteenProfile {
  id: number;
  name: string;
  accepting_orders: boolean;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [incomingOrders, setIncomingOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuEdits, setMenuEdits] = useState<
    Record<number, { is_available: boolean }>
  >({});
  const [canteenProfile, setCanteenProfile] = useState<CanteenProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [declineDialogs, setDeclineDialogs] = useState<Record<number, boolean>>({});
  const [wsConnected, setWsConnected] = useState(false);
  const previousIncomingOrderIds = useRef<Set<number>>(new Set());

  const DECLINE_REASONS = [
    "Item not available",
    "Kitchen closed for maintenance", 
    "Insufficient ingredients",
    "Too many orders - try later",
    "Payment issue",
    "Other"
  ];

  // Request notification permission on mount
  useEffect(() => {
    if (user?.role === "CANTEEN_ADMIN") {
      requestNotificationPermission();
    }
  }, [user]);

  // Redirect if not authenticated or not a canteen admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "CANTEEN_ADMIN")) {
      window.location.href = '/login';
    }
  }, [user, authLoading]);

  const loadOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const [incoming, active] = await Promise.all([
        apiFetch<Order[]>("/admin/orders?status=REQUESTED"),
        apiFetch<Order[]>("/admin/orders?status=ACTIVE"),
      ]);
      
      // Check for new orders and show notifications
      const currentOrderIds = new Set(incoming.map(o => o.id));
      const newOrders = incoming.filter(o => !previousIncomingOrderIds.current.has(o.id));
      
      // Show notification for each new order
      newOrders.forEach(order => {
        notifyNewOrder(
          order.id,
          order.student_name || "Student",
          order.total_amount_cents / 100
        );
      });
      
      // Update previous order IDs
      previousIncomingOrderIds.current = currentOrderIds;
      
      setIncomingOrders(incoming);
      setActiveOrders(active);
    } catch (err: any) {
      console.error("Failed to load orders:", err);
      setError(`Failed to load orders: ${err?.message || 'Unknown error'}`);
      setIncomingOrders([]);
      setActiveOrders([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadMenu = async () => {
    try {
      setError(null);
      const items = await apiFetch<MenuItem[]>("/admin/menu");
      setMenuItems(items);
      const drafts: Record<number, { is_available: boolean }> = {};
      items.forEach((item) => {
        drafts[item.id] = {
          is_available: item.is_available,
        };
      });
      setMenuEdits(drafts);
    } catch (err: any) {
      console.error("Failed to load menu:", err);
      setError(`Failed to load menu: ${err?.message || 'Unknown error'}`);
      setMenuItems([]);
      setMenuEdits({});
    }
  };

  const loadCanteenProfile = async () => {
    try {
      console.log("Loading canteen profile for user:", user);
      const profile = await apiFetch<CanteenProfile>("/admin/profile");
      console.log("Canteen profile loaded:", profile);
      setCanteenProfile(profile);
    } catch (err: any) {
      console.error("Failed to load canteen profile:", err);
      // Don't show error to user, just log it - the toggle won't appear if profile fails to load
      if (err?.message?.includes('403') || err?.message?.includes('Forbidden')) {
        console.error("Permission denied to access canteen profile. User may need to log out and log back in.");
      }
    }
  };

  useEffect(() => {
    if (user?.role === "CANTEEN_ADMIN" && user.canteen_id) {
      loadOrders();
      loadMenu();
      loadCanteenProfile();
    } else if (user?.role === "CANTEEN_ADMIN" && !user.canteen_id) {
      console.error("Canteen admin user missing canteen_id:", user);
      setError("Your account is not properly configured. Please contact support.");
    }
  }, [user]);

  // Enhanced polling connection as fallback for WebSocket issues
  useEffect(() => {
    if (user?.role !== "CANTEEN_ADMIN") return;
    
    console.log("Setting up real-time updates for admin dashboard");
    
    // Try WebSocket first, fallback to polling
    let ws: WebSocket | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const startPolling = () => {
      console.log("Using polling for real-time updates");
      setWsConnected(false);
      pollingInterval = setInterval(() => {
        loadOrders(false);
      }, 3000); // Poll every 3 seconds
    };
    
    const connect = () => {
      try {
        ws = new WebSocket(getSocketUrl());
        
        ws.onopen = () => {
          console.log("WebSocket connected for real-time updates");
          setWsConnected(true);
          // Clear polling if WebSocket works
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Real-time update received:", data);
            
            if (data.type?.startsWith("order.")) {
              loadOrders(false);
            }
          } catch (err) {
            console.error("WebSocket message error:", err);
          }
        };
        
        ws.onclose = () => {
          console.log("WebSocket disconnected, using polling");
          setWsConnected(false);
          startPolling();
        };
        
        ws.onerror = (error) => {
          console.log("WebSocket error, using polling:", error);
          setWsConnected(false);
          startPolling();
        };
      } catch (err) {
        console.log("WebSocket connection error, using polling:", err);
        setWsConnected(false);
        startPolling();
      }
    };
    
    // Try WebSocket first
    connect();
    
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      if (ws) {
        ws.close();
      }
    };
  }, [user]);

  const accept = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch<OrderResponse>(`/admin/orders/${id}/accept`, { 
        method: "POST"
      });
      loadOrders();
    } catch {
      setError("Failed to accept order");
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (orderId: number, status: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch<OrderResponse>(`/admin/orders/${orderId}/payment-status`, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      loadOrders();
    } catch {
      setError("Failed to update payment status");
    } finally {
      setLoading(false);
    }
  };

  const cancelFailedPayment = async (orderId: number) => {
    if (!confirm("Cancel this order with failed payment?")) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch<OrderResponse>(`/admin/orders/${orderId}/cancel-failed-payment`, {
        method: "POST"
      });
      loadOrders();
    } catch {
      setError("Failed to cancel order");
    } finally {
      setLoading(false);
    }
  };

  const decline = async (id: number, reason: string) => {
    if (!reason) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch<OrderResponse>(`/admin/orders/${id}/decline`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setDeclineDialogs(prev => ({ ...prev, [id]: false }));
      loadOrders();
    } catch {
      setError("Failed to decline order");
    } finally {
      setLoading(false);
    }
  };

  const openDeclineDialog = (orderId: number) => {
    setDeclineDialogs(prev => ({ ...prev, [orderId]: true }));
  };

  const closeDeclineDialog = (orderId: number) => {
    setDeclineDialogs(prev => ({ ...prev, [orderId]: false }));
  };

  const advance = async (order: Order) => {
    const next = statusToNext[order.status];
    if (!next) return;
    
    setLoading(true);
    setError(null);
    try {
      const payload: any = { status: next };
      if (next === "COLLECTED" && order.pickup_code) {
        payload.pickup_code = order.pickup_code;
      }
      
      await apiFetch<OrderResponse>(`/admin/orders/${order.id}/status`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      loadOrders();
    } catch (err: any) {
      if (err?.message?.includes('Invalid pickup code')) {
        setError("Invalid pickup code. Please check with the student.");
      } else {
        setError("Failed to update status");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (id: number, field: "is_available", value: boolean) => {
    setMenuEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveMenuItem = async (id: number) => {
    const draft = menuEdits[id];
    if (!draft) return;
    setLoading(true);
    setError(null);
    try {
      // Only toggle availability
      await apiFetch<MenuItem>(`/admin/menu/${id}/toggle`, {
        method: "PATCH",
      });
      await loadMenu();
    } catch {
      setError("Failed to update menu item");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrders = async () => {
    setToggleLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const updated = await apiFetch<CanteenProfile>("/admin/profile/toggle-orders", {
        method: "PATCH",
      });
      setCanteenProfile(updated);
      setSuccess(updated.accepting_orders ? "Now accepting orders!" : "Stopped accepting orders.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Failed to toggle orders:", err);
      setError(err?.message || "Failed to toggle order status. Please try again.");
    } finally {
      setToggleLoading(false);
    }
  };

  return (
    <>
      {authLoading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">Loading...</p>
          </div>
        </div>
      )}
      {!authLoading && user?.role !== "CANTEEN_ADMIN" && (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 text-center shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-neutral-900 dark:text-white">Access Denied</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">You do not have permission to access this page.</p>
        </div>
      )}
      {!authLoading && user?.role === "CANTEEN_ADMIN" && (
        <div className="space-y-6">
      {/* Header with Status Toggle - SIMPLIFIED */}
      <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-2">
              {canteenProfile?.name || "Canteen Dashboard"}
            </h1>
            <p className="text-base text-neutral-600 dark:text-neutral-400">
              {canteenProfile?.accepting_orders 
                ? "✅ You are currently accepting orders" 
                : "⏸️ You are not accepting orders"}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Notification Button */}
            <NotificationButton />
            
            {canteenProfile && (
              <button
                onClick={handleToggleOrders}
                disabled={toggleLoading}
                className={`w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-bold text-white shadow-2xl transition-all transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 ${
                  canteenProfile.accepting_orders
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/30"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-500/30"
                }`}
              >
                {toggleLoading 
                  ? "⏳ Updating..." 
                  : canteenProfile.accepting_orders 
                    ? "🛑 Stop Taking Orders" 
                    : "▶️ Start Taking Orders"}
              </button>
            )}
          </div>
        </div>
        
        {(success || error) && (
          <div className={`mt-4 px-4 py-3 rounded-xl border-2 ${
            success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium ${success ? 'text-green-800' : 'text-red-800'}`}>
              {success || error}
            </p>
          </div>
        )}
      </div>

      {/* NEW ORDERS - SIMPLIFIED WITH BIG BUTTONS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-orange-200 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
            <span className="text-2xl">🔔</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">New Orders</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Accept or decline incoming orders</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {incomingOrders.length === 0 && (
            <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-dashed border-neutral-200 dark:border-neutral-800">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center">
                <span className="text-4xl">✨</span>
              </div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">All caught up!</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">No new orders at the moment</p>
            </div>
          )}
          
          {incomingOrders.map((order) => (
            <div key={order.id} className="rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-neutral-900 to-neutral-800 p-5 sm:p-6 hover:border-orange-500 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">📋</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-xl font-bold text-neutral-900 dark:text-white">Order #{order.order_number}</p>
                        {order.payment && (
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            order.payment.method === "COUNTER"
                              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          }`}>
                            {order.payment.method === "COUNTER" ? "🏪 Pay at Counter" : "💳 Online"}
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-orange-600">₹{(order.total_amount_cents / 100).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {/* Student Info - PROMINENT */}
                  {(order.student_name || order.student_roll_number || order.student_phone_number) && (
                    <div className="mb-4 p-4 rounded-xl bg-blue-900/30 border border-blue-700">
                      <p className="text-xs font-semibold text-blue-300 mb-2">STUDENT DETAILS</p>
                      {order.student_name && (
                        <p className="text-base font-semibold text-neutral-900 dark:text-white">{order.student_name}</p>
                      )}
                      {order.student_roll_number && (
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">Roll: {order.student_roll_number}</p>
                      )}
                      {order.student_phone_number && (
                        <a href={`tel:${order.student_phone_number}`} className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                          📞 {order.student_phone_number}
                        </a>
                      )}
                    </div>
                  )}
                  
                  {/* Order Items - CLEAR */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">Order Items:</p>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 px-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="font-medium text-neutral-900 dark:text-white">{item.menu_item_name || `Item ${item.menu_item_id}`}</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{item.quantity} × ₹{(item.unit_price_cents / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Counter Payment Info */}
                  {order.payment?.method === "COUNTER" && (
                    <div className="mt-3 p-3 rounded-xl bg-orange-900/20 border border-orange-700">
                      <p className="text-xs font-semibold text-orange-400 mb-1">💡 Payment Method</p>
                      <p className="text-sm text-orange-300">Student will pay at counter when collecting</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* BIG ACTION BUTTONS */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={loading}
                  onClick={() => accept(order.id)}
                  className="py-4 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-neutral-900 dark:text-white font-bold text-lg shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
                >
                  ✅ Accept
                </button>
                <button
                  disabled={loading}
                  onClick={() => openDeclineDialog(order.id)}
                  className="py-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-neutral-900 dark:text-white font-bold text-lg shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
                >
                  ❌ Decline
                </button>
              </div>
              
              {/* Decline Dialog - SIMPLIFIED */}
              {declineDialogs[order.id] && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-slide-in">
                  <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-3xl">❌</span>
                      </div>
                      <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Decline Order #{order.order_number}</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Select a reason:</p>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      {DECLINE_REASONS.map((reason) => (
                        <button
                          key={reason}
                          disabled={loading}
                          onClick={() => decline(order.id, reason)}
                          className="w-full text-left px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-red-500 hover:bg-red-900/20 text-sm font-medium text-neutral-900 dark:text-white transition-all"
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => closeDeclineDialog(order.id)}
                      className="w-full py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-50 dark:bg-neutral-800 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ORDERS IN PROGRESS - SIMPLIFIED */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-200 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
            <span className="text-2xl">👨‍🍳</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Orders in Progress</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Update order status as you prepare them</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {activeOrders.length === 0 && (
            <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-dashed border-neutral-200 dark:border-neutral-800">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center">
                <span className="text-4xl">😴</span>
              </div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">No active orders</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Orders will appear here once accepted</p>
            </div>
          )}
          
          {activeOrders
            .sort((a, b) => {
              // Sort by created_at ascending (oldest first) so Queue #1 appears first
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            })
            .map((order) => {
            const successfulPaymentOrders = activeOrders
              .filter(o => 
                (o.status === "PAID" || o.status === "PREPARING") && 
                o.payment?.status === "SUCCESS"
              )
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // Sort oldest first for queue
            const queuePosition = successfulPaymentOrders.findIndex(o => o.id === order.id) + 1;
            const showQueuePosition = queuePosition > 0;
            
            return (
            <div key={order.id} className="rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-neutral-900 to-neutral-800 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">
                      {order.status === "PAID" ? "💳" : order.status === "PREPARING" ? "👨‍🍳" : order.status === "READY" ? "🔔" : "📋"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xl font-bold text-neutral-900 dark:text-white">Order #{order.order_number}</p>
                        {showQueuePosition && (
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-bold">
                            Queue #{queuePosition}
                          </span>
                        )}
                        <StatusBadge status={order.status} />
                        {order.payment && (
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            order.payment.method === "COUNTER"
                              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          }`}>
                            {order.payment.method === "COUNTER" ? "🏪 Counter" : "💳 Online"}
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-blue-600">₹{(order.total_amount_cents / 100).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {/* Student Info */}
                  {(order.student_name || order.student_roll_number || order.student_phone_number) && (
                    <div className="mb-4 p-4 rounded-xl bg-blue-900/30 border border-blue-700">
                      <p className="text-xs font-semibold text-blue-300 mb-2">STUDENT DETAILS</p>
                      {order.student_name && (
                        <p className="text-base font-semibold text-neutral-900 dark:text-white">{order.student_name}</p>
                      )}
                      {order.student_roll_number && (
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">Roll: {order.student_roll_number}</p>
                      )}
                      {order.student_phone_number && (
                        <a href={`tel:${order.student_phone_number}`} className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                          📞 {order.student_phone_number}
                        </a>
                      )}
                    </div>
                  )}
                  
                  {/* Order Items */}
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase">Order Items:</p>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 px-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="font-medium text-neutral-900 dark:text-white">{item.menu_item_name || `Item ${item.menu_item_id}`}</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{item.quantity} × ₹{(item.unit_price_cents / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pickup Code Display */}
                  {order.pickup_code && statusToNext[order.status] === "COLLECTED" && (
                    <div className="mb-4 p-5 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
                      <p className="text-xs font-semibold text-green-900 mb-2">🔐 PICKUP CODE</p>
                      <p className="text-4xl font-black text-green-900 font-mono tracking-wider mb-2">{order.pickup_code}</p>
                      <p className="text-sm text-green-700 font-medium">Ask student for this code before handing over food</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Counter Payment Info - Show for PAID/PREPARING/READY counter payments */}
              {order.payment?.method === "COUNTER" && (order.status === "PAID" || order.status === "PREPARING" || order.status === "READY") && (
                <div className="mb-4 p-4 rounded-xl bg-orange-900/20 border-2 border-orange-700">
                  <p className="text-sm font-semibold text-orange-400 mb-2">🏪 Student will pay at counter</p>
                  <p className="text-xs text-orange-300">
                    Collect ₹{(order.total_amount_cents / 100).toFixed(2)} when student picks up the order
                  </p>
                </div>
              )}
              
              {/* BIG STATUS UPDATE BUTTON */}
              {statusToNext[order.status] && (
                <button
                  disabled={loading}
                  onClick={() => advance(order)}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-neutral-900 dark:text-white font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
                >
                  {statusToNext[order.status] === "READY" && "🔔 Mark as Ready"}
                  {statusToNext[order.status] === "COLLECTED" && "✅ Mark as Collected"}
                </button>
              )}
            </div>
          )})}
        </div>
      </section>

      {/* MENU MANAGEMENT - SUPER SIMPLIFIED */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
            <span className="text-2xl">🍽️</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Menu Items</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Turn items on/off when out of stock</p>
          </div>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-2">
          {menuItems.map((item) => {
            const draft = menuEdits[item.id];
            if (!draft) return null;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  draft.is_available 
                    ? 'border-green-600 bg-gradient-to-br from-neutral-900 to-neutral-800' 
                    : 'border-neutral-700 bg-gradient-to-br from-neutral-900 to-neutral-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <p className="font-bold text-neutral-900 dark:text-white text-lg">{item.name}</p>
                    <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300">₹{(item.price_cents / 100).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => {
                      updateDraft(item.id, "is_available", !draft.is_available);
                      saveMenuItem(item.id);
                    }}
                    disabled={loading}
                    className={`px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all transform hover:scale-105 disabled:opacity-60 ${
                      draft.is_available
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-neutral-600 hover:bg-neutral-700 text-white'
                    }`}
                  >
                    {draft.is_available ? '✅ Available' : '❌ Out of Stock'}
                  </button>
                </div>
              </div>
            );
          })}
          {menuItems.length === 0 && (
            <div className="col-span-2 text-center py-8 px-4 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-dashed border-neutral-200 dark:border-neutral-800">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">No menu items found. Contact Campus Admin to add items.</p>
            </div>
          )}
        </div>
      </section>
    </div>
      )}
    </>
  );
}
