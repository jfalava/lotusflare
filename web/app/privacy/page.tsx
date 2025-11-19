import { Metadata } from "next";
import PrivacyClient from "@/components/privacy/privacy-client";
import { Suspense } from "react";
import PrivacySkeleton from "@/components/privacy/privacy-skeleton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy | Lotusflare",
  description:
    "Learn how Lotusflare collects, stores, and protects your data. Transparent privacy policy for your MTG collection.",
  keywords: [
    "Privacy Policy",
    "Lotusflare",
    "MTG",
    "Magic The Gathering",
    "Data Protection",
    "Cookies",
    "Telemetry",
  ],
  robots: "index, follow",
  openGraph: {
    title: "Privacy Policy | Lotusflare",
    description: "Transparent privacy policy for your MTG collection.",
    type: "website",
    url: "https://lotusflare.jfa.dev/privacy",
    siteName: "Lotusflare",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Lotusflare",
    description: "Transparent privacy policy for your MTG collection.",
  },
  alternates: {
    canonical: "https://lotusflare.jfa.dev/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <Suspense fallback={<PrivacySkeleton />}>
      <PrivacyClient />
    </Suspense>
  );
}
