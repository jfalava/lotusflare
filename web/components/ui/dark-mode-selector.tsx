// components/dark-mode-selector.tsx
"use client";

import { useTheme } from "@/components/context/theme-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sun, Moon, Laptop } from "lucide-react";

const darkModeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

export function DarkModeSelector() {
  const { darkMode, setDarkMode } = useTheme();

  return (
    <div>
      <Select
        value={darkMode}
        onValueChange={(value) =>
          setDarkMode(value as "light" | "dark" | "system")
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {darkModeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
