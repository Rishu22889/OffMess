"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthCallback() {
  const router = useRouter();
  const { refresh } = useAuth();

  useEffect(() => {
    // Backend handles the OAuth flow and sets cookie
    // Refresh auth state and redirect to home (student dashboard)
    const handleCallback = async () => {
      await refresh();
      // Redirect to home page (canteen list/dashboard for students)
      router.push("/");
    };
    
    handleCallback();
  }, [router, refresh]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center bg-white p-8 rounded-3xl shadow-lg">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome to OffMess!</h2>
        <p className="text-neutral-600">Setting up your account...</p>
      </div>
    </div>
  );
}
