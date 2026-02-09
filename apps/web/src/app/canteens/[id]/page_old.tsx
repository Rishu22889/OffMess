"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Canteen, MenuItem, OrderResponse } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

interface CartItem {
  menu_item_id: number;
  name: string;
  price_cents: number;
  quantity: number;
}

interface CanteenStatus {
  is_open: boolean;
  accepting_orders: boolean;
  current_time: string;
  hours_open: string;
  hours_close: string;
  active_orders: number;
  max_orders: number;
  can_accept_orders: boolean;
  admin_name?: string | null;
  admin_phone?: string | null;
}

export default function CanteenMenuPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const canteenId = Number(rawId);
  const [canteen, setCanteen] = useState<Canteen | null>(null);
  const [canteenStatus, setCanteenStatus] = useState<CanteenStatus | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiFetch<Canteen[]>("/canteens")
      .then((items) => setCanteen(items.find((c) => c.id === canteenId) || null))
      .catch(() => setCanteen(null));
    // Get ALL menu items, not just available ones
    apiFetch<MenuItem[]>(`/canteens/${canteenId}/menu`)
      .then(setMenu)
      .catch(() => setMenu([]));
    apiFetch<CanteenStatus>(`/canteens/${canteenId}/status`)
      .then(setCanteenStatus)
      .catch(() => setCanteenStatus(null));
  }, [canteenId, user]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
    [cart]
  );

  const toggleItem = (menuItem: MenuItem) => {
    setError(null);
    
    // Don't allow adding unavailable items
    if (!menuItem.is_available) {
      setError("This item is currently out of stock.");
      return;
    }
    
    const exists = cart.find((c) => c.menu_item_id === menuItem.id);
    if (!exists && cart.length >= 3) {
      setError("Max 3 items per order.");
      return;
    }
    if (!exists) {
      setCart([...cart, { menu_item_id: menuItem.id, name: menuItem.name, price_cents: menuItem.price_cents, quantity: 1 }]);
    } else {
      setCart(cart.filter((c) => c.menu_item_id !== menuItem.id));
    }
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.menu_item_id === id
          ? { ...item, quantity: Math.max(1, Math.min(3, item.quantity + delta)) }
          : item
      )
    );
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      setError("Add at least one item.");
      return;
    }
    if (canteenStatus && !canteenStatus.can_accept_orders) {
      if (!canteenStatus.accepting_orders) {
        setError("Canteen is not accepting orders at this time.");
      } else {
        setError("Canteen is at maximum capacity. Please try again later.");
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        canteen_id: canteenId,
        items: cart.map((item) => ({ menu_item_id: item.menu_item_id, quantity: item.quantity })),
      };
      const res = await apiFetch<OrderResponse>("/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/orders/${res.order.id}`);
    } catch (err) {
      setError("Unable to place order. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Login to view the menu.</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Menu Section */}
      <section className="rounded-3xl bg-gradient-to-br from-white to-gray-50 border-2 border-neutral-200 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-3xl">🍽️</span>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900">{canteen?.name || "Canteen"}</h1>
              <p className="text-sm text-neutral-600 mt-1">
                ⏰ {canteen?.hours_open} - {canteen?.hours_close} · ⏱️ Avg prep {canteen?.avg_prep_minutes} min
              </p>
            </div>
          </div>
          
          {canteenStatus && (
            <div className="rounded-2xl border-2 border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                  canteenStatus.accepting_orders 
                    ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                    : 'bg-red-100 text-red-800 border-2 border-red-300'
                }`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${canteenStatus.accepting_orders ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  {canteenStatus.accepting_orders ? '✅ Open for Orders' : '🛑 Closed'}
                </div>
                <span className="text-sm text-neutral-600 font-medium">
                  🕐 {canteenStatus.current_time}
                </span>
                <span className="text-sm text-neutral-600 font-medium">
                  📦 {canteenStatus.active_orders}/{canteenStatus.max_orders} orders
                </span>
              </div>
              
              {/* Admin Contact Information */}
              {(canteenStatus.admin_name || canteenStatus.admin_phone) && (
                <div className="mt-3 pt-3 border-t border-neutral-200 flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                  <span className="font-semibold text-gray-700">📞 Contact:</span>
                  {canteenStatus.admin_name && (
                    <span className="text-neutral-900 font-medium">{canteenStatus.admin_name}</span>
                  )}
                  {canteenStatus.admin_phone && (
                    <a 
                      href={`tel:${canteenStatus.admin_phone}`} 
                      className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                    >
                      {canteenStatus.admin_phone}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Menu Items Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menu.map((item) => {
            const selected = cart.some((c) => c.menu_item_id === item.id);
            const isAvailable = item.is_available;
            const cartItem = cart.find((c) => c.menu_item_id === item.id);
            
            return (
              <div
                key={item.id}
                className={`rounded-2xl border-2 p-5 transition-all ${
                  !isAvailable 
                    ? "border-neutral-200 bg-gray-50 opacity-60" 
                    : selected 
                      ? "border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg shadow-orange-500/20" 
                      : "border-neutral-200 bg-white hover:border-orange-300 hover:shadow-lg"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-lg font-bold text-neutral-900">{item.name}</h3>
                  {!isAvailable && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 whitespace-nowrap">
                      ❌ Out of Stock
                    </span>
                  )}
                  {selected && isAvailable && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-neutral-900 dark:text-white whitespace-nowrap">
                      ✓ Added
                    </span>
                  )}
                </div>
                
                <p className={`text-2xl font-black mb-4 ${!isAvailable ? 'text-gray-400' : 'text-orange-600'}`}>
                  ₹{(item.price_cents / 100).toFixed(2)}
                </p>
                
                {isAvailable && !selected && (
                  <button
                    onClick={() => toggleItem(item)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-neutral-900 dark:text-white font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all transform hover:scale-105"
                  >
                    ➕ Add to Cart
                  </button>
                )}
                
                {isAvailable && selected && cartItem && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-3 bg-white rounded-xl p-2 border-2 border-orange-300">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-10 h-10 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-xl flex items-center justify-center transition-all"
                      >
                        −
                      </button>
                      <span className="text-2xl font-black text-neutral-900 min-w-[3rem] text-center">{cartItem.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-10 h-10 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-xl flex items-center justify-center transition-all"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => toggleItem(item)}
                      className="w-full py-2 rounded-xl border-2 border-red-300 text-red-600 hover:bg-red-50 font-semibold transition-all"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-neutral-900 dark:text-white font-bold shadow-2xl shadow-orange-500/50 hover:shadow-orange-500/70 transition-all transform hover:scale-110 animate-bounce-subtle"
        >
          <div className="relative">
            <span className="text-2xl">🛒</span>
            <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-neutral-900 dark:text-white text-xs font-black flex items-center justify-center border-2 border-white">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold">View Cart</div>
            <div className="text-xs opacity-90">₹{(total / 100).toFixed(2)}</div>
          </div>
        </button>
      )}

      {/* Cart Modal/Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          ></div>
          
          {/* Cart Panel */}
          <div className="relative w-full sm:w-[500px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-neutral-900 dark:text-white">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-black">🛒 Your Cart</h2>
                <button
                  onClick={() => setCartOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>
              <p className="text-sm opacity-90">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items · ₹{(total / 100).toFixed(2)}
              </p>
            </div>

            {/* Cart Items */}
            <div className="overflow-y-auto max-h-[calc(85vh-220px)] sm:max-h-[calc(90vh-220px)] p-6 space-y-4">
              {cart.map((item) => (
                <div key={item.menu_item_id} className="rounded-2xl border-2 border-neutral-200 bg-gradient-to-br from-white to-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-neutral-900 text-lg">{item.name}</h3>
                      <p className="text-orange-600 font-bold text-xl">₹{(item.price_cents / 100).toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => toggleItem({ id: item.menu_item_id, name: item.name, price_cents: item.price_cents, is_available: true } as MenuItem)}
                      className="w-9 h-9 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 bg-white rounded-xl p-2 border-2 border-neutral-200">
                      <button
                        onClick={() => updateQty(item.menu_item_id, -1)}
                        className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center transition-all"
                      >
                        −
                      </button>
                      <span className="text-xl font-black text-neutral-900 min-w-[2.5rem] text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.menu_item_id, 1)}
                        className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center transition-all"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-600">Subtotal</p>
                      <p className="text-lg font-black text-neutral-900">₹{((item.price_cents * item.quantity) / 100).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t-2 border-neutral-200 p-6 space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold text-gray-700">Total Amount</span>
                <span className="text-3xl font-black text-orange-600">₹{(total / 100).toFixed(2)}</span>
              </div>
              
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200">
                  <p className="text-sm font-semibold text-red-800">{error}</p>
                </div>
              )}
              
              <button
                onClick={placeOrder}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-neutral-900 dark:text-white font-black text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
              >
                {loading ? "⏳ Placing Order..." : "🎉 Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
