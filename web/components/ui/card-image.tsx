// components/card/card-image.tsx
"use client";

import type { DragEvent } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CardImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  isCommander?: boolean;
  /**
   * Intended display size; drives the `sizes` attribute when we use
   * `next/image` optimisation.
   */
  sizeVariant?: "small" | "normal" | "large";
  /**
   * If true the consumer wants to be able to drag the picture out of the
   * browser. We therefore render a plain <img> with the raw Scryfall link.
   */
  draggable?: boolean;
}

export const CardImage = ({
  src,
  alt,
  className,
  isCommander,
  sizeVariant = "normal",
  draggable = false,
}: CardImageProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const handleDragStart = (e: DragEvent<HTMLImageElement | HTMLDivElement>) => {
    if (!src) return;
    e.dataTransfer.setData("text/uri-list", src);
    e.dataTransfer.setData("text/plain", src);
    e.dataTransfer.effectAllowed = "copyLink";
  };

  const handleError = () => {
    if (src) {
      setFailedSrc(src);
    }
  };

  const showFallback = !src || failedSrc === src;

  // Map variants to their corresponding widths for the `sizes` prop.
  const sizeMap = {
    small: "146px",
    normal: "488px",
    large: "672px",
  };

  if (showFallback) {
    return (
      <div
        className={cn(
          "flex aspect-[63/88] w-full items-center justify-center rounded-lg border border-border bg-muted",
          isCommander && "aspect-[744/538]",
          className,
        )}
        draggable={draggable}
        onDragStart={draggable ? handleDragStart : undefined}
      >
        <ImageOff className="h-1/3 w-1/3 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-[63/88] w-full",
        isCommander && "aspect-[744/538]",
        className,
      )}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
    >
      {draggable ? (
        /* Native <img> gives us the exact Scryfall URL in the DOM */
        <img
          src={src!}
          alt={alt}
          className="rounded-lg object-contain w-full h-full cursor-pointer"
          draggable
          onDragStart={handleDragStart}
          onError={handleError}
        />
      ) : (
        <Image
          src={src!}
          alt={alt}
          fill
          className="rounded-lg object-contain"
          sizes={sizeMap[sizeVariant]}
          unoptimized={false}
          draggable={false}
          onError={handleError}
        />
      )}
    </div>
  );
};
