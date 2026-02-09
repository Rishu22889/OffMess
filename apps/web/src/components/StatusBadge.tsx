import clsx from "clsx";
import { OrderStatus } from "@/lib/types";

const colors: Record<OrderStatus, string> = {
  REQUESTED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  DECLINED: "bg-red-500/20 text-red-400 border-red-500/30",
  PAYMENT_PENDING: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  PAID: "bg-green-500/20 text-green-400 border-green-500/30",
  PREPARING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  READY: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  COLLECTED: "bg-neutral-700 text-neutral-400 border-neutral-600",
  CANCELLED_TIMEOUT: "bg-neutral-700 text-neutral-400 border-neutral-600",
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

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 sm:px-3 py-1 text-xs font-semibold whitespace-nowrap",
      colors[status]
    )}>
      <span className="text-sm">{icons[status]}</span>
      <span>{status.split("_").join(" ")}</span>
    </span>
  );
}
