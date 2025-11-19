"use client";

import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  type ReactNode,
  useEffect,
} from "react";
import {
  setCookieWithConsent,
  getCookieWithConsent,
} from "@/lib/cookies-with-consent";

const COOKIE_KEY_INFINITE_SCROLL = "inventoryInfiniteScroll";
const COOKIE_KEY_HIDE_KEYBINDS = "hideKeybinds";

export interface SettingsContextType {
  infiniteScroll: boolean;
  setInfiniteScroll: (enabled: boolean) => void;
  hideKeybinds: boolean;
  setHideKeybinds: (enabled: boolean) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [infiniteScroll, setInfiniteScrollState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const savedValue = getCookieWithConsent(COOKIE_KEY_INFINITE_SCROLL);
    return savedValue === undefined ? true : savedValue === "true";
  });

  const [hideKeybinds, setHideKeybindsState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const savedValue = getCookieWithConsent(COOKIE_KEY_HIDE_KEYBINDS);
    return savedValue === "true";
  });

  const setInfiniteScroll = useCallback((enabled: boolean) => {
    setInfiniteScrollState(enabled);
    setCookieWithConsent(COOKIE_KEY_INFINITE_SCROLL, String(enabled), {
      expires: 365,
      path: "/",
    });
    window.dispatchEvent(
      new CustomEvent("infiniteScrollChange", { detail: enabled }),
    );
  }, []);

  const setHideKeybinds = useCallback((enabled: boolean) => {
    setHideKeybindsState(enabled);
    setCookieWithConsent(COOKIE_KEY_HIDE_KEYBINDS, String(enabled), {
      expires: 365,
      path: "/",
    });
    window.dispatchEvent(
      new CustomEvent("hideKeybindsChange", { detail: enabled }),
    );
  }, []);

  useEffect(() => {
    const handleConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail) {
        setInfiniteScrollState(true);
        setHideKeybindsState(false);
      }
    };
    window.addEventListener("cookieConsentChange", handleConsentChange);
    return () =>
      window.removeEventListener("cookieConsentChange", handleConsentChange);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        infiniteScroll,
        setInfiniteScroll,
        hideKeybinds,
        setHideKeybinds,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
