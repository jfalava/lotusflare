"use client";

import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
import { hasCookieConsent } from "@/lib/cookies-with-consent";

export type ColorTheme =
  | "default"
  | "catppuccin"
  | "clean-slate"
  | "melange"
  | "shadcn-gray";
export type FontSans =
  | "default"
  | "atlassian-sans"
  | "open-dyslexic"
  | "pretendard-variable";
export type FontMono =
  | "default"
  | "berkeley-mono"
  | "geist-mono"
  | "ibm-plex-mono";

interface ThemeStore {
  colorTheme: ColorTheme;
  fontSans: FontSans;
  fontMono: FontMono;
  darkMode: "light" | "dark" | "system";
  setColorTheme: (t: ColorTheme) => void;
  setFontSans: (f: FontSans) => void;
  setFontMono: (m: FontMono) => void;
  setDarkMode: (m: "light" | "dark" | "system") => void;
}

const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      colorTheme: "default",
      fontSans: "default",
      fontMono: "default",
      darkMode: "system",
      setColorTheme: (colorTheme) => set({ colorTheme }),
      setFontSans: (fontSans) => set({ fontSans }),
      setFontMono: (fontMono) => set({ fontMono }),
      setDarkMode: (darkMode) => set({ darkMode }),
    }),
    {
      name: "theme",
      storage: {
        getItem: (name) => {
          if (typeof window === "undefined") return undefined;
          // Always try to read the cookie, not just when consent is given
          const value = Cookies.get(name);
          return value ? JSON.parse(value) : undefined;
        },
        setItem: (name, value) => {
          // Only set cookies if consent is given
          if (hasCookieConsent()) {
            Cookies.set(name, JSON.stringify(value), { expires: 365 });
          }
        },
        removeItem: (name) => {
          Cookies.remove(name);
        },
      },
    },
  ),
);

const ThemeContext = createContext<ThemeStore | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = React.useState(false);
  const {
    colorTheme,
    fontSans,
    fontMono,
    darkMode,
    setColorTheme,
    setFontSans,
    setFontMono,
    setDarkMode,
  } = useThemeStore();

  useEffect(() => {
    setIsClient(true);

    const handleConsentChange = () => {
      // Force re-render when consent changes
    };
    window.addEventListener("cookieConsentChange", handleConsentChange);
    return () =>
      window.removeEventListener("cookieConsentChange", handleConsentChange);
  }, []);

  // Apply theme classes to document root
  useEffect(() => {
    if (!isClient) return;

    const root = document.documentElement;
    root.setAttribute("data-theme", colorTheme);
    if (fontSans === "default") {
      root.removeAttribute("data-font-sans");
    } else {
      root.setAttribute("data-font-sans", fontSans);
    }
    if (fontMono === "default") {
      root.removeAttribute("data-font-mono");
    } else {
      root.setAttribute("data-font-mono", fontMono);
    }
    const isDark =
      darkMode === "dark" ||
      (darkMode === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
  }, [colorTheme, fontSans, fontMono, darkMode, isClient]);

  return (
    <ThemeContext.Provider
      value={{
        colorTheme,
        fontSans,
        fontMono,
        darkMode,
        setColorTheme,
        setFontSans,
        setFontMono,
        setDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
