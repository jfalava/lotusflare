"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Info,
} from "lucide-react";
import {
  type LegalityCheckCardInfo,
  checkDeckSize,
  checkMaxCopies,
  checkCommanderRules,
  checkOathbreakerRules,
} from "@/components/decks/legality-rules";

interface DeckLegalityNoticeProps {
  deckId?: string;
  deckFormat: string;
  mainboardCards: LegalityCheckCardInfo[];
  className?: string;
}

type LegalityStatus = "legal" | "illegal" | "unknown" | "checking";
interface LegalityState {
  status: LegalityStatus;
  issues: string[];
  apiCheckedFormat?: string;
  clientCheckedFormat?: string;
}

export const DeckLegalityNotice: React.FC<DeckLegalityNoticeProps> = ({
  deckId,
  deckFormat,
  mainboardCards,
  className,
}) => {
  const [legality, setLegality] = useState<LegalityState>({
    status: "unknown",
    issues: [],
  });
  const [isCheckingApi, setIsCheckingApi] = useState(false);

  const totalMainboardCards = useMemo(
    () => mainboardCards.reduce((sum, card) => sum + card.quantity, 0),
    [mainboardCards],
  );

  const runCheck = useCallback(async () => {
    if (!deckId && deckFormat !== "custom") {
      setLegality({
        status: "unknown",
        issues: ["Deck must be saved to check full API legality."],
        clientCheckedFormat: deckFormat,
      });
      return;
    }

    setIsCheckingApi(true);
    setLegality((prev) => ({
      ...prev,
      status: "checking",
      issues: [],
      clientCheckedFormat: deckFormat,
    }));

    const currentIssues: string[] = [];

    const sizeIssue = checkDeckSize(deckFormat, totalMainboardCards);
    if (sizeIssue) currentIssues.push(sizeIssue);

    const maxCopiesIssues = checkMaxCopies(deckFormat, mainboardCards);
    currentIssues.push(...maxCopiesIssues);

    if (deckFormat.toLowerCase() === "commander") {
      currentIssues.push(...checkCommanderRules(mainboardCards));
    } else if (deckFormat.toLowerCase() === "oathbreaker") {
      currentIssues.push(...checkOathbreakerRules(mainboardCards));
    }

    if (deckId) {
      try {
        const response = await fetch(
          `/api/decks/${deckId}/legality?format=${encodeURIComponent(deckFormat)}`,
        );
        if (response.ok) {
          const apiResult = (await response.json()) as {
            is_legal: boolean;
            illegal_cards: Array<{
              name: string;
              scryfall_id: string;
              status: string;
            }>;
          };
          if (!apiResult.is_legal && Array.isArray(apiResult.illegal_cards)) {
            apiResult.illegal_cards.forEach((ic) => {
              currentIssues.push(
                `${ic.name} is ${(ic.status ?? "illegal").toString().replace(/_/g, " ")} in ${deckFormat}.`,
              );
            });
          }
          setLegality((prev) => ({ ...prev, apiCheckedFormat: deckFormat }));
        } else {
          const errorData = (await response.json().catch(() => ({}))) as {
            message?: string;
            details?: string;
          };
          const apiErrorMessage =
            errorData.message ||
            errorData.details ||
            `API Error: ${response.status}`;
          currentIssues.push(
            `Server could not verify card restrictions: ${apiErrorMessage}.`,
          );
        }
      } catch (error) {
        let msg =
          "Network error: Failed to connect to server for legality check.";
        if (error instanceof Error && error.message)
          msg += ` (${error.message})`;
        else if (typeof error === "string" && error) msg += ` (${error})`;
        currentIssues.push(msg);
      }
    } else if (deckFormat !== "custom") {
      currentIssues.push(
        "Individual card restrictions will be checked by the server once the deck is saved.",
      );
    }

    setIsCheckingApi(false);
    setLegality((prev) => ({
      ...prev,
      status: currentIssues.length > 0 ? "illegal" : "legal",
      issues: currentIssues,
    }));
  }, [deckId, deckFormat, mainboardCards, totalMainboardCards]);

  useEffect(() => {
    const t = setTimeout(() => runCheck(), 1200);
    return () => clearTimeout(t);
  }, [runCheck]);

  let IconComponent = ShieldQuestion as typeof Loader2;
  let iconColor = "text-muted-foreground";
  let titleMessage = "Legality Status";
  let detailMessage = "Legality will be checked automatically.";

  if (legality.status === "checking" || isCheckingApi) {
    IconComponent = Loader2;
    iconColor = "text-blue-500";
    titleMessage = `Checking for ${deckFormat}...`;
    detailMessage = "Please wait while we verify your deck.";
  } else if (
    legality.clientCheckedFormat !== deckFormat &&
    legality.apiCheckedFormat !== deckFormat
  ) {
    titleMessage = `Legality for ${deckFormat}`;
    detailMessage = "Rules will be applied for the new format.";
    IconComponent = Info;
  } else if (legality.status === "legal") {
    IconComponent = ShieldCheck;
    iconColor = "text-green-600 dark:text-green-400";
    titleMessage = `Legal for ${legality.clientCheckedFormat || deckFormat}`;
    detailMessage = "This deck appears to meet all format requirements.";
  } else if (legality.status === "illegal") {
    IconComponent = ShieldAlert;
    iconColor = "text-red-600 dark:text-red-400";
    titleMessage = `Issues for ${legality.clientCheckedFormat || deckFormat}`;
    detailMessage = "This deck has one or more issues:";
  } else if (legality.status === "unknown") {
    titleMessage = `Legality for ${deckFormat}`;
    detailMessage =
      legality.issues[0] || "Add cards or save the deck to check legality.";
  }

  return (
    <div className={className}>
      <div className="flex items-center mb-2">
        <IconComponent
          className={`mr-2 h-6 w-6 ${iconColor} ${legality.status === "checking" || isCheckingApi ? "animate-spin" : ""}`}
        />
        <h2 className={`text-lg font-semibold ${iconColor}`}>{titleMessage}</h2>
      </div>
      <div
        className={`p-3 rounded-md bg-muted/50 border text-sm ${
          legality.status === "illegal"
            ? "border-red-500/50"
            : legality.status === "legal"
              ? "border-green-500/50"
              : "border-border"
        }`}
      >
        <p className="text-muted-foreground">{detailMessage}</p>
        {legality.status === "illegal" && legality.issues.length > 0 && (
          <ul className="list-disc list-inside text-xs mt-1.5 pl-1 space-y-0.5 text-red-700 dark:text-red-400">
            {legality.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DeckLegalityNotice;
