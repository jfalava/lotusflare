import type { ColorTabDefinition, GridColumnOption } from "./inventory-types";
import { Square, Columns2, Columns3, Columns4 } from "lucide-react";
import type { LanguageCode } from "#/backend/src/types";

export const COLOR_TABS: ReadonlyArray<ColorTabDefinition> = [
  { key: "White", label: "White", manaSymbol: "{W}" },
  { key: "Blue", label: "Blue", manaSymbol: "{U}" },
  { key: "Black", label: "Black", manaSymbol: "{B}" },
  { key: "Red", label: "Red", manaSymbol: "{R}" },
  { key: "Green", label: "Green", manaSymbol: "{G}" },
  { key: "Multicolor", label: "Multicolor", manafontClass: "ms-multicolor" },
  { key: "Colorless", label: "Colorless", manafontClass: "ms-c" },
  { key: "Artifact", label: "Artifacts", manafontClass: "ms-artifact" },
  { key: "Land", label: "Lands", manafontClass: "ms-land" },
];

export const GRID_COLUMN_OPTIONS: ReadonlyArray<GridColumnOption> = [
  { value: 1, label: "1 Column", icon: Square },
  { value: 2, label: "2 Columns", icon: Columns2 },
  { value: 3, label: "3 Columns", icon: Columns3 },
  { value: 4, label: "4 Columns", icon: Columns4 },
];

export const LANGUAGE_OPTIONS: ReadonlyArray<{
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}> = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "zhs", name: "Chinese (Simp.)", nativeName: "简体中文", flag: "🇨🇳" },
  { code: "zht", name: "Chinese (Trad.)", nativeName: "繁體中文", flag: "🇹🇼" },
  { code: "ph", name: "Phyrexian", nativeName: "Phyrexian", flag: "Φ" },
];

export const PAGE_SIZE = 24;
export const CARD_IMAGE_WIDTH_TARGET_GRID = 260; // For grid view
export const STACKED_CARD_VISIBLE_X_OFFSET_PERCENT = 0.18;
