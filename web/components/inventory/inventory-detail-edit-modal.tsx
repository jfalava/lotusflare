// components/inventory/inventory-detail-edit-modal.tsx
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { LANGUAGE_OPTIONS } from "@/components/inventory/shared/inventory-constants";
import type {
  InventoryDetailWithCardDetails,
  PlaceDbo,
  CardCondition,
} from "#/backend/src/types";

interface InventoryDetailEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: InventoryDetailWithCardDetails;
  places: PlaceDbo[];
  onSave: (updatedDetail: InventoryDetailWithCardDetails) => Promise<void>;
}

const CONDITIONS: CardCondition[] = ["NM", "LP", "MP", "HP", "DMG", "Sealed"];

export const InventoryDetailEditModal: React.FC<
  InventoryDetailEditModalProps
> = ({ open, onOpenChange, detail, places, onSave }) => {
  const [formData, setFormData] = useState({
    quantity: detail.quantity,
    condition: detail.condition,
    is_foil: detail.is_foil,
    language: detail.language,
    place_id: detail.place_id,
    notes: detail.notes || "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/v2/inventory/details/${detail.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: formData.quantity,
          condition: formData.condition,
          is_foil: formData.is_foil,
          language: formData.language,
          place_id: formData.place_id,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          (errorData as { message?: string }).message ||
            "Failed to update inventory detail",
        );
      }

      const updatedDetail =
        (await response.json()) as InventoryDetailWithCardDetails;
      await onSave(updatedDetail);
      toast.success("Inventory item updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update inventory item",
      );
      console.error("Error updating inventory detail:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      quantity: detail.quantity,
      condition: detail.condition,
      is_foil: detail.is_foil,
      language: detail.language,
      place_id: detail.place_id,
      notes: detail.notes || "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Edit {detail.card.name}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{detail.card.set.toUpperCase()}</span>
              <span>#{detail.card.collector_number}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="999"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    quantity: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="condition"
                    variant="outline"
                    className="w-full justify-between"
                    disabled={isLoading}
                  >
                    {formData.condition}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[150px]">
                  <Command>
                    <CommandInput placeholder="Search condition..." />
                    <CommandEmpty>No condition found.</CommandEmpty>
                    <CommandGroup>
                      {CONDITIONS.map((c) => (
                        <CommandItem
                          key={c}
                          value={c}
                          onSelect={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              condition: value as CardCondition,
                            }))
                          }
                        >
                          {c}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="language"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    disabled={isLoading}
                  >
                    <span>
                      {
                        LANGUAGE_OPTIONS.find(
                          (l) => l.code === formData.language,
                        )?.flag
                      }
                    </span>
                    <span>
                      {
                        LANGUAGE_OPTIONS.find(
                          (l) => l.code === formData.language,
                        )?.nativeName
                      }
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[200px]">
                  <Command>
                    <CommandInput placeholder="Search language..." />
                    <CommandEmpty>No language found.</CommandEmpty>
                    <CommandGroup>
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <CommandItem
                          key={lang.code}
                          value={lang.name}
                          onSelect={() =>
                            setFormData((prev) => ({
                              ...prev,
                              language: lang.code,
                            }))
                          }
                          className="flex gap-2"
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.nativeName}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="place">Location</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="place"
                    variant="outline"
                    className="w-full justify-between"
                    disabled={isLoading}
                  >
                    {formData.place_id === null
                      ? "No location"
                      : places.find((p) => p.id === formData.place_id)?.name}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[200px]">
                  <Command>
                    <CommandInput placeholder="Search location..." />
                    <CommandEmpty>No location found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() =>
                          setFormData((prev) => ({ ...prev, place_id: null }))
                        }
                      >
                        No location
                      </CommandItem>
                      {places
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((place) => (
                          <CommandItem
                            key={place.id}
                            value={place.name}
                            onSelect={() =>
                              setFormData((prev) => ({
                                ...prev,
                                place_id: place.id,
                              }))
                            }
                          >
                            {place.name}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_foil"
              checked={formData.is_foil}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  is_foil: !!checked,
                }))
              }
              disabled={isLoading}
            />
            <Label
              htmlFor="is_foil"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Premium finish
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              placeholder="Add any notes about this card..."
              rows={3}
              maxLength={500}
              disabled={isLoading}
            />
            <div className="text-xs text-muted-foreground text-right">
              {formData.notes.length}/500
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
