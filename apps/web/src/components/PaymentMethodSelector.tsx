"use client";

import { useState } from "react";
import { PaymentMethod } from "@/lib/types";

interface PaymentMethodSelectorProps {
  onSelect: (method: PaymentMethod) => void;
  selected: PaymentMethod;
}

export default function PaymentMethodSelector({ onSelect, selected }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase mb-3">Choose Payment Method</p>
      
      {/* Online Payment Option */}
      <button
        onClick={() => onSelect("ONLINE")}
        className={`w-full p-4 rounded-xl border-2 transition-all ${
          selected === "ONLINE" 
            ? "border-orange-500 bg-orange-500/10" 
            : "border-neutral-700 bg-neutral-900 hover:border-neutral-600"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">💳</span>
          <div className="text-left flex-1">
            <p className="font-bold text-neutral-900 dark:text-white text-base">Pay Online (UPI)</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Scan QR code to pay now</p>
          </div>
          {selected === "ONLINE" && (
            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
      </button>
      
      {/* Counter Payment Option */}
      <button
        onClick={() => onSelect("COUNTER")}
        className={`w-full p-4 rounded-xl border-2 transition-all ${
          selected === "COUNTER" 
            ? "border-orange-500 bg-orange-500/10" 
            : "border-neutral-700 bg-neutral-900 hover:border-neutral-600"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏪</span>
          <div className="text-left flex-1">
            <p className="font-bold text-neutral-900 dark:text-white text-base">Pay at Counter</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Pay when you collect your order</p>
          </div>
          {selected === "COUNTER" && (
            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}