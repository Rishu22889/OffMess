"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { apiFetch, getSocketUrl } from "@/lib/api";
import { Order, OrderResponse } from "@/lib/types";
import QrCodePanel from "@/components/QrCodePanel";
import { requestNotificationPermission, notifyOrderReady, notifyOrderAccepted, notifyOrderPreparing } from "@/lib/notifications";
import NotificationButton from "@/components/NotificationButton";

const statusConfig = {
  REQUESTED: { label: "Requested", color: "yellow", icon: "⏳" },
  DECLINED: { label: "Declined", color: "red", icon: "❌" },
  PAYMENT_PENDING: { label: "Payment Pending", color: "orange", icon: "💳" },
  PAID: { label: "Paid", color: "green", icon: "✅" },
  PREPARING: { label: "Preparing", color: "blue", icon: "👨‍🍳" },
  READY: { label: "Ready", color: "indigo", icon: "🔔" },
  COLLECTED: { label: "Collected", color: "gray", icon: "✓" },
  CANCELLED_TIMEOUT: { label: "Cancelled", color: "gray", icon: "⏰" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const orderId = Number(rawId);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [canteenStatus, setCanteenStatus] = useState<{
    admin_name?: string | null;
    admin_phone?: string | null;
  } | null>(null);
  const previousStatus = useRef<string | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const fetchOrder = async () => {
    try {
      const data = await apiFetch<Order>(`/orders/${orderId}`);
      
      // Check for status changes and show notifications
      if (previousStatus.current && previousStatus.current !== data.status) {
        if (data.status === "PAYMENT_PENDING") {
          notifyOrderAccepted(data.id);
        } else if (data.status === "PREPARING") {
          notifyOrderPreparing(data.id);
        } else if (data.status === "READY" && data.pickup_code) {
          notifyOrderReady(data.id, data.pickup_code);
        }
      }
      
      previousStatus.current = data.status;
      setOrder(data);
      
      // Fetch canteen status for admin contact info
      if (data.canteen_id) {
        try {
          const status = await apiFetch<any>(`/canteens/${data.canteen_id}/status`);
          setCanteenStatus({
            admin_name: status.admin_name,
            admin_phone: status.admin_phone,
          });
        } catch {
          setCanteenStatus(null);
        }
      }
    } catch {
      setOrder(null);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // WebSocket for real-time updates
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;
    
    const connect = () => {
      try {
        ws = new WebSocket(getSocketUrl());
        
        ws.onopen = () => console.log("WebSocket connected");
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type?.startsWith("order.") && data.payload?.order_id === orderId) {
              fetchOrder();
            }
          } catch (err) {
            console.error("WebSocket message error:", err);
          }
        };
        
        ws.onclose = () => {
          reconnectTimeout = setTimeout(connect, 2000);
        };
        
        ws.onerror = () => {
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };
    
    connect();
    
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [orderId]);

  // Countdown timer
  useEffect(() => {
    if (!order?.payment_expires_at) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(order.payment_expires_at!).getTime();
      const diff = Math.max(0, expires - now);
      setTimeLeft(Math.floor(diff / 1000));
      
      if (diff <= 0) {
        clearInterval(interval);
        fetchOrder();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [order?.payment_expires_at]);

  const pay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<OrderResponse>(`/orders/${orderId}/pay`, { method: "POST" });
      setOrder(res.order);
    } catch (err) {
      setError("Payment failed or expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const status = statusConfig[order.status];
  const minutes = timeLeft ? Math.floor(timeLeft / 60) : 0;
  const seconds = timeLeft ? timeLeft % 60 : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Notification Button */}
      <div className="flex justify-end">
        <NotificationButton />
      </div>
      
      {/* Header */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Order #{order.order_number}</h1>
            <p className="text-neutral-600 dark:text-neutral-400">₹{(order.total_amount_cents / 100).toFixed(2)}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
            status.color === 'green' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
            status.color === 'blue' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
            status.color === 'indigo' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
            status.color === 'orange' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
            status.color === 'red' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
            status.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
            'bg-neutral-700 text-neutral-400 border-neutral-600'
          }`}>
            {status.icon} {status.label}
          </div>
        </div>

        {/* Status Messages */}
        {order.status === "REQUESTED" && order.payment?.method === "COUNTER" && (
          <div className="px-4 py-3 rounded-xl bg-orange-500/20 border border-orange-500/30">
            <p className="text-sm text-orange-400">
              ⏳ Waiting for canteen to accept your order. You'll pay at counter when collecting.
            </p>
          </div>
        )}
        {order.status === "REQUESTED" && order.payment?.method !== "COUNTER" && (
          <div className="px-4 py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
            <p className="text-sm text-yellow-400">⏳ Waiting for canteen to accept your order</p>
          </div>
        )}
        {order.status === "DECLINED" && (
          <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30">
            <p className="text-sm text-red-400">Declined: {order.decline_reason || "No reason provided"}</p>
          </div>
        )}
        {order.status === "CANCELLED_TIMEOUT" && (
          <div className="px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Payment window expired. Please place a new order.</p>
          </div>
        )}
        {order.status === "PAID" && order.payment?.method === "COUNTER" && (
          <div className="px-4 py-3 rounded-xl bg-green-500/20 border border-green-500/30">
            <p className="text-sm text-green-400">
              ✅ Order accepted! Remember to pay ₹{(order.total_amount_cents / 100).toFixed(2)} at counter when collecting.
            </p>
          </div>
        )}
      </div>

      {/* Queue Position */}
      {(order.status === "PAID" || order.status === "PREPARING") && order.queue_position && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Queue Position</p>
          <p className="text-5xl font-bold text-neutral-900 dark:text-white mb-2">#{order.queue_position}</p>
          {order.estimated_minutes && (
            <p className="text-neutral-600 dark:text-neutral-400">~{order.estimated_minutes} minutes</p>
          )}
          
          {/* Admin Contact - Show during waiting */}
          {canteenStatus && (canteenStatus.admin_name || canteenStatus.admin_phone) && (
            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">NEED HELP?</p>
              {canteenStatus.admin_name && (
                <p className="text-sm text-neutral-900 dark:text-white font-medium mb-1">{canteenStatus.admin_name}</p>
              )}
              {canteenStatus.admin_phone && (
                <a 
                  href={`tel:${canteenStatus.admin_phone}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-orange-300 font-medium transition-colors"
                >
                  <span>📞</span>
                  <span>{canteenStatus.admin_phone}</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pickup Code */}
      {order.pickup_code && (order.status === "PAID" || order.status === "PREPARING" || order.status === "READY") && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-green-500/30 p-6 text-center">
          <p className="text-sm text-green-400 mb-2">Pickup Code</p>
          <p className="text-6xl font-bold text-neutral-900 dark:text-white mb-3 font-mono tracking-wider">{order.pickup_code}</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Show this code to collect your order</p>
        </div>
      )}

      {/* Payment Section */}
      {order.status === "PAYMENT_PENDING" && order.payment && order.payment.method === "ONLINE" && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6">
          {/* Online Payment Display (QR code with UPI button) */}
          <QrCodePanel payload={order.payment.qr_payload} method={order.payment.method} />
          
          {timeLeft !== null && timeLeft > 0 && (
            <div className="text-center mb-4 mt-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Time remaining</p>
              <p className="text-3xl font-bold text-orange-500 font-mono">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </p>
            </div>
          )}
          
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          
          <button
            onClick={pay}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-neutral-900 dark:text-white font-bold transition-colors disabled:opacity-60 mt-4"
          >
            {loading ? "Verifying..." : "I have paid"}
          </button>
        </div>
      )}
      
      {/* Counter Payment Info - Show for all counter payment orders */}
      {order.payment?.method === "COUNTER" && order.status !== "COLLECTED" && order.status !== "DECLINED" && order.status !== "CANCELLED_TIMEOUT" && (
        <div className="rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-2 border-orange-500/30 p-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-4xl">🏪</span>
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Pay at Counter</h3>
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              Pay ₹{(order.total_amount_cents / 100).toFixed(2)} when you collect your order
            </p>
            {order.status === "REQUESTED" && (
              <div className="px-4 py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
                <p className="text-sm text-yellow-300">
                  ⏳ Waiting for canteen to accept your order
                </p>
              </div>
            )}
            {(order.status === "PAID" || order.status === "PREPARING" || order.status === "READY") && (
              <div className="px-4 py-3 rounded-xl bg-green-500/20 border border-green-500/30">
                <p className="text-sm text-green-300">
                  ✅ Order accepted! Don't forget to pay at counter
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Items</h3>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-neutral-900 dark:text-white">{item.menu_item_name || `Item #${item.menu_item_id}`}</span>
              <span className="text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                {item.quantity} × ₹{(item.unit_price_cents / 100).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <span className="font-semibold text-neutral-900 dark:text-white">Total</span>
            <span className="text-xl font-bold text-neutral-900 dark:text-white">₹{(order.total_amount_cents / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      {order.payment && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Payment</h3>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm border ${
              order.payment.method === "COUNTER" 
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}>
              {order.payment.method === "COUNTER" ? "🏪 Counter" : "💳 Online"}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm border ${
              order.payment.status === "SUCCESS" ? 'bg-green-500/20 text-green-400 border-green-500/30' :
              order.payment.status === "FAILED" ? 'bg-red-500/20 text-red-400 border-red-500/30' :
              order.payment.status === "EXPIRED" ? 'bg-neutral-700 text-neutral-400 border-neutral-600' :
              'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            }`}>
              {order.payment.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
