// components/inventory/inventory-search-bar.tsx
"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useKeyPress } from "@/hooks/useKeyPress";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Loader2, Search, XCircle } from "lucide-react";
import clsx from "clsx";

export interface InventorySearchBarProps {
  value: string;
  onChange: (newValue: string) => void;
  onClear: () => void;
  isLoading?: boolean;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  className?: string;
}

export const InventorySearchBar = forwardRef<
  HTMLInputElement,
  InventorySearchBarProps
>(
  (
    {
      value,
      onChange,
      onClear,
      isLoading = false,
      onKeyDown,
      onSubmit,
      className,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    // Expose the internal ref to the parent component via the forwarded ref
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Keybind to focus input: Alt+F
    useKeyPress(
      "f",
      (e) => {
        const targetEl = e.target as HTMLElement;
        if (
          targetEl.tagName === "INPUT" ||
          targetEl.tagName === "TEXTAREA" ||
          targetEl.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        inputRef.current?.focus();
      },
      { alt: true },
    );

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onSubmit?.(event);
    };

    // Show hint on desktop, hide on mobile.
    const placeholderText = isDesktop
      ? 'Search cards... (e.g., "t:instant o:draw", Alt + F to focus)'
      : "Search cards...";

    return (
      <form
        onSubmit={handleFormSubmit}
        className={clsx(
          "flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center",
          className,
        )}
      >
        <div className="relative flex-grow">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={20}
          />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholderText}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 pl-10 pr-10 text-base"
            onKeyDown={onKeyDown}
            aria-label="Search inventory"
            autoComplete="off"
            spellCheck={false}
            maxLength={100}
            suppressHydrationWarning
          />
          {value && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={onClear}
              aria-label="Clear search"
            >
              <XCircle size={20} />
            </Button>
          )}
          {isLoading && (
            <Loader2
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary"
              size={20}
            />
          )}
        </div>
      </form>
    );
  },
);

InventorySearchBar.displayName = "InventorySearchBar";

export default InventorySearchBar;
