"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { me as fetchMe, logout as doLogout } from "@/lib/auth";
import { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const next = await fetchMe();
      setUser(next);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // First set user to null immediately
    setUser(null);
    
    // Then call the logout API
    try {
      await doLogout();
    } catch (err) {
      console.error("Logout API error:", err);
    }
    
    // The doLogout function will handle the redirect
  };

  useEffect(() => {
    refresh();
  }, []);

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value = useMemo(() => ({ user, loading, refresh, logout, updateUser }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
