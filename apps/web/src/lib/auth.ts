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
  await apiFetch("/auth/logout", { method: "POST" });
  // Force redirect to login page
  window.location.href = "/login";
}

export async function me() {
  return apiFetch<User>("/auth/me");
}
