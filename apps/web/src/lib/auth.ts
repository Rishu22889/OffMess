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
  // CANNOT be deleted by frontend JavaScript. The backend MUST delete them.
  // We only clear local storage and redirect.
  
  try {
    // Call logout API - this deletes the httpOnly cookie on the backend
    await apiFetch("/auth/logout", { method: "POST" });
  } catch (err) {
    console.error("Logout API call failed:", err);
    // Continue with logout even if API fails
  }
  
  // Clear all browser storage (but NOT cookies - backend handles that)
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
    
    // DO NOT try to delete cookies here - httpOnly cookies cannot be deleted by JavaScript
    // The backend /auth/logout endpoint handles cookie deletion
    
    // Force full page reload to login (clears all state and cache)
    // Use replace to remove current page from history
    // Add timestamp to force fresh load and prevent cache
    window.location.replace("/login?t=" + Date.now());
  }
}

export async function me() {
  return apiFetch<User>("/auth/me");
}
