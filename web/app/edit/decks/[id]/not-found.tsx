import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ListChecks, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container mx-auto py-16 text-center">
      <ListChecks className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
      <h1 className="text-4xl font-bold mb-4">Deck Not Found</h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        The deck you're looking for doesn't exist, has been deleted, or you
        don't have permission to edit it.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild variant="outline">
          <Link href="/edit/decks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Decks
          </Link>
        </Button>
        <Button asChild>
          <Link href="/edit/decks/new">Create New Deck</Link>
        </Button>
      </div>
    </div>
  );
}
