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
  if (typeof window !== 'undefined') {
    // Set a permanent logout flag with current timestamp
    const logoutTime = Date.now().toString();
    sessionStorage.setItem('user_logged_out', 'true');
    sessionStorage.setItem('logout_time', logoutTime);
    localStorage.setItem('user_logged_out', 'true');
    localStorage.setItem('logout_time', logoutTime);
    
    // Call logout API
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout API call failed:", err);
    }
    
    // Clear all storage except logout flags
    const logoutFlag = localStorage.getItem('user_logged_out');
    const logoutTimeStamp = localStorage.getItem('logout_time');
    localStorage.clear();
    sessionStorage.clear();
    
    // Restore logout flags
    if (logoutFlag) localStorage.setItem('user_logged_out', logoutFlag);
    if (logoutTimeStamp) localStorage.setItem('logout_time', logoutTimeStamp);
    
    // Try to delete cookies
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.vercel.app;';
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=offmess.vercel.app;';
    
    // Redirect to login and prevent back button
    window.location.replace("/login?logout=" + logoutTime);
  }
}

export async function me() {
  return apiFetch<User>("/auth/me");
}
