"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { MessMenu } from "@/lib/types";
import Link from "next/link";

interface MessMenuCardProps {
  hostelName?: string | null;
}

export default function MessMenuCard({ hostelName }: MessMenuCardProps) {
  const [menu, setMenu] = useState<MessMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const loadMenu = async () => {
      if (!hostelName) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<MessMenu>(
          `/mess-menu/today?hostel_name=${encodeURIComponent(hostelName)}`
        );
        setMenu(data);
      } catch (err: any) {
        if (err?.message?.includes("404") || err?.message?.includes("not found")) {
          setError("no_menu");
        } else {
          setError(err?.message || "Failed to load mess menu");
        }
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, [hostelName]);

  // Get day name
  const getDayName = () => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const today = new Date().getDay();
    const dayIndex = today === 0 ? 6 : today - 1; // Convert Sunday (0) to 6, shift others
    return days[dayIndex];
  };

  // No hostel set
  if (!hostelName) {
    return (
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🍽️</span>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Today's Mess Menu</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Please set your hostel name to view today's mess menu
          </p>
          <Link
            href="/profile"
            className="inline-block rounded-xl bg-orange-500 hover:bg-orange-600 px-6 py-3 text-neutral-900 dark:text-white font-medium transition-colors"
          >
            Update Profile
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🍽️</span>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Today's Mess Menu</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-neutral-600 dark:text-neutral-400">Loading menu...</p>
        </div>
      </div>
    );
  }

  // No menu available
  if (error === "no_menu" || !menu) {
    return (
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🍽️</span>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Today's Mess Menu</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{hostelName}</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-neutral-600 dark:text-neutral-400">
            No menu available for today. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🍽️</span>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Today's Mess Menu</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  // Display menu with toggle
  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🍽️</span>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Today's Mess Menu</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{menu.hostel_name} • {getDayName()}</p>
          </div>
        </div>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-6 py-3 text-neutral-900 dark:text-white font-medium transition-all"
        >
          {showMenu ? "Hide Menu" : "View Today's Menu"}
        </button>
      </div>

      {showMenu && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {[
            { name: "Breakfast", emoji: "🌅", content: menu.breakfast },
            { name: "Lunch", emoji: "🌞", content: menu.lunch },
            { name: "Snacks", emoji: "☕", content: menu.snacks },
            { name: "Dinner", emoji: "🌙", content: menu.dinner },
          ].map((meal) => (
            <div
              key={meal.name}
              className="rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{meal.emoji}</span>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{meal.name}</h3>
              </div>
              {meal.content ? (
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
                  {meal.content}
                </p>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-500 italic">Not available</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
