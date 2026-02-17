import { apiFetch } from "./api";
import { User } from "./types";

export async function login(input: { email?: string; roll_number?: string; password: string }) {
  const res = await apiFetch<{ user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.user;
}

export async function logout() {
  // CRITICAL: For cross-origin setups (Vercel + Render), httpOnly cookies
  // CANNOT be reliably deleted across domains. We use a different approach:
  // 1. Set a logout flag in localStorage
  // 2. Clear all storage
  // 3. Force page reload to login
  
  if (typeof window !== 'undefined') {
    // Set logout timestamp to prevent auto-login
    const logoutTime = Date.now().toString();
    try {
      localStorage.setItem('logout_time', logoutTime);
    } catch (e) {
      console.error("Failed to set logout flag:", e);
    }
    
    // Call logout API (best effort - may fail due to CORS)
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout API call failed (expected for cross-origin):", err);
    }
    
    // Clear all browser storage
    try {
      localStorage.clear();
      // Re-set the logout flag after clearing
      localStorage.setItem('logout_time', logoutTime);
    } catch (e) {
      console.error("Failed to clear localStorage:", e);
    }
    
    try {
      sessionStorage.clear();
    } catch (e) {
      console.error("Failed to clear sessionStorage:", e);
    }
    
    // Try to delete the cookie from frontend (won't work for httpOnly but worth trying)
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.vercel.app;';
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Force full page reload to login with cache busting
    window.location.replace("/login?logout=" + logoutTime);
  }
}

export async function me() {
  return apiFetch<User>("/auth/me");
}
