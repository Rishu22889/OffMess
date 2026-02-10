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
    
    if (!menuItem.is_available) {
      setError("This item is currently out of stock.");
      return;
    }
    
    const exists = cart.find((c) => c.menu_item_id === menuItem.id);
    // Removed max items limit - students can add as many items as they want
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
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }  // No upper limit, minimum 1
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
        payment_method: "ONLINE", // Always use UPI payment
      };
      const res = await apiFetch<OrderResponse>("/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Redirect directly to order page
      router.push(`/orders/${res.order.id}`);
    } catch (err) {
      setError("Unable to place order. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Login to view the menu.</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">{canteen?.name || "Menu"}</h1>
        <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
          <span>{canteen?.hours_open} - {canteen?.hours_close}</span>
          <span>•</span>
          <span>{canteen?.avg_prep_minutes} min prep</span>
        </div>
        
        {canteenStatus && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                canteenStatus.accepting_orders 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {canteenStatus.accepting_orders ? '● Open' : '○ Closed'}
              </div>
              {canteenStatus.accepting_orders && (
                <span className="text-sm text-neutral-600 dark:text-neutral-500">
                  {canteenStatus.active_orders}/{canteenStatus.max_orders} orders
                </span>
              )}
            </div>
            
            {/* Admin Contact Info */}
            {(canteenStatus.admin_name || canteenStatus.admin_phone) && (
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">CANTEEN CONTACT</p>
                {canteenStatus.admin_name && (
                  <p className="text-sm text-neutral-900 dark:text-white font-medium mb-1">{canteenStatus.admin_name}</p>
                )}
                {canteenStatus.admin_phone && (
                  <a 
                    href={`tel:${canteenStatus.admin_phone}`}
                    className="inline-flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors"
                  >
                    <span>📞</span>
                    <span>{canteenStatus.admin_phone}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Menu Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {menu.map((item) => {
          const selected = cart.some((c) => c.menu_item_id === item.id);
          const isAvailable = item.is_available;
          const cartItem = cart.find((c) => c.menu_item_id === item.id);
          
          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 transition-all ${
                !isAvailable 
                  ? "border-neutral-800 bg-neutral-900/50 opacity-50" 
                  : selected 
                    ? "border-orange-500/50 bg-neutral-900" 
                    : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-neutral-900 dark:text-white">{item.name}</h3>
                {!isAvailable && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                    Out
                  </span>
                )}
              </div>
              
              <p className="text-xl font-bold text-orange-500 mb-4">
                ₹{(item.price_cents / 100).toFixed(2)}
              </p>
              
              {isAvailable && !selected && (
                <button
                  onClick={() => toggleItem(item)}
                  className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-neutral-900 dark:text-white font-medium transition-colors"
                >
                  Add
                </button>
              )}
              
              {isAvailable && selected && cartItem && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl p-2">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-8 h-8 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-900 dark:text-white font-bold flex items-center justify-center transition-colors"
                    >
                      −
                    </button>
                    <span className="text-lg font-bold text-neutral-900 dark:text-white min-w-[2rem] text-center">{cartItem.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-8 h-8 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-900 dark:text-white font-bold flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => toggleItem(item)}
                    className="w-full py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-medium transition-colors text-sm"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-24 md:bottom-6 right-6 z-40 flex items-center gap-3 px-6 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-neutral-900 dark:text-white font-bold shadow-2xl transition-all"
        >
          <div className="relative">
            <span className="text-2xl">🛒</span>
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-orange-500 text-xs font-black flex items-center justify-center">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm">Cart</div>
            <div className="text-xs opacity-90">₹{(total / 100).toFixed(2)}</div>
          </div>
        </button>
      )}

      {/* Cart Modal */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          ></div>
          
          <div className="relative w-full sm:w-[550px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-t-3xl sm:rounded-t-3xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Your Cart</h2>
                <button
                  onClick={() => setCartOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <span className="text-xl text-neutral-900 dark:text-white">✕</span>
                </button>
              </div>
              <p className="text-sm text-neutral-900 dark:text-white/90">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items · ₹{(total / 100).toFixed(2)}
              </p>
            </div>

            {/* Cart Items - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-neutral-900">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase px-2">Items in Cart</p>
              {cart.map((item) => (
                <div key={item.menu_item_id} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-3">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-neutral-900 dark:text-white text-sm">{item.name}</h3>
                      <p className="text-orange-400 font-bold text-sm">₹{(item.price_cents / 100).toFixed(2)} each</p>
                    </div>
                    <button
                      onClick={() => toggleItem({ id: item.menu_item_id, name: item.name, price_cents: item.price_cents, is_available: true } as MenuItem)}
                      className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 rounded-lg p-1.5">
                      <button
                        onClick={() => updateQty(item.menu_item_id, -1)}
                        className="w-7 h-7 rounded-md bg-neutral-700 hover:bg-neutral-600 text-neutral-900 dark:text-white font-bold flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <span className="text-base font-bold text-neutral-900 dark:text-white min-w-[2rem] text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.menu_item_id, 1)}
                        className="w-7 h-7 rounded-md bg-neutral-700 hover:bg-neutral-600 text-neutral-900 dark:text-white font-bold flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-600 dark:text-neutral-500">Subtotal</p>
                      <p className="text-base font-bold text-neutral-900 dark:text-white">₹{((item.price_cents * item.quantity) / 100).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer - Checkout */}
            <div className="flex-shrink-0 bg-white dark:bg-neutral-900 border-t-2 border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
              {/* Total */}
              <div className="flex items-center justify-between px-2 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                <span className="text-neutral-600 dark:text-neutral-400 font-medium">Total Amount</span>
                <span className="text-2xl font-bold text-neutral-900 dark:text-white">₹{(total / 100).toFixed(2)}</span>
              </div>
              
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30">
                  <p className="text-sm font-medium text-red-400">{error}</p>
                </div>
              )}
              
              {/* Place Order Button */}
              <button
                onClick={placeOrder}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-neutral-900 dark:text-white font-bold text-lg shadow-lg transition-all disabled:opacity-60"
              >
                {loading ? "Placing Order..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
