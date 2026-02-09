"use client";

import { QRCodeSVG } from "qrcode.react";

interface QrCodePanelProps {
  payload: string;
  method?: string;
}

export default function QrCodePanel({ payload, method = "UPI_QR" }: QrCodePanelProps) {
  const handlePayWithUPI = () => {
    // Open UPI deep link to launch UPI apps on mobile
    window.location.href = payload;
  };

  return (
    <div className="rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <span className="text-base sm:text-lg">📱</span>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">Scan QR or pay with UPI app</p>
      </div>
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-white rounded-xl">
          <QRCodeSVG value={payload} size={window.innerWidth < 640 ? 150 : 180} />
        </div>
      </div>
      
      {/* Pay with UPI App Button */}
      <button
        onClick={handlePayWithUPI}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-neutral-900 dark:text-white font-bold shadow-lg transition-all transform hover:scale-105 mb-3"
      >
        💳 Pay with UPI App
      </button>
      
      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-500 text-center">
        Click button to open your UPI app (PhonePe, GPay, Paytm, etc.)
      </p>
    </div>
  );
}
