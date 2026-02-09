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
    <div className="space-y-6">
      {/* Mess Menu Card */}
      <MessMenuCard hostelName={user?.hostel_name} />

      {/* Canteens Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Canteens</h2>
        
        <div className="grid gap-3 sm:grid-cols-2">
          {canteens.map((canteen) => (
            <Link
              key={canteen.id}
              href={`/canteens/${canteen.id}`}
              className={`group rounded-2xl border p-4 transition-all ${
                canteen.accepting_orders
                  ? "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-orange-500 shadow-sm"
                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-lg mb-1 truncate ${
                    canteen.accepting_orders 
                      ? 'text-neutral-900 dark:text-white group-hover:text-orange-500' 
                      : 'text-neutral-400 dark:text-neutral-500'
                  }`}>
                    {canteen.name}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {canteen.hours_open} - {canteen.hours_close}
                  </p>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  canteen.accepting_orders
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                }`}>
                  {canteen.accepting_orders ? '● Open' : '○ Closed'}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                <span>⚡ {canteen.avg_prep_minutes} min</span>
                {canteen.accepting_orders && (
                  <span>📦 {canteen.active_orders}/{canteen.max_orders}</span>
                )}
              </div>
              
              {!canteen.can_accept_orders && canteen.accepting_orders && (
                <div className="mt-3 px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/30">
                  <p className="text-xs font-medium text-orange-600 dark:text-orange-400">At capacity</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      {orders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Recent Orders</h2>
            <Link 
              href="/orders" 
              className="text-sm font-medium text-orange-500 hover:text-orange-600"
            >
              View all →
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 hover:border-orange-500 transition-colors shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      Order #{order.order_number}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                      {canteenMap.get(order.canteen_id) || "Canteen"}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                
                {(order.status === "PAID" || order.status === "PREPARING") && order.queue_position && (
                  <div className="mb-2 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      Queue #{order.queue_position}
                      {order.estimated_minutes && ` · ~${order.estimated_minutes} min`}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {order.items.length} item{order.items.length > 1 ? 's' : ''}
                  </span>
                  <span className="font-bold text-neutral-900 dark:text-white">
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
