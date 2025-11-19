// utils/update-breadcrumb-segment.tsx
"use client";

import { useBreadcrumbReplacements } from "@/components/context/breadcrumb-provider";
import { useEffect, type ReactNode } from "react";

interface UpdateBreadcrumbSegmentProps {
  segmentKey: string;
  segmentValue: string;
  children: ReactNode;
}

export default function UpdateBreadcrumbSegment({
  segmentKey,
  segmentValue,
  children,
}: UpdateBreadcrumbSegmentProps) {
  const { addReplacement, removeReplacement } = useBreadcrumbReplacements();

  useEffect(() => {
    if (segmentKey && segmentValue) {
      addReplacement(segmentKey, segmentValue);
    }
    return () => {
      if (segmentKey) {
        removeReplacement(segmentKey);
      }
    };
  }, [segmentKey, segmentValue, addReplacement, removeReplacement]);

  return <>{children}</>;
}
