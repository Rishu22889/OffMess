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
  try {
    // Call logout API
    await apiFetch("/auth/logout", { method: "POST" });
  } catch (err) {
    console.error("Logout API call failed:", err);
    // Continue with logout even if API fails
  }
  
  // Clear all browser storage
  if (typeof window !== 'undefined') {
    // Clear localStorage
    try {
      localStorage.clear();
    } catch (e) {
      console.error("Failed to clear localStorage:", e);
    }
    
    // Clear sessionStorage
    try {
      sessionStorage.clear();
    } catch (e) {
      console.error("Failed to clear sessionStorage:", e);
    }
    
    // Clear all cookies from this domain
    try {
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    } catch (e) {
      console.error("Failed to clear cookies:", e);
    }
    
    // Force full page reload to login (clears all state and cache)
    // Use replace to remove current page from history
    window.location.replace("/login");
  }
}

export async function me() {
  return apiFetch<User>("/auth/me");
}
