"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./AuthProvider";
import { useState } from "react";

export default function NavBar() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            {user?.role === "STUDENT" && (
              <>
                <Link 
                  href="/orders" 
                  className="px-3 lg:px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                >
                  My Orders
                </Link>
                <Link 
                  href="/profile" 
                  className="px-3 lg:px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                >
                  Profile
                </Link>
              </>
            )}
            {user?.role === "CANTEEN_ADMIN" && (
              <>
                <Link 
                  href="/admin" 
                  className="px-3 lg:px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/admin/daily" 
                  className="px-3 lg:px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                >
                  Daily Orders
                </Link>
                <Link 
                  href="/admin/profile" 
                  className="px-3 lg:px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                >
                  Profile
                </Link>
              </>
            )}
            {user?.role === "CAMPUS_ADMIN" && (
              <>
                <Link 
                  href="/campus" 
                  className="px-3 lg:px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                >
                  Campus Stats
                </Link>
                <Link 
                  href="/campus/hostels" 
                  className="px-3 lg:px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                >
                  Hostels
                </Link>
                <Link 
                  href="/campus/mess-menu" 
                  className="px-3 lg:px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                >
                  Mess Menu
                </Link>
                <Link 
                  href="/profile" 
                  className="px-3 lg:px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                >
                  Profile
                </Link>
              </>
            )}
            
            {user ? (
              <>
                <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-2"></div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-subtle"></div>
                  <span className="text-xs lg:text-sm text-neutral-700 dark:text-neutral-300 font-medium max-w-[150px] truncate">
                    {user.email || user.roll_number}
                  </span>
                </div>
                <button
                  onClick={() => logout()}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-red-400 hover:bg-red-500/10 border border-neutral-200 dark:border-neutral-800 hover:border-red-500/30 transition-all"
                >
                  Logout
                </button>
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2 animate-slide-in">
            {user?.role === "STUDENT" && (
              <>
                <Link 
                  href="/orders" 
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Orders
                </Link>
                <Link 
                  href="/profile" 
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
              </>
            )}
            {user?.role === "CANTEEN_ADMIN" && (
              <>
                <Link 
                  href="/admin" 
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/admin/daily" 
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Daily Orders
                </Link>
                <Link 
                  href="/admin/profile" 
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
              </>
            )}
            {user?.role === "CAMPUS_ADMIN" && (
              <>
                <Link 
                  href="/campus" 
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Campus Stats
                </Link>
                <Link 
                  href="/campus/hostels" 
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Hostels
                </Link>
                <Link 
                  href="/campus/mess-menu" 
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mess Menu
                </Link>
                <Link 
                  href="/profile" 
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
              </>
            )}
            
            {user ? (
              <>
                <div className="px-4 py-2 text-xs text-neutral-600 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800 mt-2 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium">Logged in as</span>
                  </div>
                  <p className="text-neutral-900 dark:text-white font-medium">{user.email || user.roll_number}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/30 transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link 
                href="/login" 
                className="block px-4 py-2.5 rounded-xl text-sm font-medium text-center text-neutral-900 dark:text-white bg-gradient-to-r from-orange-500 to-orange-600 transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
