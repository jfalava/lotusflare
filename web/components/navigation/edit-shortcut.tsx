// src/components/navigation/edit-shortcut.tsx
"use client";

import { useCallback, useEffect, useRef, startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";

export function EditShortcut() {
  const pathname = usePathname();
  const router = useRouter();
  const loader = useTopLoader();
  const nextPathRef = useRef<string | null>(null);

  const cleanPath = pathname.replace(/^\/edit/, "");
  const canEdit =
    cleanPath.startsWith("/inventory") || cleanPath.startsWith("/decks");
  const isEditMode = pathname.startsWith("/edit");

  const performNavigation = useCallback(
    (target: string) => {
      if (!canEdit) return;
      nextPathRef.current = target;
      loader.start();
      startTransition(() => {
        router.push(target);
      });
    },
    [canEdit, loader, router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "e" && canEdit) {
        e.preventDefault();
        const target = isEditMode ? cleanPath : `/edit${cleanPath}`;
        performNavigation(target);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEdit, cleanPath, isEditMode, performNavigation]);

  useEffect(() => {
    if (nextPathRef.current && nextPathRef.current === pathname) {
      loader.done();
      nextPathRef.current = null;
    }
  }, [pathname, loader]);

  return null; // No UI rendered
}
