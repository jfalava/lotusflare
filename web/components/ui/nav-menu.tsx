// components/ui/nav-menu.tsx
"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useKeyPress } from "@/hooks/useKeyPress";
import { useTopLoader } from "nextjs-toploader";
import { Kbd } from "@/components/ui/kbd";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export interface AppRoute {
  label: string;
  path: string;
  Icon?: LucideIcon;
  children?: AppRoute[];
}

type NavProps = {
  routes: AppRoute[];
};

function NavItem({ route }: { route: AppRoute }) {
  const pathname = usePathname();
  const isActive = pathname === route.path || pathname.startsWith(route.path);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const router = useRouter();
  const loader = useTopLoader();
  const manualNav = useRef(false);
  const [isChildMenuOpen, setIsChildMenuOpen] = useState(false);

  // once App-Router finishes and `pathname` changes, hide the loader
  useEffect(() => {
    if (manualNav.current) {
      loader.done();
      manualNav.current = false;
    }
  }, [pathname, loader]);

  // wrapper to start loader + App-Router push
  const onKeyNav = (path: string) => (event: KeyboardEvent) => {
    event.preventDefault();
    loader.start();
    manualNav.current = true;
    startTransition(() => {
      router.push(path);
    });
  };

  useKeyPress("d", onKeyNav("/decks"), { alt: true });
  useKeyPress("i", onKeyNav("/inventory"), { alt: true });

  if (route.children && route.children.length > 0) {
    return (
      <DropdownMenu
        key={pathname}
        open={isChildMenuOpen}
        onOpenChange={setIsChildMenuOpen}
      >
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between rounded-md " +
                "px-3 py-2 text-sm font-medium transition-colors md:w-auto",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              {route.Icon && <route.Icon className="h-4 w-4" />}
              <span>{route.label}</span>
            </span>
            <ChevronDown
              className={cn(
                "ml-1 h-4 w-4 transition-transform duration-200",
                isChildMenuOpen && "rotate-180",
              )}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isDesktop ? "start" : "center"}
          sideOffset={8}
          className="w-[var(--radix-dropdown-menu-trigger-width)] p-1"
        >
          {route.children.map((child) => {
            const isChildActive = pathname === child.path;
            return (
              <DropdownMenuItem
                key={child.path}
                asChild
                className={cn(
                  "w-full",
                  isChildActive && "bg-accent text-accent-foreground",
                )}
              >
                <Link
                  href={child.path}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  {child.Icon && <child.Icon className="h-4 w-4" />}
                  <span>{child.label}</span>
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link
      href={route.path}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 " +
          "text-sm font-medium transition-colors md:w-auto",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {route.Icon && <route.Icon className="h-4 w-4" />}
      <span className="flex items-center gap-2">
        <span>{route.label}</span>
        {route.path === "/decks" && (
          <span className="hidden items-center gap-1 ml-1 lg:flex">
            <Kbd>Alt</Kbd>
            <Kbd>D</Kbd>
          </span>
        )}
        {route.path === "/inventory" && (
          <span className="hidden items-center gap-1 ml-1 lg:flex">
            <Kbd>Alt</Kbd>
            <Kbd>I</Kbd>
          </span>
        )}
      </span>
    </Link>
  );
}

export function Nav({ routes }: NavProps) {
  const isMobileScreen = useMediaQuery("(max-width: 767px)");

  return (
    <nav
      suppressHydrationWarning
      className={cn(
        "flex gap-1 items-center",
        isMobileScreen ? "flex-col w-full items-stretch" : "flex-row",
      )}
    >
      {routes.map((route) => (
        <NavItem key={route.path} route={route} />
      ))}
    </nav>
  );
}
