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
    await apiFetch("/auth/logout", { method: "POST" });
  } catch (err) {
    console.error("Logout API call failed:", err);
  }
  
  // Clear any local storage
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
  }
  
  // Force full page reload to login (clears all state and cache)
  window.location.replace("/login");
}

export async function me() {
  return apiFetch<User>("/auth/me");
}
