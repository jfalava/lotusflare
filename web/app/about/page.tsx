import { Metadata } from "next";
import AboutClient from "@/components/about/about-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About | Lotusflare",
  description:
    "Learn more about Lotusflare, an open-source MTG inventory and deckbuilding tool.",
  keywords: [
    "About",
    "Lotusflare",
    "MTG",
    "Magic The Gathering",
    "Open Source",
  ],
  robots: "index, follow",
  openGraph: {
    title: "About | Lotusflare",
    description:
      "Learn more about Lotusflare, an open-source MTG inventory and deckbuilding tool.",
    type: "website",
    url: "https://lotusflare.jfa.dev/about",
    siteName: "Lotusflare",
  },
  twitter: {
    card: "summary_large_image",
    title: "About | Lotusflare",
    description:
      "Learn more about Lotusflare, an open-source MTG inventory and deckbuilding tool.",
  },
  alternates: {
    canonical: "https://lotusflare.jfa.dev/about",
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
