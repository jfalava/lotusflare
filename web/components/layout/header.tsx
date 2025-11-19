"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { Nav } from "@/components/ui/nav-menu";
import { AppBreadcrumbs } from "@/components/ui/app_breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import { adminRoutes } from "@/data/admin-routes";
import { regularRoutes } from "@/data/regular-routes";

import { SettingsSheet } from "@/components/ui/settings-sheet";
import { EditShortcut } from "@/components/navigation/edit-shortcut";

function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const isAdminRoute = pathname.startsWith("/edit");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <EditShortcut />
      <header
        className={cn(
          "sticky top-0 z-40 w-full border-b bg-background transition-shadow duration-200",
          isScrolled && "shadow-md",
        )}
      >
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex-1 min-w-0 mr-2">
            <AppBreadcrumbs />
          </div>

          <nav className="hidden md:flex md:items-center md:space-x-2 lg:space-x-3">
            <Nav routes={regularRoutes} />
            {isAdminRoute && (
              <>
                <Separator orientation="vertical" className="h-6 !mx-3" />
                <Nav routes={adminRoutes} />
              </>
            )}
          </nav>

          {/* Combined controls for desktop (settings only) and mobile (settings + menu) */}
          <div className="flex items-center gap-2">
            {/* SettingsSheet is always visible if space allows, or part of mobile flow */}
            <div className="hidden md:block">
              {" "}
              {/* Show settings directly on desktop */}
              <SettingsSheet />
            </div>

            {/* Mobile Controls: Settings Button + Mobile Menu Trigger */}
            <div className="flex items-center gap-2 md:hidden">
              <SettingsSheet /> {/* Settings button on mobile */}
              <Sheet key={pathname}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Open main menu"
                  >
                    <MenuIcon className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-full max-w-xs sm:max-w-sm flex flex-col p-0"
                >
                  <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex-grow overflow-y-auto px-5 pb-5 pt-1 space-y-4">
                    <Nav routes={regularRoutes} />
                    {isAdminRoute && (
                      <>
                        <Separator className="my-3" />
                        <div>
                          <h3 className="mb-1 px-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Admin Tools
                          </h3>
                          <Nav routes={adminRoutes} />
                        </div>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;
