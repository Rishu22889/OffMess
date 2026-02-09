import clsx from "clsx";
import { OrderStatus } from "@/lib/types";

const timeline: OrderStatus[] = [
  "REQUESTED",
  "PAYMENT_PENDING",
  "PAID",
  "PREPARING",
  "READY",
  "COLLECTED",
];

export default function OrderTimeline({ status }: { status: OrderStatus }) {
  const currentIndex = timeline.indexOf(status);

  return (
    <div className="grid gap-2">
      {timeline.map((step, index) => (
        <div key={step} className="flex items-center gap-2 sm:gap-3">
          <div
            className={clsx(
              "h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full flex-shrink-0",
              index <= currentIndex ? "bg-emerald-500" : "bg-gray-300"
            )}
          />
          <span className={clsx("text-xs sm:text-sm", index <= currentIndex ? "text-neutral-900" : "text-gray-400")}>
            {step.split("_").join(" ")}
          </span>
        </div>
      ))}
    </div>
  );
}
