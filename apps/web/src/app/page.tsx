"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, getSocketUrl } from "@/lib/api";
import { Canteen, Order } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import StatusBadge from "@/components/StatusBadge";
import MessMenuCard from "@/components/MessMenuCard";

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

  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="max-w-md text-center space-y-6">
          <div className="text-6xl mb-4">
            <img src="/web_logo.png" alt="OffMess" className="w-24 h-24 mx-auto" />
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">
            OffMess
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Skip the queue. Order ahead.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-xl bg-orange-500 hover:bg-orange-600 px-8 py-3 text-neutral-900 dark:text-white font-medium transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Mess Menu Card */}
      <MessMenuCard hostelName={user?.hostel_name} />

      {/* Canteens Section - Mobile Optimized */}
      <div className="space-y-3 md:space-y-4">
        <h2 className="text-2xl md:text-xl font-black md:font-bold text-neutral-900 dark:text-white tracking-tight">
          Order Now
        </h2>
        
        <div className="grid gap-3 sm:grid-cols-2">
          {canteens.map((canteen) => (
            <Link
              key={canteen.id}
              href={`/canteens/${canteen.id}`}
              className={`group relative overflow-hidden rounded-3xl md:rounded-2xl transition-all active:scale-[0.98] md:active:scale-100 ${
                canteen.accepting_orders
                  ? "bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-900/80 shadow-lg shadow-neutral-200/50 dark:shadow-none border-2 border-transparent hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10"
                  : "bg-neutral-100 dark:bg-neutral-900/30 border-2 border-neutral-200 dark:border-neutral-800 opacity-60"
              }`}
            >
              {/* Gradient Overlay for Open Canteens */}
              {canteen.accepting_orders && (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              
              <div className="relative p-5 md:p-4">
                <div className="flex items-start justify-between gap-3 mb-4 md:mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-black md:font-bold text-xl md:text-lg mb-1.5 md:mb-1 truncate tracking-tight ${
                      canteen.accepting_orders 
                        ? 'text-neutral-900 dark:text-white' 
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}>
                      {canteen.name}
                    </h3>
                    <p className="text-sm md:text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                      {canteen.hours_open} - {canteen.hours_close}
                    </p>
                  </div>
                  <div className={`px-3 py-1.5 md:px-2.5 md:py-1 rounded-full text-xs font-bold md:font-medium whitespace-nowrap shadow-sm ${
                    canteen.accepting_orders
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}>
                    {canteen.accepting_orders ? '● OPEN' : '○ CLOSED'}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 md:gap-4 text-sm md:text-sm">
                  <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-semibold md:font-normal">
                    <span className="text-base md:text-sm">⚡</span>
                    <span>{canteen.avg_prep_minutes} min</span>
                  </div>
                  {canteen.accepting_orders && (
                    <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-semibold md:font-normal">
                      <span className="text-base md:text-sm">📦</span>
                      <span>{canteen.active_orders}/{canteen.max_orders}</span>
                    </div>
                  )}
                </div>
                
                {!canteen.can_accept_orders && canteen.accepting_orders && (
                  <div className="mt-3 px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-2 md:border border-orange-500/40">
                    <p className="text-xs font-bold md:font-medium text-orange-600 dark:text-orange-400">⚠️ At capacity</p>
                  </div>
                )}
                
                {canteen.accepting_orders && (
                  <div className="mt-4 md:hidden">
                    <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/30">
                      <span>View Menu</span>
                      <span>→</span>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Orders - Mobile Optimized */}
      {orders.length > 0 && (
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl md:text-xl font-black md:font-bold text-neutral-900 dark:text-white tracking-tight">
              Recent Orders
            </h2>
            <Link 
              href="/orders" 
              className="text-sm font-bold md:font-medium text-orange-500 hover:text-orange-600 flex items-center gap-1"
            >
              <span>View all</span>
              <span>→</span>
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-3xl md:rounded-2xl bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-900/80 border-2 border-neutral-200 dark:border-neutral-800 p-5 md:p-4 hover:border-orange-500/50 transition-all active:scale-[0.98] md:active:scale-100 shadow-lg shadow-neutral-200/50 dark:shadow-none hover:shadow-xl hover:shadow-orange-500/10"
              >
                <div className="flex items-start justify-between gap-3 mb-3 md:mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-black md:font-semibold text-lg md:text-base text-neutral-900 dark:text-white tracking-tight">
                      #{order.order_number}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate font-medium md:font-normal">
                      {canteenMap.get(order.canteen_id) || "Canteen"}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                
                {(order.status === "PAID" || order.status === "PREPARING") && order.queue_position && (
                  <div className="mb-3 md:mb-2 px-4 md:px-3 py-2.5 md:py-1.5 rounded-xl md:rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-2 md:border border-blue-500/40">
                    <p className="text-sm md:text-xs font-bold md:font-medium text-blue-600 dark:text-blue-400">
                      🔥 Queue #{order.queue_position}
                      {order.estimated_minutes && ` · ~${order.estimated_minutes} min`}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-3 md:pt-2 border-t-2 md:border-t border-neutral-200 dark:border-neutral-800">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400 font-semibold md:font-normal">
                    {order.items.length} item{order.items.length > 1 ? 's' : ''}
                  </span>
                  <span className="font-black md:font-bold text-xl md:text-base text-neutral-900 dark:text-white">
                    ₹{(order.total_amount_cents / 100).toFixed(2)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
