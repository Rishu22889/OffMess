"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";

type UserType = "student" | "admin" | null;

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [userType, setUserType] = useState<UserType>(null);
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Admin login always uses email
      const input = { email: value, password };
      const user = await login(input);
      console.log("Login successful, user:", user);
      await refresh();
      if (user.role === "CANTEEN_ADMIN") {
        router.push("/admin");
      } else if (user.role === "CAMPUS_ADMIN") {
        router.push("/campus");
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Check credentials.");
    }
  };

  const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    window.location.href = `${apiUrl}/auth/google/login`;
  };

  // Step 1: Choose user type
  if (userType === null) {
    return (
      <div className="mx-auto max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-white">Welcome</h1>
        <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">Please select your role to continue</p>

        <div className="mt-6 sm:mt-8 grid gap-3 sm:gap-4">
          <button
            onClick={() => setUserType("student")}
            className="rounded-xl sm:rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 sm:p-6 text-left hover:border-blue-500 hover:bg-blue-500/10 transition-all group"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-blue-500/20 p-2 sm:p-3 group-hover:bg-blue-500/30 flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base sm:text-lg text-neutral-900 dark:text-white">Student</h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">Sign in with IIT ISM Google account</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setUserType("admin")}
            className="rounded-xl sm:rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 sm:p-6 text-left hover:border-orange-500 hover:bg-orange-500/10 transition-all group"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-orange-500/20 p-2 sm:p-3 group-hover:bg-orange-500/30 flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base sm:text-lg text-neutral-900 dark:text-white">Admin</h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">Canteen or Campus Administrator</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Student login (Google OAuth only)
  if (userType === "student") {
    return (
      <div className="mx-auto max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-lg">
        <button
          onClick={() => setUserType(null)}
          className="mb-4 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-white flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-white">Student Login</h1>
        <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">Sign in with your IIT ISM Google account</p>

        <button
          onClick={handleGoogleLogin}
          className="mt-6 sm:mt-8 w-full rounded-xl sm:rounded-2xl bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-4 sm:px-6 py-3 sm:py-4 font-medium flex items-center justify-center gap-2 sm:gap-3 transition-all text-sm sm:text-base"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="truncate text-neutral-900 dark:text-white">Sign in with IIT ISM Google</span>
        </button>

        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
          <p className="text-xs text-blue-300">
            <strong>Note:</strong> Only @iitism.ac.in email addresses are allowed
          </p>
        </div>
      </div>
    );
  }

  // Step 3: Admin login (Email/Password only)
  return (
    <div className="mx-auto max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-lg">
      <button
        onClick={() => setUserType(null)}
        className="mb-4 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-white flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-white">Admin Login</h1>
      <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">Sign in with your admin credentials</p>

      <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 grid gap-3 sm:gap-4" suppressHydrationWarning>
        <input
          className="rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:border-orange-500 focus:outline-none transition-all [&:-webkit-autofill]:!bg-white dark:bg-neutral-900 [&:-webkit-autofill]:!text-neutral-900 dark:text-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_#171717_inset]"
          placeholder="Email"
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          suppressHydrationWarning
        />
        <input
          className="rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:border-orange-500 focus:outline-none transition-all [&:-webkit-autofill]:!bg-white dark:bg-neutral-900 [&:-webkit-autofill]:!text-neutral-900 dark:text-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_#171717_inset]"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          suppressHydrationWarning
        />
        {error && <p className="text-xs sm:text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-4 py-2 sm:py-3 text-sm sm:text-base text-white font-bold transition-all"
        >
          Login
        </button>
      </form>
    </div>
  );
}
