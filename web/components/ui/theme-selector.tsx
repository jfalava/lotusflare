// components/theme-selector.tsx
"use client";

import { useTheme } from "@/components/context/theme-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const colorThemes = [
  {
    value: "default",
    label: "Default",
    color: "bg-gradient-to-r from-white to-black",
  },
  {
    value: "catppuccin",
    label: "Catppuccin",
    color: "bg-gradient-to-r from-[#ba99e5] to-[#191928]",
  },
  {
    value: "clean-slate",
    label: "Clean Slate",
    color: "bg-gradient-to-r from-[#7580e4] to-[#2c3747]",
  },
  {
    value: "melange",
    label: "Melange",
    color: "bg-gradient-to-r from-[#2c2025] to-[#fdb57e]",
  },
  {
    value: "shadcn-gray",
    label: "Shadcn's Gray",
    color: "bg-gradient-to-r from-[#101828] to-[#030712]",
  },
];

export function ThemeSelector() {
  const { colorTheme, setColorTheme } = useTheme();

  return (
    <div>
      <Select value={colorTheme} onValueChange={setColorTheme}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {colorThemes.map((theme) => (
            <SelectItem key={theme.value} value={theme.value}>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${theme.color}`} />
                <span>{theme.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
