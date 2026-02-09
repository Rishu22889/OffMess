"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, getSocketUrl } from "@/lib/api";
import { Order, OrderResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import OrderTimeline from "@/components/OrderTimeline";
import Countdown from "@/components/Countdown";
import QrCodePanel from "@/components/QrCodePanel";

export default function OrderDetailPage() {
  const params = useParams();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const orderId = Number(rawId);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const fetchOrder = async () => {
    try {
      const data = await apiFetch<Order>(`/orders/${orderId}`);
      setOrder(data);
    } catch {
      setOrder(null);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Enhanced WebSocket connection for real-time updates
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;
    
    const connect = () => {
      try {
        ws = new WebSocket(getSocketUrl());
        
        ws.onopen = () => {
          console.log("Order detail WebSocket connected");
          setWsConnected(true);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Order detail WebSocket message:", data);
            
            if (data.type?.startsWith("order.") && data.payload?.order_id === orderId) {
              // Instant reload only for this specific order
              fetchOrder();
            }
          } catch (err) {
            console.error("WebSocket message error:", err);
          }
        };
        
        ws.onclose = () => {
          console.log("Order detail WebSocket disconnected");
          setWsConnected(false);
          // Auto-reconnect after 2 seconds
          reconnectTimeout = setTimeout(connect, 2000);
        };
        
        ws.onerror = (error) => {
          console.log("Order detail WebSocket error, will retry");
          setWsConnected(false);
        };
      } catch (err) {
        console.log("WebSocket connection error, will retry");
        setWsConnected(false);
        // Retry connection after 5 seconds
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };
    
    connect();
    
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [orderId]);

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
    return <div className="rounded-2xl sm:rounded-3xl bg-white p-6 sm:p-8 shadow-sm">Loading order...</div>;
  }

  return (
    <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.2fr,1fr]">
      <section className="rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">Order #{order.id}</h1>
            <p className="text-xs sm:text-sm text-neutral-500">Total ₹{(order.total_amount_cents / 100).toFixed(2)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6">
          {order.status === "DECLINED" && (
            <div className="rounded-xl sm:rounded-2xl border border-red-200 bg-red-50 p-3 sm:p-4 text-xs sm:text-sm text-red-700">
              Declined: {order.decline_reason || "No reason provided"}
            </div>
          )}
          {order.status === "CANCELLED_TIMEOUT" && (
            <div className="rounded-xl sm:rounded-2xl border border-neutral-200 bg-gray-50 p-3 sm:p-4 text-xs sm:text-sm text-gray-700">
              Payment window expired. Please place a new order.
            </div>
          )}
          <OrderTimeline status={order.status} />
          <div className="rounded-xl sm:rounded-2xl border border-gray-100 p-3 sm:p-4">
            <h3 className="text-sm font-semibold">Items</h3>
            <div className="mt-2 grid gap-2 text-xs sm:text-sm">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{item.menu_item_name || `Item #${item.menu_item_id}`}</span>
                  <span className="whitespace-nowrap">
                    {item.quantity} × ₹{(item.unit_price_cents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {order.payment && (
            <div className="rounded-xl sm:rounded-2xl border border-gray-100 p-3 sm:p-4">
              <h3 className="text-sm font-semibold">Payment Details</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm text-neutral-600">Method:</span>
                <span className="text-xs sm:text-sm px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  UPI QR Code
                </span>
                <span className="text-xs sm:text-sm text-neutral-600">Status:</span>
                <span className={`text-xs sm:text-sm px-2 py-1 rounded-full ${
                  order.payment.status === "SUCCESS" ? "bg-green-100 text-green-800" :
                  order.payment.status === "FAILED" ? "bg-red-100 text-red-800" :
                  order.payment.status === "EXPIRED" ? "bg-gray-100 text-gray-800" :
                  "bg-yellow-100 text-yellow-800"
                }`}>
                  {order.payment.status}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="grid gap-3 sm:gap-4 lg:sticky lg:top-4 lg:self-start">
        {order.status === "PAYMENT_PENDING" && order.payment?.qr_payload && order.payment_expires_at && (
          <>
            <QrCodePanel payload={order.payment.qr_payload} method={order.payment.method} />
            <Countdown expiresAt={order.payment_expires_at} />
            {error && <p className="text-xs sm:text-sm text-red-600">{error}</p>}
            <button
              onClick={pay}
              disabled={loading}
              className="rounded-xl bg-black px-4 py-3 text-sm sm:text-base text-neutral-900 dark:text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? "Processing..." : "I have paid"}
            </button>
          </>
        )}
        {(order.status === "PAID" || order.status === "PREPARING") && order.pickup_code && (
          <div className="rounded-2xl sm:rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
            <p className="text-xs sm:text-sm text-emerald-700">Pickup code</p>
            <p className="text-3xl sm:text-4xl font-semibold text-emerald-800">{order.pickup_code}</p>
            <p className="mt-2 text-xs text-emerald-700">Provide this code to the canteen staff at pickup.</p>
          </div>
        )}
        {order.status === "READY" && order.pickup_code && (
          <div className="rounded-2xl sm:rounded-3xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6">
            <p className="text-xs sm:text-sm text-indigo-700">Ready for pickup</p>
            <p className="text-3xl sm:text-4xl font-semibold text-indigo-800">{order.pickup_code}</p>
            <p className="mt-2 text-xs text-indigo-700">Provide this code to the canteen staff for collection.</p>
          </div>
        )}
        
        {(order.status === "PAID" || order.status === "PREPARING") && order.queue_position && (
          <div className="rounded-2xl sm:rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
            <p className="text-xs sm:text-sm text-blue-700">Queue Position</p>
            <p className="text-3xl sm:text-4xl font-semibold text-blue-800">#{order.queue_position}</p>
            {order.estimated_minutes && (
              <p className="text-xs sm:text-sm text-blue-600 mt-2">
                Estimated time: ~{order.estimated_minutes} minutes
              </p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
