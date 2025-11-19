// components/deck/deck-editor-client.tsx
"use client";
import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import DeckEditor from "@/components/decks/editor/deck-editor";

export default function DeckEditorClient({ deckId }: { deckId?: string }) {
  return (
    <DndProvider backend={HTML5Backend}>
      <DeckEditor deckId={deckId} />
    </DndProvider>
  );
}
