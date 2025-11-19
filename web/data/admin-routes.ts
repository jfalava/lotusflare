// data/admin-routes.ts
import {
  User,
  Plus,
  DraftingCompass,
  BookMarked,
  Package,
  SquareLibrary,
} from "lucide-react";
import type { AppRoute } from "@/components/ui/nav-menu";

export const adminRoutes: AppRoute[] = [
  {
    label: "Deckbuilder",
    path: "/edit/decks",
    Icon: DraftingCompass,
    children: [
      { label: "All decks", path: "/edit/decks", Icon: User },
      {
        label: "New deck",
        path: "/edit/decks/new",
        Icon: Plus,
      },
    ],
  },
  {
    label: "Collection",
    path: "/edit/inventory",
    Icon: SquareLibrary,
    children: [
      {
        label: "Places",
        path: "/edit/places",
        Icon: BookMarked,
      },
      {
        label: "Inventory",
        path: "/edit/inventory",
        Icon: Package,
      },
    ],
  },
];
