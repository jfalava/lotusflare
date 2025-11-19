"use client";

import { getCookieWithConsent } from "@/lib/cookies-with-consent";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

const COOKIE_KEY_HIDE_KEYBINDS = "hideKeybinds";

const Kbd = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    const [hideKeybinds, setHideKeybinds] = useState<boolean>(() => {
      const cookieValue = getCookieWithConsent(COOKIE_KEY_HIDE_KEYBINDS);
      return cookieValue === "true";
    });

    useEffect(() => {
      const onCookieChange = (event: CustomEvent) => {
        setHideKeybinds(event.detail);
      };
      const listener = (e: Event) => onCookieChange(e as CustomEvent);
      window.addEventListener("hideKeybindsChange", listener);
      return () => {
        window.removeEventListener("hideKeybindsChange", listener);
      };
    }, []);

    if (hideKeybinds) return null;

    return (
      <kbd
        ref={ref}
        className={cn(
          "pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border",
          "bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);

Kbd.displayName = "Kbd";

export { Kbd };
