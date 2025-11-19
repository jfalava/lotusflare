// data/admin-routes.ts
import { LayoutDashboard, Archive } from "lucide-react";
import type { AppRoute } from "@/components/ui/nav-menu";

export const regularRoutes: AppRoute[] = [
  {
    label: "Decklists",
    path: "/decks",
    Icon: LayoutDashboard,
  },
  {
    label: "Inventory",
    path: "/inventory",
    Icon: Archive,
  },
];
