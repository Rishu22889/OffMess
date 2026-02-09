"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, getSocketUrl } from "@/lib/api";
import { Canteen, Order } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import StatusBadge from "@/components/StatusBadge";

interface CanteenWithStatus extends Canteen {
  is_open: boolean;
  accepting_orders: boolean;
  can_accept_orders: boolean;
  active_orders: number;
  max_orders: number;
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const [canteens, setCanteens] = useState<CanteenWithStatus[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const canteenMap = useMemo(() => {
    const map = new Map<number, string>();
    canteens.forEach((canteen) => map.set(canteen.id, canteen.name));
    return map;
  }, [canteens]);

  useEffect(() => {
    if (!user) return;
    
    const loadCanteens = async () => {
      try {
        const canteensList = await apiFetch<Canteen[]>("/canteens");
        
        // Load status for each canteen
        const canteensWithStatus = await Promise.all(
          canteensList.map(async (canteen) => {
            try {
              const status = await apiFetch<any>(`/canteens/${canteen.id}/status`);
              return {
                ...canteen,
                is_open: status.is_open,
                accepting_orders: status.accepting_orders,
                can_accept_orders: status.can_accept_orders,
                active_orders: status.active_orders,
                max_orders: status.max_orders,
              };
            } catch {
              return {
                ...canteen,
                is_open: false,
                accepting_orders: false,
                can_accept_orders: false,
                active_orders: 0,
                max_orders: 0,
              };
            }
          })
        );
        
        setCanteens(canteensWithStatus);
      } catch {
        setCanteens([]);
      }
    };
    
    loadCanteens();
    apiFetch<Order[]>("/orders").then(setOrders).catch(() => setOrders([]));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const ws = new WebSocket(getSocketUrl());
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type?.startsWith("order.")) {
          apiFetch<Order[]>("/orders").then(setOrders).catch(() => null);
        }
      } catch {
        return;
      }
    };
    return () => ws.close();
  }, [user]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-neutral-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-8 sm:p-12 shadow-2xl shadow-orange-500/30">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">Now Available</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 dark:text-white mb-4 leading-tight">
            Skip the queue.<br />
            <span className="text-orange-100">Order ahead.</span>
          </h1>
          <p className="text-base sm:text-lg text-orange-50 mb-8 leading-relaxed">
            Pre-order your meals from any campus canteen and pick up when ready. No more waiting in long lines!
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-white text-orange-600 font-semibold text-base sm:text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
          >
            <span>Get Started</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:gap-8 lg:grid-cols-[2fr,1fr]">
      <section className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">Available Canteens</h2>
            <p className="text-sm text-neutral-600 mt-1">IIT ISM Dhanbad</p>
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {canteens.map((canteen) => (
            <Link
              key={canteen.id}
              href={`/canteens/${canteen.id}`}
              className={`group relative overflow-hidden rounded-2xl border-2 p-5 sm:p-6 transition-all duration-300 ${
                canteen.accepting_orders
                  ? "border-orange-200 bg-gradient-to-br from-white via-orange-50/30 to-orange-100/40 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1"
                  : "border-neutral-200 bg-gray-50 opacity-75"
              }`}
            >
              {canteen.accepting_orders && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-transparent rounded-full blur-2xl"></div>
              )}
              
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className={`text-lg sm:text-xl font-bold mb-1 ${canteen.accepting_orders ? 'text-neutral-900 group-hover:text-orange-600' : 'text-neutral-600'}`}>
                      {canteen.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{canteen.hours_open} - {canteen.hours_close}</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                    canteen.accepting_orders
                      ? 'bg-green-100 text-green-700 shadow-sm'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${canteen.accepting_orders ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    {canteen.accepting_orders ? 'Open' : 'Closed'}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs sm:text-sm text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{canteen.avg_prep_minutes} min</span>
                  </div>
                  {canteen.accepting_orders && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{canteen.active_orders}/{canteen.max_orders} orders</span>
                    </div>
                  )}
                </div>
                
                {!canteen.can_accept_orders && canteen.accepting_orders && (
                  <div className="mt-3 px-3 py-1.5 rounded-lg bg-orange-100 border border-orange-200">
                    <p className="text-xs font-medium text-orange-700">⚠️ At capacity - try again soon</p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">Recent Orders</h2>
          {orders.length > 0 && (
            <Link href="/orders" className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1">
              <span>View All</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
        
        <div className="space-y-3">
          {recentOrders.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-neutral-600 font-medium">No orders yet</p>
              <p className="text-xs text-neutral-500 mt-1">Start by ordering from a canteen</p>
            </div>
          )}
          {recentOrders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block rounded-2xl border border-neutral-200 bg-white p-4 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/5 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-neutral-900">Order #{order.id}</p>
                  <p className="text-xs text-neutral-600 truncate mt-0.5">
                    {canteenMap.get(order.canteen_id) || "Canteen"}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              
              {(order.status === "PAID" || order.status === "PREPARING") && order.queue_position && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700">Queue Position #{order.queue_position}</p>
                  {order.estimated_minutes && (
                    <p className="text-xs text-blue-600 mt-0.5">~{order.estimated_minutes} min</p>
                  )}
                </div>
              )}
              
              <div className="space-y-1.5 mb-3">
                {order.items.slice(0, 2).map((item) => (
                  <div key={item.id} className="flex justify-between gap-2 text-xs">
                    <span className="text-gray-700 truncate">{item.menu_item_name || `Item ${item.menu_item_id}`}</span>
                    <span className="text-neutral-500 whitespace-nowrap font-medium">{item.quantity} × ₹{(item.unit_price_cents / 100).toFixed(2)}</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <p className="text-xs text-neutral-500">+{order.items.length - 2} more items</p>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs font-medium text-neutral-600">Total</span>
                <span className="text-base font-bold text-neutral-900">₹{(order.total_amount_cents / 100).toFixed(2)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
