"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A custom hook that tracks the state of a CSS media query using
 * React 18's useSyncExternalStore for improved SSR and concurrent rendering support.
 * @param query The media query string to watch.
 * @returns `true` if the media query matches, `false` otherwise.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", callback);
      return () => {
        mediaQueryList.removeEventListener("change", callback);
      };
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  /**
   * On the server, we can't know the viewport size, so we return a default.
   * This prevents hydration mismatches.
   * @returns {boolean} Default value for server-side rendering
   */
  const getServerSnapshot = (): boolean => {
    return false;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
