"use client";

import { useEffect, useState } from "react";

function formatTime(seconds: number) {
  if (seconds <= 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function getTimeColor(seconds: number, total: number = 600) {
  const percentage = seconds / total;
  if (percentage > 0.5) return "text-green-800 bg-green-50 border-green-200";
  if (percentage > 0.25) return "text-orange-800 bg-orange-50 border-orange-200";
  return "text-red-800 bg-red-50 border-red-200";
}

export default function Countdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => {
    const expiryTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    const diff = Math.floor((expiryTime - currentTime) / 1000);
    return diff > 0 ? diff : 0;
  });

  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const expiryTime = new Date(expiresAt).getTime();
      const currentTime = Date.now();
      const diff = Math.floor((expiryTime - currentTime) / 1000);
      const newRemaining = diff > 0 ? diff : 0;
      setRemaining(newRemaining);
      
      if (newRemaining === 0 && !isExpired) {
        setIsExpired(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, isExpired]);

  const colorClass = remaining > 0 ? getTimeColor(remaining) : "text-red-800 bg-red-50 border-red-200";

  return (
    <div className={`rounded-xl border px-3 sm:px-4 py-2 sm:py-3 ${colorClass}`}>
      <p className="text-xs sm:text-sm font-medium">
        {remaining > 0 ? "Payment expires in" : "Payment expired"}
      </p>
      <p className="text-2xl sm:text-3xl font-bold font-mono">{formatTime(remaining)}</p>
      {remaining > 0 && remaining <= 60 && (
        <p className="text-xs mt-1 animate-pulse">⚠️ Less than 1 minute left!</p>
      )}
      {remaining === 0 && (
        <p className="text-xs mt-1">Please place a new order</p>
      )}
    </div>
  );
}
