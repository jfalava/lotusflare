"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { COOKIE_CONSENT_KEY } from "@/lib/cookies-with-consent";

const CookieConsent = dynamic(
  () => import("@/components/blocks/cookie-consent"),
  {
    ssr: false,
  },
);

export function CookieConsentWrapper() {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const consent = Cookies.get(COOKIE_CONSENT_KEY);
    if (consent === undefined) {
      setShowConsent(true);
      // we intentionally want to set state after the initial render to check for the cookie on the client-side
    }
  }, []);

  if (!showConsent) return null;

  return <CookieConsent variant="small" />;
}
