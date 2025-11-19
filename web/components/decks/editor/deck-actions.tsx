// components/deck/editor/deck-actions.tsx
"use client";

import React from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Loader2, Trash2, Save } from "lucide-react";
import { useKeyPress } from "@/hooks/useKeyPress";

interface DeckActionsProps {
  deckId?: string;
  isSaving: boolean;
  isDeleting: boolean;
  onDeleteClick: () => void;
  onSaveClick: () => void;
}

const DeckActions: React.FC<DeckActionsProps> = ({
  deckId,
  isSaving,
  isDeleting,
  onDeleteClick,
  onSaveClick,
}) => {
  const isDisabled = isSaving || isDeleting;

  useKeyPress("s", onSaveClick, { alt: true, disabled: isDisabled });
  useKeyPress("d", onDeleteClick, {
    ctrl: true,
    alt: true,
    disabled: isDisabled || !deckId,
  });

  return (
    <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-end gap-3 overflow-visible">
      {deckId && (
        <Button
          variant="destructive"
          onClick={onDeleteClick}
          disabled={isDisabled}
          className="w-full sm:w-48 lg:w-fit"
        >
          <div className="flex w-full items-center">
            <div className="flex items-center gap-2 mr-2">
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Deck
            </div>
            <div className="flex-grow" />
            <div className="hidden items-center gap-1 lg:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>Alt</Kbd>
              <Kbd>D</Kbd>
            </div>
          </div>
        </Button>
      )}
      <Button
        onClick={onSaveClick}
        disabled={isDisabled}
        className={clsx(
          "w-full sm:w-48 lg:w-fit bg-green-600 hover:bg-green-700 text-white",
        )}
      >
        <div className="flex w-full items-center">
          <div className="flex items-center gap-2 mr-2">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {deckId ? "Save Changes" : "Create Deck"}
          </div>
          <div className="flex-grow" />
          <div className="hidden items-center gap-1 lg:flex">
            <Kbd>Alt</Kbd>
            <Kbd>S</Kbd>
          </div>
        </div>
      </Button>
    </div>
  );
};

export default DeckActions;
