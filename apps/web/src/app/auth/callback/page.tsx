"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { User } from "@/lib/types";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get token from URL parameter
        const token = searchParams.get("token");
        
        if (!token) {
          setError("No authentication token received");
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        // Exchange token for cookie-based session
        await apiFetch<{ user: User; access_token: string }>("/auth/exchange-token", {
          method: "POST",
          body: JSON.stringify({ token }),
        });

        // Refresh auth state
        await refresh();
        
        // Redirect to home page
        router.push("/");
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("Authentication failed. Please try again.");
        setTimeout(() => router.push("/login"), 2000);
      }
    };
    
    handleCallback();
  }, [router, refresh, searchParams]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center bg-white p-8 rounded-3xl shadow-lg">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Failed</h2>
          <p className="text-neutral-600">{error}</p>
          <p className="text-sm text-neutral-500 mt-2">Redirecting to login...</p>
        </div>
      </div>
    );
  }

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
