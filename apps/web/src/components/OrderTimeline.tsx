import clsx from "clsx";
import { OrderStatus } from "@/lib/types";

const statusLabels: Record<OrderStatus, string> = {
  REQUESTED: "Requested",
  DECLINED: "Declined",
  PAYMENT_PENDING: "Payment",
  PAID: "Paid",
  PREPARING: "Preparing",
  READY: "Ready",
  COLLECTED: "Collected",
  CANCELLED_TIMEOUT: "Cancelled",
};

const activeTimeline: OrderStatus[] = [
  "PAYMENT_PENDING",
  "PAID",
  "PREPARING",
  "READY",
  "COLLECTED",
];

export default function OrderTimeline({ status }: { status: OrderStatus }) {
  const currentIndex = activeTimeline.indexOf(status);
  const isCompleted = status === "COLLECTED";
  const isCancelled = status === "DECLINED" || status === "CANCELLED_TIMEOUT";

  // Don't show timeline for cancelled orders
  if (isCancelled) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <p className="text-sm text-red-600 dark:text-red-400 font-medium">Order {status === "DECLINED" ? "Declined" : "Cancelled"}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-4 md:p-6">
      {/* Mobile: Horizontal Timeline */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          {activeTimeline.map((step, index) => {
            const isActive = index <= currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <div key={step} className="flex flex-col items-center flex-1 relative">
                {/* Connecting Line */}
                {index < activeTimeline.length - 1 && (
                  <div className="absolute top-4 left-1/2 w-full h-0.5 -z-10">
                    <div
                      className={clsx(
                        "h-full transition-all duration-500",
                        isActive ? "bg-gradient-to-r from-orange-500 to-orange-600" : "bg-neutral-300 dark:bg-neutral-700"
                      )}
                    />
                  </div>
                )}
                
                {/* Step Circle */}
                <div
                  className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 mb-2 relative z-10",
                    isCurrent
                      ? "bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/50 scale-110 animate-pulse-subtle"
                      : isActive
                      ? "bg-gradient-to-br from-green-500 to-green-600 shadow-md"
                      : "bg-neutral-300 dark:bg-neutral-700"
                  )}
                >
                  {isActive && !isCurrent && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isCurrent && (
                    <div className="w-3 h-3 bg-white rounded-full animate-ping absolute" />
                  )}
                </div>
                
                {/* Step Label */}
                <span
                  className={clsx(
                    "text-[10px] font-medium text-center leading-tight transition-colors",
                    isCurrent
                      ? "text-orange-600 dark:text-orange-400 font-bold"
                      : isActive
                      ? "text-green-600 dark:text-green-400"
                      : "text-neutral-500 dark:text-neutral-500"
                  )}
                >
                  {statusLabels[step]}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Current Status Message */}
        <div className="text-center mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
          <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
            {isCompleted ? "🎉 Order Completed!" : `📍 ${statusLabels[status]}`}
          </p>
        </div>
      </div>

      {/* Desktop: Vertical Timeline (existing style) */}
      <div className="hidden md:grid gap-3">
        {activeTimeline.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step} className="flex items-center gap-3">
              <div
                className={clsx(
                  "h-3 w-3 rounded-full flex-shrink-0 transition-all duration-300",
                  isCurrent
                    ? "bg-orange-500 ring-4 ring-orange-200 dark:ring-orange-800"
                    : isActive
                    ? "bg-green-500"
                    : "bg-neutral-300 dark:bg-neutral-700"
                )}
              />
              <span
                className={clsx(
                  "text-sm font-medium transition-colors",
                  isCurrent
                    ? "text-orange-600 dark:text-orange-400"
                    : isActive
                    ? "text-green-600 dark:text-green-400"
                    : "text-neutral-500 dark:text-neutral-500"
                )}
              >
                {statusLabels[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
