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
    <div className="pb-28 md:pb-24">
      {/* Header - Mobile Optimized */}
      <div className="mb-5 md:mb-6">
        <h1 className="text-3xl md:text-3xl font-black md:font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">
          {canteen?.name || "Menu"}
        </h1>
        <div className="flex items-center gap-3 md:gap-4 text-sm text-neutral-600 dark:text-neutral-400 font-semibold md:font-normal">
          <span className="flex items-center gap-1.5">
            <span className="text-base md:text-sm">🕐</span>
            {canteen?.hours_open} - {canteen?.hours_close}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-base md:text-sm">⚡</span>
            {canteen?.avg_prep_minutes} min
          </span>
        </div>
        
        {canteenStatus && (
          <div className="mt-4 md:mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`px-4 md:px-3 py-2 md:py-1.5 rounded-full text-sm font-bold md:font-medium shadow-sm ${
                canteenStatus.accepting_orders 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
              }`}>
                {canteenStatus.accepting_orders ? '● OPEN NOW' : '○ CLOSED'}
              </div>
              {canteenStatus.accepting_orders && (
                <span className="text-sm text-neutral-600 dark:text-neutral-500 font-semibold md:font-normal">
                  {canteenStatus.active_orders}/{canteenStatus.max_orders} orders
                </span>
              )}
            </div>
            
            {/* Admin Contact Info */}
            {(canteenStatus.admin_name || canteenStatus.admin_phone) && (
              <div className="p-4 md:p-4 rounded-2xl md:rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-2 md:border border-orange-500/30">
                <p className="text-xs font-black md:font-semibold text-orange-600 dark:text-orange-400 mb-2 tracking-wide">
                  📞 CANTEEN CONTACT
                </p>
                {canteenStatus.admin_name && (
                  <p className="text-sm text-neutral-900 dark:text-white font-bold md:font-medium mb-1.5 md:mb-1">
                    {canteenStatus.admin_name}
                  </p>
                )}
                {canteenStatus.admin_phone && (
                  <a 
                    href={`tel:${canteenStatus.admin_phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl md:rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold md:font-medium transition-all active:scale-95 shadow-lg shadow-orange-500/30"
                  >
                    <span className="text-base md:text-sm">📱</span>
                    <span>{canteenStatus.admin_phone}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Menu Grid - Mobile Optimized */}
      <div className="grid gap-3 md:gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {menu.map((item) => {
          const selected = cart.some((c) => c.menu_item_id === item.id);
          const isAvailable = item.is_available;
          const cartItem = cart.find((c) => c.menu_item_id === item.id);
          
          return (
            <div
              key={item.id}
              className={`rounded-3xl md:rounded-2xl p-5 md:p-4 transition-all ${
                !isAvailable 
                  ? "border-2 border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/50 opacity-50" 
                  : selected 
                    ? "border-2 border-orange-500 bg-gradient-to-br from-orange-500/10 to-orange-600/10 shadow-lg shadow-orange-500/20" 
                    : "border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-orange-500/50 shadow-lg shadow-neutral-200/50 dark:shadow-none active:scale-[0.98] md:active:scale-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-black md:font-semibold text-lg md:text-base text-neutral-900 dark:text-white tracking-tight leading-tight">
                  {item.name}
                </h3>
                {!isAvailable && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-500 border-2 border-red-500/30 whitespace-nowrap">
                    OUT
                  </span>
                )}
              </div>
              
              <p className="text-2xl md:text-xl font-black md:font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent mb-4">
                ₹{(item.price_cents / 100).toFixed(2)}
              </p>
              
              {isAvailable && !selected && (
                <button
                  onClick={() => toggleItem(item)}
                  className="w-full py-3 md:py-2.5 rounded-2xl md:rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black md:font-medium transition-all active:scale-95 shadow-lg shadow-orange-500/30 text-base md:text-sm"
                >
                  Add to Cart
                </button>
              )}
              
              {isAvailable && selected && cartItem && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-3 bg-white dark:bg-neutral-800 rounded-2xl md:rounded-xl p-2.5 md:p-2 shadow-inner">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg bg-gradient-to-br from-neutral-700 to-neutral-800 hover:from-neutral-600 hover:to-neutral-700 text-white font-black md:font-bold flex items-center justify-center transition-all active:scale-90 shadow-lg text-xl md:text-base"
                    >
                      −
                    </button>
                    <span className="text-2xl md:text-lg font-black md:font-bold text-neutral-900 dark:text-white min-w-[3rem] md:min-w-[2rem] text-center">
                      {cartItem.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black md:font-bold flex items-center justify-center transition-all active:scale-90 shadow-lg text-xl md:text-base"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => toggleItem(item)}
                    className="w-full py-2.5 md:py-2 rounded-2xl md:rounded-xl border-2 border-red-500/40 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold md:font-medium transition-all active:scale-95 text-sm"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Cart Button - Circular in Corner */}
      {cart.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 w-16 h-16 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black shadow-2xl shadow-orange-500/50 transition-all active:scale-90 border-2 border-orange-400 flex items-center justify-center"
        >
          <div className="relative">
            <span className="text-3xl md:text-2xl">🛒</span>
            <span className="absolute -top-2 -right-2 w-6 h-6 md:w-5 md:h-5 rounded-full bg-white text-orange-500 text-xs font-black flex items-center justify-center shadow-lg border-2 border-orange-500">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
        </button>
      )}

      {/* Cart Modal - Centered Floating */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0 animate-fade-in">
          <div 
            className="absolute inset-0 bg-black/60 md:bg-black/80 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          ></div>
          
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl md:rounded-3xl shadow-2xl max-h-[85vh] md:max-h-[90vh] flex flex-col border-2 border-orange-500 animate-scale-in">
            {/* Header - Gradient */}
            <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 p-5 md:p-6 rounded-t-3xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl md:text-2xl font-black text-white tracking-tight">
                  Your Cart
                </h2>
                <button
                  onClick={() => setCartOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-90"
                >
                  <span className="text-xl text-white font-bold">✕</span>
                </button>
              </div>
              <p className="text-sm text-white/95 font-semibold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items · ₹{(total / 100).toFixed(2)}
              </p>
            </div>

            {/* Cart Items - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50 dark:bg-neutral-900">
              <p className="text-xs font-black md:font-semibold text-neutral-600 dark:text-neutral-400 uppercase px-2 tracking-wider">
                Items in Cart
              </p>
              {cart.map((item) => (
                <div key={item.menu_item_id} className="rounded-2xl md:rounded-xl border-2 md:border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 md:p-3 shadow-sm">
                  <div className="flex items-start gap-3 mb-3 md:mb-2">
                    <div className="flex-1">
                      <h3 className="font-black md:font-semibold text-base md:text-sm text-neutral-900 dark:text-white tracking-tight">
                        {item.name}
                      </h3>
                      <p className="text-orange-500 font-black md:font-bold text-base md:text-sm mt-1">
                        ₹{(item.price_cents / 100).toFixed(2)} each
                      </p>
                    </div>
                    <button
                      onClick={() => toggleItem({ id: item.menu_item_id, name: item.name, price_cents: item.price_cents, is_available: true } as MenuItem)}
                      className="w-9 h-9 md:w-7 md:h-7 rounded-xl md:rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 flex items-center justify-center transition-all active:scale-90 flex-shrink-0 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 rounded-xl md:rounded-lg p-2 md:p-1.5">
                      <button
                        onClick={() => updateQty(item.menu_item_id, -1)}
                        className="w-9 h-9 md:w-7 md:h-7 rounded-lg md:rounded-md bg-neutral-700 hover:bg-neutral-600 text-white font-black md:font-bold flex items-center justify-center transition-all active:scale-90"
                      >
                        −
                      </button>
                      <span className="text-xl md:text-base font-black md:font-bold text-neutral-900 dark:text-white min-w-[3rem] md:min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.menu_item_id, 1)}
                        className="w-9 h-9 md:w-7 md:h-7 rounded-lg md:rounded-md bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black md:font-bold flex items-center justify-center transition-all active:scale-90"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-600 dark:text-neutral-500 font-semibold md:font-normal">
                        Subtotal
                      </p>
                      <p className="text-xl md:text-base font-black md:font-bold text-neutral-900 dark:text-white">
                        ₹{((item.price_cents * item.quantity) / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer - Checkout */}
            <div className="flex-shrink-0 bg-white dark:bg-neutral-900 border-t-2 border-neutral-200 dark:border-neutral-800 p-4 space-y-3 rounded-b-3xl">
              {/* Total */}
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/80 rounded-2xl border-2 md:border border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-700 dark:text-neutral-300 font-black md:font-medium text-base">
                  Total Amount
                </span>
                <span className="text-2xl md:text-2xl font-black bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  ₹{(total / 100).toFixed(2)}
                </span>
              </div>
              
              {error && (
                <div className="px-4 py-3 rounded-2xl md:rounded-xl bg-red-500/20 border-2 md:border border-red-500/30">
                  <p className="text-sm font-bold md:font-medium text-red-500">
                    {error}
                  </p>
                </div>
              )}
              
              {/* Place Order Button */}
              <button
                onClick={placeOrder}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-lg shadow-2xl shadow-orange-500/40 transition-all disabled:opacity-60 active:scale-[0.98] border-2 border-orange-400"
              >
                {loading ? "Placing Order..." : "Place Order →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
