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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const refresh = async () => {
    // Don't refresh if we're in the middle of logging out
    if (isLoggingOut) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    // Don't refresh if we're on the login page (user just logged out)
    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
      setUser(null);
      setLoading(false);
      return;
    }
    
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
    // Set logging out flag to prevent refresh
    setIsLoggingOut(true);
    
    // Clear user state immediately
    setUser(null);
    
    // Call the logout API (which will redirect)
    try {
      await doLogout();
    } catch (err) {
      console.error("Logout error:", err);
      // doLogout will handle the redirect even on error
    }
    
    // Keep isLoggingOut true to prevent any refresh attempts
    // It will be reset when the page reloads at /login
  };

  useEffect(() => {
    refresh();
  }, []);

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value = useMemo(() => ({ user, loading, refresh, logout, updateUser }), [user, loading, isLoggingOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
