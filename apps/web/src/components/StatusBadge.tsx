import clsx from "clsx";
import { OrderStatus } from "@/lib/types";

const colors: Record<OrderStatus, string> = {
  REQUESTED: "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-500 border-yellow-500/40 shadow-sm shadow-yellow-500/20",
  DECLINED: "bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-500 border-red-500/40 shadow-sm shadow-red-500/20",
  PAYMENT_PENDING: "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-500 border-orange-500/40 shadow-sm shadow-orange-500/20",
  PAID: "bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-500 border-green-500/40 shadow-sm shadow-green-500/20",
  PREPARING: "bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-500 border-blue-500/40 shadow-sm shadow-blue-500/20",
  READY: "bg-gradient-to-r from-indigo-500/20 to-indigo-600/20 text-indigo-500 border-indigo-500/40 shadow-sm shadow-indigo-500/20",
  COLLECTED: "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600",
  CANCELLED_TIMEOUT: "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600",
};

const icons: Record<OrderStatus, string> = {
  REQUESTED: "⏳",
  DECLINED: "❌",
  PAYMENT_PENDING: "💳",
  PAID: "✅",
  PREPARING: "👨‍🍳",
  READY: "🔔",
  COLLECTED: "✓",
  CANCELLED_TIMEOUT: "⏰",
};

const labels: Record<OrderStatus, string> = {
  REQUESTED: "Requested",
  DECLINED: "Declined",
  PAYMENT_PENDING: "Pay Now",
  PAID: "Paid",
  PREPARING: "Cooking",
  READY: "Ready!",
  COLLECTED: "Done",
  CANCELLED_TIMEOUT: "Expired",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 md:gap-1.5 rounded-full border-2 md:border px-3 md:px-2.5 py-1.5 md:py-1 text-xs font-black md:font-semibold whitespace-nowrap",
      colors[status]
    )}>
      <span className="text-base md:text-sm">{icons[status]}</span>
      <span className="tracking-tight">{labels[status]}</span>
    </span>
  );
}
