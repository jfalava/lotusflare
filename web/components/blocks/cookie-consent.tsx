// components/blocks/cookie-consent.tsx
"use client";

import * as React from "react";
import Cookies from "js-cookie";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { COOKIE_CONSENT_KEY } from "@/lib/cookies-with-consent";

/* ------------------------------------------------------------------ */
/* tiny pure helper – runs outside React                              */
/* ------------------------------------------------------------------ */
function getCookieConsent(): boolean | null {
  if (typeof window === "undefined") return null; // SSR guard
  const consent = Cookies.get(COOKIE_CONSENT_KEY);
  if (consent === undefined) return null;
  return consent === "true";
}

/* ------------------------------------------------------------------ */
/* component                                                          */
/* ------------------------------------------------------------------ */
interface CookieConsentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "small" | "mini";
  demo?: boolean;
  onAcceptCallback?: () => void;
  onDeclineCallback?: () => void;
  description?: string;
  learnMoreHref?: string;
}

const CookieConsent = React.forwardRef<HTMLDivElement, CookieConsentProps>(
  (
    {
      variant = "default",
      demo = false,
      onAcceptCallback = () => {},
      onDeclineCallback = () => {},
      className,
      description = "We use cookies to ensure you get the best experience on our website. For more information on how we use cookies, please see our privacy policy.",
      learnMoreHref = "/privacy",
      ...props
    },
    ref,
  ) => {
    /* -------------------------------------------------------------- */
    /* state machine                                                  */
    /* -------------------------------------------------------------- */
    type Status = "idle" | "open" | "closed";
    const [status, setStatus] = React.useState<Status>(() => {
      if (demo) return "open";
      const consent = getCookieConsent();
      return consent === null ? "open" : "closed";
    });

    /* -------------------------------------------------------------- */
    /* handlers                                                       */
    /* -------------------------------------------------------------- */
    const handleAccept = React.useCallback(() => {
      Cookies.set(COOKIE_CONSENT_KEY, "true", { expires: 3650, path: "/" });
      window.dispatchEvent(
        new CustomEvent("cookieConsentChange", { detail: true }),
      );
      onAcceptCallback();
      setStatus("closed");
    }, [onAcceptCallback]);

    const handleDecline = React.useCallback(() => {
      Cookies.set(COOKIE_CONSENT_KEY, "false", { expires: 3650, path: "/" });
      // optional: wipe non-essential cookies
      const allCookies = Cookies.get();
      for (const cookieName in allCookies) {
        if (cookieName !== COOKIE_CONSENT_KEY) {
          Cookies.remove(cookieName, { path: "/" });
        }
      }
      window.dispatchEvent(
        new CustomEvent("cookieConsentChange", { detail: false }),
      );
      onDeclineCallback();
      setStatus("closed");
    }, [onDeclineCallback]);

    /* -------------------------------------------------------------- */
    /* early exit                                                     */
    /* -------------------------------------------------------------- */
    if (status === "closed") return null;

    /* -------------------------------------------------------------- */
    /* render                                                         */
    /* -------------------------------------------------------------- */
    const containerClasses = cn(
      "fixed z-50 transition-all duration-700",
      "translate-y-0 opacity-100",
      className,
    );

    const commonWrapperProps = {
      ref,
      className: cn(
        containerClasses,
        variant === "mini"
          ? "left-0 right-0 sm:left-4 bottom-4 w-full sm:max-w-3xl"
          : "bottom-0 left-0 right-0 sm:left-4 sm:bottom-4 w-full sm:max-w-md",
      ),
      ...props,
    };

    /* ---------- variants ---------- */
    if (variant === "default") {
      return (
        <div {...commonWrapperProps}>
          <Card className="m-3 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Yes, cookies</CardTitle>
              <Cookie className="h-5 w-5" />
            </CardHeader>
            <CardContent className="space-y-2">
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
              <p className="text-xs text-muted-foreground">
                By clicking <span className="font-medium">"Accept"</span>, you
                agree to our use of cookies.
              </p>
              <a
                href={learnMoreHref}
                className="text-xs text-primary underline underline-offset-4 hover:no-underline"
              >
                Learn more
              </a>
            </CardContent>
            <CardFooter className="flex gap-2 pt-2">
              <Button
                onClick={handleDecline}
                variant="secondary"
                className="flex-1"
              >
                Decline
              </Button>
              <Button onClick={handleAccept} className="flex-1">
                Accept
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    if (variant === "small") {
      return (
        <div {...commonWrapperProps}>
          <Card className="m-3 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-0 px-4">
              <CardTitle className="text-base">We use cookies</CardTitle>
              <Cookie className="h-4 w-4" />
            </CardHeader>
            <CardContent className="pt-0 pb-2 px-4">
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            </CardContent>
            <CardFooter className="flex gap-2 h-0 py-2 px-4">
              <Button
                onClick={handleDecline}
                variant="secondary"
                size="sm"
                className="flex-1 rounded-full"
              >
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                size="sm"
                className="flex-1 rounded-full"
              >
                Accept
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    if (variant === "mini") {
      return (
        <div {...commonWrapperProps}>
          <Card className="mx-3 p-0 py-3 shadow-lg">
            <CardContent className="sm:flex grid gap-4 p-0 px-3.5">
              <CardDescription className="text-xs sm:text-sm flex-1">
                {description}
              </CardDescription>
              <div className="flex items-center gap-2 justify-end sm:gap-3">
                <Button
                  onClick={handleDecline}
                  size="sm"
                  variant="secondary"
                  className="text-xs h-7"
                >
                  Decline
                  <span className="sr-only sm:hidden">Decline</span>
                </Button>
                <Button
                  onClick={handleAccept}
                  size="sm"
                  className="text-xs h-7"
                >
                  Accept
                  <span className="sr-only sm:hidden">Accept</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return null;
  },
);

CookieConsent.displayName = "CookieConsent";
export { CookieConsent };
export default CookieConsent;
