import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArchiveX, ArrowLeft } from "lucide-react";

export default function DeckNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center px-4">
      <ArchiveX className="h-16 w-16 text-muted-foreground mb-4" />
      <h1 className="text-4xl font-bold tracking-tight mb-2">Deck Not Found</h1>
      <p className="text-xl text-muted-foreground mb-6 max-w-md">
        The deck you're looking for doesn't exist or may have been removed.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild variant="outline">
          <Link href="/decks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Browse All Decks
          </Link>
        </Button>
        <Button asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
