import clsx from "clsx";
import { ImageOff } from "lucide-react";
import React from "react";

interface CardImagePlaceholderProps {
  className?: string;
}

export const CardImagePlaceholder: React.FC<CardImagePlaceholderProps> = ({
  className,
}) => {
  return (
    <div
      className={clsx(
        "aspect-[63/88] w-full bg-muted rounded border border-border flex items-center justify-center",
        className,
      )}
    >
      <ImageOff className="h-1/3 w-1/3 text-muted-foreground" />
    </div>
  );
};
