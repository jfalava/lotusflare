// components/context/breadcrumb-context.tsx
"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useMemo,
  useCallback,
} from "react";

export type BreadcrumbReplacements = Record<string, string>;

interface BreadcrumbContextType {
  replacements: BreadcrumbReplacements;
  addReplacement: (key: string, value: string) => void;
  removeReplacement: (key: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(
  undefined,
);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [replacements, setReplacements] = useState<BreadcrumbReplacements>({});

  const addReplacement = useCallback((key: string, value: string) => {
    setReplacements((prev) => ({ ...prev, [key]: value }));
  }, []);

  const removeReplacement = useCallback((key: string) => {
    setReplacements((prev) => {
      return Object.fromEntries(
        Object.entries(prev).filter(([k]) => k !== key),
      );
    });
  }, []);

  const value = useMemo(
    () => ({ replacements, addReplacement, removeReplacement }),
    [replacements, addReplacement, removeReplacement],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbReplacements(): BreadcrumbContextType {
  const context = useContext(BreadcrumbContext);
  if (context === undefined) {
    console.warn(
      "useBreadcrumbReplacements must be used within a BreadcrumbProvider. Using default empty replacements.",
    );
    return {
      replacements: {},
      addReplacement: () => {},
      removeReplacement: () => {},
    };
  }
  return context;
}
