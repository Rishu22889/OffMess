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
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<string>("ALL");
  const [priceRange, setPriceRange] = useState<string>("ALL");
  const [canteenFilter, setCanteenFilter] = useState<number | "ALL">("ALL");
  
  const canteenMap = useMemo(() => {
    const map = new Map<number, string>();
    canteens.forEach((canteen) => map.set(canteen.id, canteen.name));
    return map;
  }, [canteens]);

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Date range filter
      if (dateRange !== "ALL") {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        
        if (dateRange === "TODAY") {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (orderDate < today) return false;
        } else if (dateRange === "WEEK") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (orderDate < weekAgo) return false;
        } else if (dateRange === "MONTH") {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (orderDate < monthAgo) return false;
        } else if (dateRange === "3MONTHS") {
          const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          if (orderDate < threeMonthsAgo) return false;
        }
      }
      
      // Price range filter
      if (priceRange !== "ALL") {
        const price = order.total_amount_cents / 100;
        
        if (priceRange === "0-50" && (price < 0 || price > 50)) return false;
        if (priceRange === "50-100" && (price < 50 || price > 100)) return false;
        if (priceRange === "100-200" && (price < 100 || price > 200)) return false;
        if (priceRange === "200+" && price < 200) return false;
      }
      
      // Canteen filter
      if (canteenFilter !== "ALL" && order.canteen_id !== canteenFilter) {
        return false;
      }
      
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const orderNumberMatch = order.order_number?.toLowerCase().includes(query);
        const canteenMatch = canteenMap.get(order.canteen_id)?.toLowerCase().includes(query);
        const itemsMatch = order.items.some(item => 
          item.menu_item_name?.toLowerCase().includes(query)
        );
        const priceMatch = (order.total_amount_cents / 100).toFixed(2).includes(query);
        
        if (!orderNumberMatch && !canteenMatch && !itemsMatch && !priceMatch) {
          return false;
        }
      }
      
      return true;
    });
  }, [orders, dateRange, priceRange, canteenFilter, searchQuery, canteenMap]);

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

  useEffect(() => {
    if (!user) return;
    
    let ws: WebSocket | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const startPolling = () => {
      pollingInterval = setInterval(() => {
        loadOrders();
      }, 4000);
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
            if (data.type?.startsWith("order.")) {
              loadOrders();
            }
          } catch (err) {
            console.error("WebSocket message error:", err);
          }
        };
        
        ws.onclose = () => {
          startPolling();
        };
        
        ws.onerror = () => {
          startPolling();
        };
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Please login to view your orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">My Orders</h1>
      
      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by order #, canteen, items, or price..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 dark:text-neutral-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date Range Filter */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
              <option value="3MONTHS">Last 3 Months</option>
            </select>
          </div>
          
          {/* Price Range Filter */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
              Price Range
            </label>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="ALL">All Prices</option>
              <option value="0-50">₹0 - ₹50</option>
              <option value="50-100">₹50 - ₹100</option>
              <option value="100-200">₹100 - ₹200</option>
              <option value="200+">₹200+</option>
            </select>
          </div>
          
          {/* Canteen Filter */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
              Canteen
            </label>
            <select
              value={canteenFilter}
              onChange={(e) => setCanteenFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="ALL">All Canteens</option>
              {canteens.map((canteen) => (
                <option key={canteen.id} value={canteen.id}>
                  {canteen.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Clear Filters Button */}
          {(searchQuery || dateRange !== "ALL" || priceRange !== "ALL" || canteenFilter !== "ALL") && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setDateRange("ALL");
                  setPriceRange("ALL");
                  setCanteenFilter("ALL");
                }}
                className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
        
        {/* Results Count */}
        {orders.length > 0 && (
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        )}
      </div>
      
      {orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 p-12 text-center">
          <div className="text-5xl mb-3">📦</div>
          <p className="font-medium text-neutral-900 dark:text-white">No orders yet</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Start by ordering from a canteen</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 p-12 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-medium text-neutral-900 dark:text-white">No orders found</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 hover:border-orange-500 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-neutral-900 dark:text-white">
                    Order #{order.order_number}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                    {canteenMap.get(order.canteen_id) || "Canteen"} · {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              
              {(order.status === "PAID" || order.status === "PREPARING") && order.queue_position && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                  <p className="text-xs font-semibold text-blue-400">
                    Queue Position #{order.queue_position}
                    {order.estimated_minutes && ` · ~${order.estimated_minutes} min`}
                  </p>
                </div>
              )}
              
              <div className="space-y-1.5 mb-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-2 text-sm">
                    <span className="text-neutral-700 dark:text-neutral-300 truncate">
                      {item.menu_item_name || `Item ${item.menu_item_id}`}
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {item.quantity} × ₹{(item.unit_price_cents / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total</span>
                <span className="text-lg font-bold text-neutral-900 dark:text-white">
                  ₹{(order.total_amount_cents / 100).toFixed(2)}
                </span>
              </div>
              
              {order.payment && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">Payment:</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {order.payment.method.replace('_', ' ')}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    order.payment.status === "SUCCESS" 
                      ? "bg-green-500/20 text-green-400 border-green-500/30" :
                    order.payment.status === "FAILED" 
                      ? "bg-red-500/20 text-red-400 border-red-500/30" :
                    order.payment.status === "EXPIRED" 
                      ? "bg-neutral-700 text-neutral-400 border-neutral-600" :
                      "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  }`}>
                    {order.payment.status}
                  </span>
                </div>
              )}
              
              {order.pickup_code && (
                <div className="mt-3 inline-block rounded-lg bg-green-500/20 border border-green-500/30 px-3 py-2">
                  <p className="text-xs text-green-400">Pickup Code</p>
                  <p className="text-xl font-bold text-green-300">{order.pickup_code}</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
