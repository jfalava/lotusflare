// components/ui/app-breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Fragment, useEffect, useRef, startTransition } from "react";
import { useBreadcrumbReplacements } from "@/components/context/breadcrumb-provider";
import { useKeyPress } from "@/hooks/useKeyPress";
import { Kbd } from "@/components/ui/kbd";
import { useTopLoader } from "nextjs-toploader";

/**
 * Adjusted capitalize function that handles numeric segments and hyphenated words
 * @param {string} segment - The string segment to capitalize
 * @returns {string} The capitalized string
 */
function capitalize(segment: string): string {
  if (!segment) return "";
  if (!isNaN(Number(segment))) {
    return segment;
  }
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const router = useRouter();
  const loader = useTopLoader();
  const manualNav = useRef(false);
  const { replacements } = useBreadcrumbReplacements();
  const segments = pathname.split("/").filter(Boolean);

  // once pathname changes after our manual push, finish the loader
  useEffect(() => {
    if (manualNav.current) {
      loader.done();
      manualNav.current = false;
    }
  }, [pathname, loader]);

  // Alt+H → go home
  const onKeyNavHome = (event: KeyboardEvent) => {
    event.preventDefault();
    loader.start();
    manualNav.current = true;
    startTransition(() => {
      router.push("/");
    });
  };
  useKeyPress("h", onKeyNavHome, { alt: true });

  return (
    <Breadcrumb className="overflow-hidden">
      <BreadcrumbList className="items-center flex-nowrap">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Home"
            >
              <Home className="h-4 w-4 shrink-0 md:h-5 md:w-5" />
              <div className="hidden items-center gap-1 lg:flex">
                <Kbd>Alt</Kbd>
                <Kbd>H</Kbd>
              </div>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {segments.length > 0 && (
          <BreadcrumbSeparator>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
          </BreadcrumbSeparator>
        )}

        {segments.map((segment, idx) => {
          const href = "/" + segments.slice(0, idx + 1).join("/");
          const isLast = idx === segments.length - 1;

          const raw = segment;
          let useReplacement = false;

          if (replacements[raw]) {
            const lc = segments.map((s) => s.toLowerCase());
            if (idx === 2 && lc[0] === "edit" && lc[1] === "decks") {
              useReplacement = true;
            } else if (
              idx === 1 &&
              lc[0] === "decks" &&
              segments.length === 2
            ) {
              useReplacement = true;
            }
          }

          const text = useReplacement ? replacements[raw] : capitalize(raw);

          return (
            <Fragment key={href}>
              <BreadcrumbItem
                className={cn(
                  "whitespace-nowrap",
                  isLast && "font-semibold text-foreground",
                )}
              >
                {isLast ? (
                  <BreadcrumbPage
                    className={cn(
                      "text-sm md:text-base lg:text-lg",
                      "truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[300px]",
                    )}
                    title={text}
                  >
                    {text}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    asChild
                    className={cn(
                      "text-sm md:text-base lg:text-lg text-muted-foreground",
                      "hover:text-foreground transition-colors",
                      "truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[200px]",
                    )}
                  >
                    <Link href={href} title={text}>
                      {text}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
                </BreadcrumbSeparator>
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
