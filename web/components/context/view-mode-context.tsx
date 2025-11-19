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

export type ViewMode = "grid" | "list";
const COOKIE_KEY_UNIVERSAL_VIEW_MODE = "universalViewMode";

export interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const ViewModeContext = createContext<ViewModeContextType | undefined>(
  undefined,
);

export const ViewModeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "grid";
    const savedMode = getCookieWithConsent(
      COOKIE_KEY_UNIVERSAL_VIEW_MODE,
    ) as ViewMode;
    return savedMode === "list" || savedMode === "grid" ? savedMode : "grid";
  });

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    setCookieWithConsent(COOKIE_KEY_UNIVERSAL_VIEW_MODE, mode, {
      expires: 365,
    });
    window.dispatchEvent(
      new CustomEvent("universalViewModeChange", { detail: mode }),
    );
  }, []);

  useEffect(() => {
    const handleConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (!customEvent.detail) {
        setViewModeState("grid");
      }
    };
    window.addEventListener("cookieConsentChange", handleConsentChange);
    return () =>
      window.removeEventListener("cookieConsentChange", handleConsentChange);
  }, []);

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = (): ViewModeContextType => {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error("useViewMode must be used within a ViewModeProvider");
  }
  return context;
};
