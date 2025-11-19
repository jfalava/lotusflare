// @/components/ui/oracle-text-with-symbols.tsx
import React, { Fragment } from "react";
import { ManaCost } from "@/components/ui/mana-cost";
import { cn } from "@/lib/utils";

interface OracleTextWithSymbolsProps {
  text?: string | null;
  /** Additional className for the wrapping <div> element. */
  className?: string;
  /** Size of the mana symbols, defaults to "sm" for inline text. */
  symbolSize?: "xs" | "sm" | "base" | "lg";
}

export const OracleTextWithSymbols: React.FC<OracleTextWithSymbolsProps> = ({
  text,
  className,
  symbolSize = "sm",
}) => {
  if (!text) {
    return null;
  }

  // Pre-process text to wrap loyalty abilities in a custom token.
  // This regex finds loyalty costs like "+1:", "−2:", "0:" at the start of a line.
  // It handles both standard hyphen (-) and unicode minus sign (−).
  const processedText = text.replace(
    /^([+-−]X|[+-−]\d+|0):/gm,
    (match) => `LOYALTY[${match}]`,
  );

  // Regex to split the text by mana symbols AND our custom loyalty tokens.
  const parts = processedText
    .split(/(\{[^{}]+\}|LOYALTY\[.*?\])/g)
    .filter(Boolean);

  return (
    <div className={cn("whitespace-pre-line leading-relaxed", className)}>
      {parts.map((part, index) => {
        if (part.startsWith("{") && part.endsWith("}")) {
          // This part is a mana symbol
          return (
            <ManaCost
              key={`${part}-${index}`}
              manaCost={part}
              size={symbolSize}
              asImage={true}
              className="align-middle relative -top-[0.07em]"
            />
          );
        }
        // Handle our custom loyalty tokens
        if (part.startsWith("LOYALTY[") && part.endsWith("]")) {
          const costWithColon = part.substring(8, part.length - 1); // e.g., "+1:", "−2:", "0:"
          const cost = costWithColon.slice(0, -1); // e.g., "+1", "−2", "0"

          let iconSymbol = "";
          let costValue = "";

          if (cost.startsWith("+")) {
            iconSymbol = "{loyalty-up}";
            costValue = cost.substring(1);
          } else if (cost.startsWith("-") || cost.startsWith("−")) {
            iconSymbol = "{loyalty-down}";
            costValue = cost.substring(1);
          } else if (cost === "0") {
            iconSymbol = "{loyalty-zero}";
            costValue = "0";
          } else {
            // Fallback for 'X' or other unforeseen cases
            iconSymbol = "{loyalty-zero}"; // Use a neutral background
            costValue = cost;
          }

          // Scale the number's font size based on the icon size for consistency
          const textSizeClass = {
            xs: "text-[0.6rem] leading-none",
            sm: "text-xs leading-none",
            base: "text-sm leading-none",
            lg: "text-base leading-none",
          }[symbolSize];
          return (
            <span
              key={`loyalty-${index}`}
              className="inline-flex items-center gap-0.5 font-semibold mr-1.5 whitespace-nowrap align-middle"
            >
              <span className="inline-grid place-items-center relative align-middle">
                <ManaCost
                  manaCost={iconSymbol}
                  size={symbolSize}
                  asImage
                  className="align-middle"
                />
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center font-mono text-white font-bold pointer-events-none",
                    textSizeClass,
                  )}
                  style={{ textShadow: "0 0 2px #000, 0 0 3px #000" }}
                >
                  {costValue}
                </span>
              </span>
              <span>:</span>
            </span>
          );
        }

        // Handle regular text segments.
        return <Fragment key={`text-${index}`}>{part}</Fragment>;
      })}
    </div>
  );
};
