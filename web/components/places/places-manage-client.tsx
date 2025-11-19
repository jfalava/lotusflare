// components/places/places-manage-client.tsx
"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  PlusCircle,
  Edit3,
  Trash2,
  Search,
  ArchiveX,
  MapPin,
  X,
} from "lucide-react";
import type {
  PlaceDbo,
  CreatePlacePayload,
  UpdatePlacePayload,
  PlaceType,
} from "#/backend/src/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PLACE_TYPES_ARRAY } from "#/backend/src/validators";

// --- Add/Edit Place Modal ---
interface PlaceFormModalProps {
  mode: "add" | "edit";
  initialData?: PlaceDbo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaceSaved: (place: PlaceDbo) => void;
}

const PlaceFormModal: React.FC<PlaceFormModalProps> = ({
  mode,
  initialData,
  open,
  onOpenChange,
  onPlaceSaved,
}) => {
  const [formData, setFormData] = useState<
    CreatePlacePayload | UpdatePlacePayload
  >(
    mode === "edit" && initialData
      ? {
          name: initialData.name,
          type: initialData.type,
          description: initialData.description ?? "",
        }
      : { name: "", type: "binder", description: "" },
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value as PlaceType }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...formData,
      description: formData.description?.trim()
        ? formData.description.trim()
        : null,
    };

    if (!payload.name?.trim()) {
      toast.error("Place name is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const url =
        mode === "edit" ? `/api/places/${initialData?.id}` : "/api/places";
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          typeof errorData === "object" &&
          errorData !== null &&
          "message" in errorData
            ? String(errorData.message)
            : `Failed to ${mode === "add" ? "create" : "update"} place`;
        throw new Error(errorMessage);
      }
      const savedPlace: PlaceDbo = await response.json();
      toast.success(
        `Place "${savedPlace.name}" ${mode === "add" ? "created" : "updated"} successfully!`,
      );
      onPlaceSaved(savedPlace);
      onOpenChange(false);
    } catch (error) {
      console.error(`Error ${mode}ing place:`, error);
      toast.error(
        error instanceof Error ? error.message : "An unknown error occurred.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add New Place" : "Edit Place"}
          </DialogTitle>
          {mode === "edit" && (
            <DialogDescription>
              Make changes to your storage place.
            </DialogDescription>
          )}
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          id="place-form"
          className="space-y-4 py-2"
        >
          <div>
            <Label htmlFor="name" className="mb-2">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name || ""}
              onChange={handleInputChange}
              placeholder="e.g., Main Binder, Trade Box"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="type" className="mb-2">
              Type
            </Label>
            <Select
              name="type"
              value={formData.type || "binder"}
              onValueChange={(value) => handleSelectChange("type", value)}
              required
            >
              <SelectTrigger id="type" className="mt-1">
                <SelectValue placeholder="Select place type" />
              </SelectTrigger>
              <SelectContent>
                {PLACE_TYPES_ARRAY.map((typeOpt) => (
                  <SelectItem key={typeOpt} value={typeOpt}>
                    {typeOpt.charAt(0).toUpperCase() +
                      typeOpt.slice(1).replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="description" className="mb-2">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleInputChange}
              placeholder="e.g., Contains all rare Modern cards"
              className="mt-1"
            />
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="place-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "add" ? "Create Place" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- Main Client Component ---
interface PlacesManageClientProps {
  initialPlaces: PlaceDbo[];
  initialSearch?: string;
}

export default function PlacesManageClient({
  initialPlaces,
  initialSearch = "",
}: PlacesManageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [places, setPlaces] = useState<PlaceDbo[]>(initialPlaces);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingPlace, setEditingPlace] = useState<PlaceDbo | undefined>(
    undefined,
  );

  const [placeToDelete, setPlaceToDelete] = useState<PlaceDbo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Memoize updateURL to stabilize its reference for the useEffect dependency array
  const updateURL = useCallback(
    (newSearch: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newSearch) {
        params.set("search", newSearch);
      } else {
        params.delete("search");
      }

      const newURL = params.toString()
        ? `?${params.toString()}`
        : "/edit/places";
      router.replace(newURL, { scroll: false });
    },
    [router, searchParams],
  ); // Dependencies of updateURL

  // Handle search with URL updates
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== initialSearch) {
        updateURL(searchTerm);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm, initialSearch, updateURL]);

  const handleOpenAddModal = () => {
    setFormMode("add");
    setEditingPlace(undefined);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (place: PlaceDbo) => {
    setFormMode("edit");
    setEditingPlace(place);
    setIsFormModalOpen(true);
  };

  const handlePlaceSaved = (savedPlace: PlaceDbo) => {
    if (formMode === "add") {
      setPlaces((prev) =>
        [savedPlace, ...prev].sort((a, b) => a.name.localeCompare(b.name)),
      );
    } else {
      setPlaces((prev) =>
        prev
          .map((p) => (p.id === savedPlace.id ? savedPlace : p))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
  };

  const confirmDeletePlace = (place: PlaceDbo) => {
    setPlaceToDelete(place);
  };

  const handleDeletePlace = async () => {
    if (!placeToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/places/${placeToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          typeof errorData === "object" &&
          errorData !== null &&
          "message" in errorData
            ? String(errorData.message)
            : `Failed to delete: ${response.statusText}`,
        );
      }
      setPlaces((prev) => prev.filter((p) => p.id !== placeToDelete.id));
      toast.success(`Place "${placeToDelete.name}" deleted.`);
      setPlaceToDelete(null);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete place.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearchClear = () => {
    setSearchTerm("");
    updateURL("");
    searchInputRef.current?.focus();
  };

  const filteredPlaces = useMemo(() => {
    if (!searchTerm.trim()) return places;
    return places.filter(
      (place) =>
        place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [places, searchTerm]);

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 md:px-6">
      <Card className="shadow-lg border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-semibold">
              Manage Storage Places
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Organize your card storage locations
            </p>
          </div>
          <Button onClick={handleOpenAddModal}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Place
          </Button>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="mb-6">
            <div className="relative">
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Filter places by name, type, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 h-10 text-base"
                aria-label="Filter places"
              />
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={20}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary h-7 w-7"
                  onClick={handleSearchClear}
                  aria-label="Clear filter"
                >
                  <X size={16} />
                </Button>
              )}
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4 text-sm text-muted-foreground">
            {searchTerm ? (
              <>
                {filteredPlaces.length} place
                {filteredPlaces.length !== 1 ? "s" : ""} found
                {filteredPlaces.length !== places.length && (
                  <> out of {places.length} total</>
                )}
              </>
            ) : (
              <>
                Showing {places.length} place{places.length !== 1 ? "s" : ""}
              </>
            )}
          </div>

          {filteredPlaces.length === 0 ? (
            searchTerm ? (
              <EmptyState
                title="No Places Match Filter"
                message={`No places found for "${searchTerm}". Try a different filter or add a new place.`}
                icon={<ArchiveX className="h-16 w-16 text-muted-foreground" />}
                action={
                  <Button onClick={handleSearchClear} variant="outline">
                    Clear Filter
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No Storage Places Yet"
                message="Click 'Add New Place' to create your first storage location (e.g., binder, box)."
                icon={<MapPin className="h-16 w-16 text-muted-foreground" />}
                action={
                  <Button onClick={handleOpenAddModal} size="lg">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add First Place
                  </Button>
                }
              />
            )
          ) : (
            <div className="space-y-3">
              {filteredPlaces.map((place) => (
                <Card
                  key={place.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex-grow mb-2 sm:mb-0">
                    <h3 className="font-semibold text-lg">{place.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Type:{" "}
                      <span className="font-medium text-foreground">
                        {place.type.charAt(0).toUpperCase() +
                          place.type.slice(1).replace("_", " ")}
                      </span>
                    </p>
                    {place.description && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {place.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(place.created_at).toLocaleDateString()}
                      {place.updated_at !== place.created_at && (
                        <>
                          {" "}
                          • Updated:{" "}
                          {new Date(place.updated_at).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(place)}
                    >
                      <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/50"
                      onClick={() => confirmDeletePlace(place)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <PlaceFormModal
        key={editingPlace?.id || "add"}
        mode={formMode}
        initialData={editingPlace}
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        onPlaceSaved={handlePlaceSaved}
      />

      {/* Delete Confirmation Dialog */}
      {placeToDelete && (
        <AlertDialog
          open={!!placeToDelete}
          onOpenChange={() => setPlaceToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the place{" "}
                <strong>"{placeToDelete.name}"</strong>. Any inventory items
                assigned to this place will become "Unassigned". This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePlace}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isDeleting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete Place
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
