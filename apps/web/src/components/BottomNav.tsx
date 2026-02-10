"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Don't show bottom nav if not logged in or on login page
  if (!user || pathname === "/login") {
    return null;
  }

  // Student navigation
  if (user.role === "STUDENT") {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800 shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              pathname === "/"
                ? "text-orange-500 bg-orange-500/10"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </Link>

          <Link
            href="/orders"
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              pathname.startsWith("/orders")
                ? "text-orange-500 bg-orange-500/10"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs font-medium">Orders</span>
          </Link>

          <Link
            href="/profile"
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              pathname === "/profile"
                ? "text-orange-500 bg-orange-500/10"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    );
  }

  // Canteen Admin navigation
  if (user.role === "CANTEEN_ADMIN") {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800 shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
          <Link
            href="/admin"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
              pathname === "/admin"
                ? "text-orange-500 bg-orange-500/10"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-xs font-medium">Dashboard</span>
          </Link>

          <Link
            href="/admin/daily"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
              pathname === "/admin/daily"
                ? "text-orange-500 bg-orange-500/10"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-xs font-medium">Daily</span>
          </Link>

          <Link
            href="/admin/profile"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
              pathname === "/admin/profile"
                ? "text-orange-500 bg-orange-500/10"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    );
  }

  // Campus Admin navigation
  if (user.role === "CAMPUS_ADMIN") {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800 shadow-2xl">
        <div className="flex items-center justify-around px-1 py-2 safe-area-inset-bottom">
          <Link
            href="/campus"
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all ${
              pathname === "/campus"
                ? "text-orange-500 bg-orange-500/10"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium">Stats</span>
          </Link>

          <Link
            href="/campus/hostels"
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all ${
              pathname === "/campus/hostels"
                ? "text-orange-500 bg-orange-500/10"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-xs font-medium">Hostels</span>
          </Link>

          <Link
            href="/campus/mess-menu"
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all ${
              pathname === "/campus/mess-menu"
                ? "text-orange-500 bg-orange-500/10"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-xs font-medium">Menu</span>
          </Link>

          <Link
            href="/profile"
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all ${
              pathname === "/profile"
                ? "text-orange-500 bg-orange-500/10"
                : "text-neutral-600 dark:text-neutral-400"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    );
  }

  return null;
}
