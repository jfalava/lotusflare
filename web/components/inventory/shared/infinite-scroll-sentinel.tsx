// components/inventory/shared/infinite-scroll-sentinel.tsx
import React, { useEffect, useRef } from "react";

interface InfiniteScrollSentinelProps {
  /** Called when the sentinel comes into view */
  onLoadMore: () => void;
  /** Whether there are still more pages to load */
  hasMore: boolean;
  /** Options passed to the IntersectionObserver */
  rootMargin?: string;
  threshold?: number | number[];
  /** Disable observer even if hasMore===true */
  disabled?: boolean;
  /** Styling or layout hook */
  className?: string;
}

export function InfiniteScrollSentinel({
  onLoadMore,
  hasMore,
  rootMargin = "0px",
  threshold = 1.0,
  disabled = false,
  className,
}: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled || !hasMore) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { root: null, rootMargin, threshold },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [disabled, hasMore, onLoadMore, rootMargin, threshold]);

  return <div ref={ref} className={className} />;
}
