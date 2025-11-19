"use client";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ListTree, PlusCircle } from "lucide-react";
import Link from "next/link";
import React from "react";

// Quick action buttons data
const quickActions = [
  {
    icon: PlusCircle,
    label: "Add Cards",
    href: "/edit/inventory",
    color: "blue" as const,
    shortcut: ["Alt", "A"],
  },
  {
    icon: ListTree,
    label: "New Deck",
    href: "/edit/decks",
    color: "green" as const,
    shortcut: ["Alt", "N"],
  },
];

const QuickActions = () => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {quickActions.map((action) => (
        <Button
          key={action.href}
          asChild
          variant="outline"
          size="lg"
          className="h-auto p-4 flex-col space-y-2"
        >
          <Link href={action.href}>
            <action.icon className="h-6 w-6" />
            <span className="font-medium text-sm">{action.label}</span>
            <div className="flex items-center space-x-1">
              {action.shortcut.map((key, index) => (
                <Kbd key={`${key}-${index}`} className="text-xs">
                  {key}
                </Kbd>
              ))}
            </div>
          </Link>
        </Button>
      ))}
    </div>
  );
};

export default QuickActions;
