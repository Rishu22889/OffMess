"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, getSocketUrl } from "@/lib/api";
import { Canteen, Order } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import StatusBadge from "@/components/StatusBadge";

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  
  const canteenMap = useMemo(() => {
    const map = new Map<number, string>();
    canteens.forEach((canteen) => map.set(canteen.id, canteen.name));
    return map;
  }, [canteens]);

  const loadOrders = async () => {
    try {
      const data = await apiFetch<Order[]>("/orders");
      setOrders(data);
    } catch {
      setOrders([]);
    }
  };

  useEffect(() => {
    if (!user) return;
    apiFetch<Canteen[]>("/canteens").then(setCanteens).catch(() => setCanteens([]));
    loadOrders();
  }, [user]);

  // Enhanced polling connection as fallback for WebSocket issues
  useEffect(() => {
    if (!user) return;
    
    console.log("Setting up real-time updates for student orders");
    
    // Try WebSocket first, fallback to polling
    let ws: WebSocket | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const startPolling = () => {
      console.log("Using polling for real-time updates");
      setWsConnected(false);
      pollingInterval = setInterval(() => {
        loadOrders();
      }, 4000); // Poll every 4 seconds for students
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
              loadOrders();
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

  if (loading) {
    return <div className="text-xs sm:text-sm text-neutral-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="rounded-2xl sm:rounded-3xl bg-white p-6 sm:p-8 shadow-sm">
        <p className="text-xs sm:text-sm text-neutral-500">Please login to view your orders.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold">My Orders</h1>
      </div>
      <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4">
        {orders.length === 0 && <p className="text-xs sm:text-sm text-neutral-500">No orders yet.</p>}
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <p className="text-base sm:text-lg font-semibold">Order #{order.id}</p>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 mb-3">
                  {canteenMap.get(order.canteen_id) || "Canteen"} · {new Date(order.created_at).toLocaleDateString()}
                </p>
                
                <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-2 text-xs sm:text-sm">
                      <span className="text-gray-700 truncate">{item.menu_item_name || `Item ${item.menu_item_id}`}</span>
                      <span className="text-neutral-500 whitespace-nowrap">{item.quantity} × ₹{(item.unit_price_cents / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-sm sm:text-base font-semibold">Total</span>
                  <span className="text-base sm:text-lg font-semibold">₹{(order.total_amount_cents / 100).toFixed(2)}</span>
                </div>
                
                {order.payment && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-neutral-500">Payment:</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                      {order.payment.method.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.payment.status === "SUCCESS" ? "bg-green-100 text-green-800" :
                      order.payment.status === "FAILED" ? "bg-red-100 text-red-800" :
                      order.payment.status === "EXPIRED" ? "bg-gray-100 text-gray-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {order.payment.status}
                    </span>
                  </div>
                )}
                
                {order.pickup_code && (
                  <div className="mt-3 inline-block rounded-lg bg-green-50 px-3 py-2">
                    <p className="text-xs text-green-600">Pickup Code</p>
                    <p className="text-lg sm:text-xl font-bold text-green-800">{order.pickup_code}</p>
                  </div>
                )}
                
                {(order.status === "PAID" || order.status === "PREPARING") && order.queue_position && (
                  <div className="mt-3 inline-block rounded-lg bg-blue-50 px-3 py-2">
                    <p className="text-xs text-blue-600">Queue Position #{order.queue_position}</p>
                    {order.estimated_minutes && (
                      <p className="text-xs text-blue-700">~{order.estimated_minutes} min</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}