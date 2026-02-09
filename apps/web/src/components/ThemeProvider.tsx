"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    
    // Always use dark mode
    setTheme("dark");
    root.classList.add("dark");
    localStorage.setItem("theme", "dark");
    
    console.log("Theme locked to dark mode");
    console.log("HTML classes after init:", root.className);
    
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    // Theme toggle disabled - always dark mode
    console.log("Theme toggle disabled - staying in dark mode");
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return default values if not in provider (for SSR)
    return { theme: "light" as Theme, toggleTheme: () => {} };
  }
  return context;
}
