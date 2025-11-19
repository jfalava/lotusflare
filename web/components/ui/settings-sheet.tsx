"use client";

import React, { useEffect, useCallback } from "react";
import { Cog, ListOrdered, ChevronsDown, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { DarkModeSelector } from "./dark-mode-selector";
import { useSettings } from "@/components/context/settings-context";
import clsx from "clsx";
import { ThemeSelector } from "./theme-selector";
import { FontSelector } from "./font-selector";
import {
  setCookieWithConsent,
  getCookieWithConsent,
} from "@/lib/cookies-with-consent";

const COOKIE_KEY_INFINITE_SCROLL = "inventoryInfiniteScroll";
const COOKIE_KEY_HIDE_KEYBINDS = "hideKeybinds";

interface SettingItemProps {
  label: string;
  children: React.ReactNode;
  isLastInSection?: boolean;
  className?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
  label,
  children,
  isLastInSection,
  className,
}) => (
  <div
    className={clsx(
      "flex items-center justify-between py-3.5",
      !isLastInSection && "border-b border-border/60",
      className,
    )}
  >
    <p className="text-sm font-medium text-foreground pr-4 flex-1 min-w-0">
      {label}
    </p>
    <div className="w-full max-w-[170px] flex-shrink-0">{children}</div>
  </div>
);

interface SettingsSectionProps {
  title: string;
  children:
    | React.ReactElement<SettingItemProps>
    | React.ReactElement<SettingItemProps>[];
  className?: string;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
  className,
}) => {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div className={className}>
      <h3 className="mb-1 mt-4 px-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div>
        {items.map((child, idx) =>
          React.cloneElement(child, {
            key: `section-${title.replace(/\s+/g, "-").toLowerCase()}-${idx}`,
            isLastInSection: idx === items.length - 1,
          }),
        )}
      </div>
    </div>
  );
};

interface InventoryScrollSettingToggleProps {
  currentPreference: boolean;
  onPreferenceChange: (isInfiniteNext: boolean) => void;
}

const InventoryScrollSettingToggle: React.FC<
  InventoryScrollSettingToggleProps
> = ({ currentPreference, onPreferenceChange }) => {
  const isInfinite = currentPreference;
  const actionText = isInfinite ? "Infinite Scroll" : "Pagination";
  const nextActionText = isInfinite
    ? "Switch to Pagination"
    : "Switch to Infinite Scroll";
  const ActionIcon = isInfinite ? ChevronsDown : ListOrdered;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onPreferenceChange(!isInfinite)}
      aria-label={nextActionText}
      className="w-full justify-start px-3 group"
    >
      <ActionIcon className="h-4 w-4 mr-2 transition-transform duration-200 ease-in-out group-hover:scale-110" />
      <span>{actionText}</span>
    </Button>
  );
};

interface KeybindsSettingToggleProps {
  isShowing: boolean;
  onToggle: (newShow: boolean) => void;
}

const KeybindsSettingToggle: React.FC<KeybindsSettingToggleProps> = ({
  isShowing,
  onToggle,
}) => {
  const actionText = isShowing ? "Visible" : "Hidden";
  const nextActionText = isShowing ? "Hide keybinds" : "Show keybinds";
  const Icon = isShowing ? Eye : EyeOff;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onToggle(!isShowing)}
      aria-label={nextActionText}
      className="w-full justify-start px-3 group"
    >
      <Icon className="h-4 w-4 mr-2 transition-transform duration-200 ease-in-out group-hover:scale-110" />
      <span>{actionText}</span>
    </Button>
  );
};

export function SettingsSheet() {
  const { infiniteScroll, setInfiniteScroll, hideKeybinds, setHideKeybinds } =
    useSettings();

  useEffect(() => {
    if (getCookieWithConsent(COOKIE_KEY_INFINITE_SCROLL) == null) {
      setCookieWithConsent(COOKIE_KEY_INFINITE_SCROLL, "false", {
        expires: 365,
        path: "/",
      });
    }
    if (getCookieWithConsent(COOKIE_KEY_HIDE_KEYBINDS) == null) {
      setCookieWithConsent(COOKIE_KEY_HIDE_KEYBINDS, "false", {
        expires: 365,
        path: "/",
      });
    }
  }, []);

  const handleInfiniteScrollPreferenceChange = useCallback(
    (next: boolean) => {
      setInfiniteScroll(next);
    },
    [setInfiniteScroll],
  );

  const handleHideKeybindsChange = useCallback(
    (newHide: boolean) => {
      setHideKeybinds(newHide);
    },
    [setHideKeybinds],
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open settings">
          <Cog className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        className={clsx("flex flex-col p-0", "w-full max-w-xs sm:max-w-sm")}
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto px-5 pb-5 pt-1 divide-y divide-border/60">
          <SettingsSection title="Appearance">
            <SettingItem label="Sans font">
              <FontSelector family="sans" />
            </SettingItem>
            <SettingItem label="Mono font">
              <FontSelector family="mono" />
            </SettingItem>
            <SettingItem label="Theme">
              <ThemeSelector />
            </SettingItem>
            <SettingItem label="Style">
              <DarkModeSelector />
            </SettingItem>
          </SettingsSection>

          <SettingsSection title="Preferences">
            <SettingItem label="Default decklist view">
              <ViewModeToggle />
            </SettingItem>

            <SettingItem label="Inventory scroll type">
              <InventoryScrollSettingToggle
                currentPreference={infiniteScroll}
                onPreferenceChange={handleInfiniteScrollPreferenceChange}
              />
            </SettingItem>

            <SettingItem label="Keybind hints" className="hidden sm:flex">
              <KeybindsSettingToggle
                isShowing={!hideKeybinds}
                onToggle={(newShow) => handleHideKeybindsChange(!newShow)}
              />
            </SettingItem>
          </SettingsSection>
        </div>
      </SheetContent>
    </Sheet>
  );
}
