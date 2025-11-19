"use client";

import React from "react";
import { useTheme } from "@/components/context/theme-provider";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

const sansFonts: Option[] = [
  { value: "default", label: "System" },
  { value: "atlassian-sans", label: "Atlassian Sans" },
  { value: "pretendard-variable", label: "Pretendard" },
  { value: "open-dyslexic", label: "Open Dyslexic" },
];

const monoFonts: Option[] = [
  { value: "default", label: "System" },
  { value: "berkeley-mono", label: "Berkeley Mono" },
  { value: "geist-mono", label: "Geist Mono" },
  { value: "google-sans-code", label: "Google Sans Code" },
];

interface FontSelectorProps {
  family: "sans" | "mono";
}

export function FontSelector({ family }: FontSelectorProps) {
  const { fontSans, fontMono, setFontSans, setFontMono } = useTheme();

  const options = family === "sans" ? sansFonts : monoFonts;
  const value = family === "sans" ? fontSans : fontMono;
  const onChange = family === "sans" ? setFontSans : setFontMono;
  const getFontStack = (value: string) => {
    if (family === "sans") {
      switch (value) {
        case "atlassian-sans":
          return `"Atlassian Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        case "pretendard-variable":
          return `"Pretendard Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        case "open-dyslexic":
          return `"Open Dyslexic", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
        default:
          return `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      }
    } else {
      switch (value) {
        case "berkeley-mono":
          return `"Berkeley Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
        case "geist-mono":
          return `"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
        case "google-sans-code":
          return `"Google Sans Code", ui-monospace, SFMono-Regular, Menlo, monospace`;
        default:
          return `ui-monospace, SFMono-Regular, Menlo, monospace`;
      }
    }
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select font" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span style={{ fontFamily: getFontStack(opt.value) }}>
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
