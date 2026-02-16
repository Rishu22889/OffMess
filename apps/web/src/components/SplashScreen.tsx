"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide splash screen after animation completes
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500); // 2.5 seconds total

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 md:hidden animate-fade-out">
      <div className="flex flex-col items-center gap-6 animate-scale-in">
        {/* Logo with pulse animation */}
        <div className="relative">
          <div className="absolute inset-0 bg-white/30 rounded-3xl blur-2xl animate-pulse-slow"></div>
          <div className="relative bg-white rounded-3xl p-8 shadow-2xl">
            <svg
              className="w-24 h-24 text-orange-600 animate-bounce-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
        </div>

        {/* App name with slide-up animation */}
        <div className="text-center animate-slide-up">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
            OffMess
          </h1>
          <p className="text-white/90 text-sm font-medium">
            Campus Canteen Pre-Order
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex gap-2 animate-fade-in-delayed">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce-1"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce-2"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce-3"></div>
        </div>
      </div>
    </div>
  );
}
