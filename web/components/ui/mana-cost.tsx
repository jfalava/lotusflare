// components/ui/mana-cost.tsx
import React from "react";
import { cn } from "@/lib/utils";

interface ManaCostProps {
  manaCost?: string | null;
  size?: "xs" | "sm" | "base" | "lg";
  className?: string;
  asImage?: boolean;
}

const MANA_SYMBOL_MAP: Record<string, string> = {
  // Mana symbols
  "{W}": "ms-w",
  "{U}": "ms-u",
  "{B}": "ms-b",
  "{R}": "ms-r",
  "{G}": "ms-g",
  "{C}": "ms-c",
  "{X}": "ms-x",
  "{Y}": "ms-y",
  "{Z}": "ms-z",
  "{0}": "ms-0",
  "{1}": "ms-1",
  "{2}": "ms-2",
  "{3}": "ms-3",
  "{4}": "ms-4",
  "{5}": "ms-5",
  "{6}": "ms-6",
  "{7}": "ms-7",
  "{8}": "ms-8",
  "{9}": "ms-9",
  "{10}": "ms-10",
  "{11}": "ms-11",
  "{12}": "ms-12",
  "{13}": "ms-13",
  "{14}": "ms-14",
  "{15}": "ms-15",
  "{16}": "ms-16",
  // "{17}": "ms-17", // adjust if your font supports
  // "{18}": "ms-18",
  // "{19}": "ms-19",
  // "{20}": "ms-20",
  "{S}": "ms-s",
  "{P}": "ms-p",
  "{W/P}": "ms-wp",
  "{U/P}": "ms-up",
  "{B/P}": "ms-bp",
  "{R/P}": "ms-rp",
  "{G/P}": "ms-gp",
  "{2/W}": "ms-2w",
  "{2/U}": "ms-2u",
  "{2/B}": "ms-2b",
  "{2/R}": "ms-2r",
  "{2/G}": "ms-2g",
  "{W/U}": "ms-wu",
  "{W/B}": "ms-wb",
  "{U/B}": "ms-ub",
  "{U/R}": "ms-ur",
  "{B/R}": "ms-br",
  "{B/G}": "ms-bg",
  "{R/G}": "ms-rg",
  "{R/W}": "ms-rw",
  "{G/W}": "ms-gw",
  "{G/U}": "ms-gu",
  "{T}": "ms-tap",
  "{Q}": "ms-untap",
  "{E}": "ms-e",
  "{CHAOS}": "ms-chaos",

  // Loyalty symbols
  "{loyalty-up}": "ms-loyalty-up",
  "{loyalty-down}": "ms-loyalty-down",
  "{loyalty-zero}": "ms-loyalty-zero",
  "{loyalty-start}": "ms-loyalty-start",

  // Card-Type icons
  "{artifact}": "ms-artifact",
  "{creature}": "ms-creature",
  "{enchantment}": "ms-enchantment",
  "{instant}": "ms-instant",
  "{land}": "ms-land",
  "{planeswalker}": "ms-planeswalker",
  "{sorcery}": "ms-sorcery",
  "{tribal}": "ms-tribal",
  "{plane}": "ms-plane",
  "{phenomenon}": "ms-phenomenon",
  "{scheme}": "ms-scheme",
  "{conspiracy}": "ms-conspiracy",
  "{vanguard}": "ms-vanguard",
  "{token}": "ms-token",
  "{battle}": "ms-battle",
  "{battle-siege}": "ms-battle-siege",
  "{commander}": "ms-commander",

  // Fallback text/emoji
  _W: "⚪",
  _U: "🔵",
  _B: "⚫",
  _R: "🔴",
  _G: "🟢",
  _C: "◇",
  _X: "X",
  _Y: "Y",
  _Z: "Z",
  _0: "0",
  _1: "1",
  _2: "2",
  _3: "3",
  _4: "4",
  _5: "5",
  _6: "6",
  _7: "7",
  _8: "8",
  _9: "9",
  _10: "⑩",
  _11: "⑪",
  _12: "⑫",
  _13: "⑬",
  _14: "⑭",
  _15: "⑮",
  _16: "⑯",
  _S: "❄️",
  _P: "℗",
  _WP: "WP",
  _UP: "UP",
  _BP: "BP",
  _RP: "RP",
  _GP: "GP",
  _2W: "2W",
  _2U: "2U",
  _2B: "2B",
  _2R: "2R",
  _2G: "2G",
  _WU: "WU",
  _WB: "WB",
  _UB: "UB",
  _UR: "UR",
  _BR: "BR",
  _BG: "BG",
  _RG: "RG",
  _RW: "RW",
  _GW: "GW",
  _GU: "GU",
  _T: "T",
  _Q: "Q",
  _E: "E",
  "_loyalty-up": "[+]",
  "_loyalty-down": "[-]",
  "_loyalty-zero": "[0]",
  "_loyalty-start": "[L]",
};

const sizeClasses: Record<NonNullable<ManaCostProps["size"]>, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

export const ManaCost: React.FC<ManaCostProps> = ({
  manaCost,
  size = "base",
  className,
  asImage = true,
}) => {
  if (!manaCost) return null;

  // split out any {…} tokens
  const parts = manaCost.split(/(\{[^{}]+\})/).filter(Boolean);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5",
        sizeClasses[size],
        className,
      )}
      aria-label={`Symbols: ${manaCost}`}
      title={manaCost}
    >
      {parts.map((part, idx) => {
        if (part.startsWith("{") && part.endsWith("}")) {
          const symbolKey = part;
          const symbolContent = part.slice(1, -1);
          const cssClass = MANA_SYMBOL_MAP[symbolKey];
          // Loyalty symbols should not have the circular background from `ms-cost`.
          const isLoyaltySymbol = cssClass?.startsWith("ms-loyalty-");

          if (asImage && cssClass) {
            return (
              <i
                key={`${symbolKey}-${idx}`}
                className={cn("ms", cssClass, "ms-shadow", {
                  "ms-cost": !isLoyaltySymbol,
                  "align-middle": true,
                })}
                aria-hidden="true"
                title={symbolContent}
              />
            );
          }

          // text fallback
          const textSym = MANA_SYMBOL_MAP[`_${symbolContent}`] || symbolContent;
          return (
            <span
              key={`${symbolKey}-text-${idx}`}
              className="mana-symbol-text tracking-wide"
              aria-hidden="true"
              title={symbolContent}
            >
              {textSym}
            </span>
          );
        }

        // plain text
        return (
          <span key={`text-${idx}`} className="mana-text-separator">
            {part}
          </span>
        );
      })}
    </span>
  );
};

export default ManaCost;
