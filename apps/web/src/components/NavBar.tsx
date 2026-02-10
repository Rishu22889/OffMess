"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./AuthProvider";

export default function NavBar() {
  const { user } = useAuth();

  return (
    <nav className="rounded-2xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800/50 shadow-sm">
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden">
              <Image 
                src="/web_logo.png" 
                alt="OffMess Logo" 
                width={40} 
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white whitespace-nowrap">
              OffMess
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-subtle"></div>
                  <span className="text-xs lg:text-sm text-neutral-700 dark:text-neutral-300 font-medium max-w-[150px] truncate">
                    {user.email || user.roll_number}
                  </span>
                </div>
              </>
            ) : (
              <Link 
                href="/login" 
                className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-900 dark:text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
