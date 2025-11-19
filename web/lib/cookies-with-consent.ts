"use client";

import Cookies from "js-cookie";

export const COOKIE_CONSENT_KEY = "cookieConsent";

export const hasCookieConsent = (): boolean => {
  if (typeof window === "undefined") return false;
  const consent = Cookies.get(COOKIE_CONSENT_KEY);
  return consent === "true";
};

export const setCookieWithConsent = (
  name: string,
  value: string,
  options?: Cookies.CookieAttributes,
): boolean => {
  if (!hasCookieConsent()) {
    console.warn(`Cookie consent not given, not setting cookie: ${name}`);
    return false;
  }
  Cookies.set(name, value, options);
  return true;
};

export const getCookieWithConsent = (name: string): string | undefined => {
  if (!hasCookieConsent()) return undefined;
  return Cookies.get(name);
};

export const removeCookie = (name: string): void => {
  Cookies.remove(name);
};
