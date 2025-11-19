// app/edit/decks/new/page.tsx
import { Metadata } from "next";
import { Suspense } from "react";
import DeckEditorClient from "@/components/decks/deck-editor-client";
import { Loader2 } from "lucide-react";

// Force this page to be dynamic for consistency
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Create New Deck | Lotusflare";
  const description =
    "Build a new Magic: The Gathering deck. Search cards, set commanders, manage mainboard and sideboard, and check format legality.";

  return {
    title,
    description,
    keywords: [
      "MTG deck builder",
      "Magic The Gathering deck creation",
      "new deck builder",
      "MTG deck editor",
      "commander deck builder",
      "Magic deck creation",
    ],
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

// Loading component for Suspense
function DeckEditorLoading() {
  return (
    <div className="container mx-auto py-12 px-4 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
      <p className="mt-4 text-lg text-muted-foreground">
        Loading deck editor...
      </p>
    </div>
  );
}

export default function NewDeckPage() {
  return (
    <Suspense fallback={<DeckEditorLoading />}>
      <DeckEditorClient />
    </Suspense>
  );
}
