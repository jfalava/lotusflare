// components/decks/deck-statistics.tsx
"use client";

import React, { useCallback, useMemo, useSyncExternalStore } from "react";
import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Target,
  Zap,
  Palette,
  Droplets,
  Globe,
  Sigma,
  Hash,
} from "lucide-react";
import type { DeckWithDetails, ScryfallApiCard } from "#/backend/src/types";
import { ManaCost } from "@/components/ui/mana-cost";
import { getPrimaryCardType } from "@/utils/card-utils";

type ManaSources = Record<"W" | "U" | "B" | "R" | "G" | "C" | "M", number>;
type ManaPips = Record<
  "W" | "U" | "B" | "R" | "G" | "C" | "P" | "Generic",
  number
>;

const BASIC_LAND_TYPE_TO_MANA: Record<string, keyof ManaSources> = {
  plains: "W",
  island: "U",
  swamp: "B",
  mountain: "R",
  forest: "G",
};

/**
 * A robust, heuristic-based function to determine the mana a card can produce.
 */
const getManaSources = (card: ScryfallApiCard): ManaSources => {
  const sources: ManaSources = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, M: 0 };
  const typeLine = (card.type_line || "").toLowerCase();

  // Only consider permanents as ongoing mana sources.
  const isPermanent =
    typeLine.includes("land") ||
    typeLine.includes("creature") ||
    typeLine.includes("artifact") ||
    typeLine.includes("enchantment") ||
    typeLine.includes("planeswalker") ||
    typeLine.includes("battle");

  if (!isPermanent) {
    return sources;
  }

  // Check for intrinsic basic land abilities first.
  if (typeLine.includes("basic") && typeLine.includes("land")) {
    if (typeLine.includes("plains")) {
      sources.W = 1;
      return sources;
    }
    if (typeLine.includes("island")) {
      sources.U = 1;
      return sources;
    }
    if (typeLine.includes("swamp")) {
      sources.B = 1;
      return sources;
    }
    if (typeLine.includes("mountain")) {
      sources.R = 1;
      return sources;
    }
    if (typeLine.includes("forest")) {
      sources.G = 1;
      return sources;
    }
  }

  // Combine oracle text from all faces for comprehensive analysis.
  const allOracleTexts: string[] = [card.oracle_text || ""];
  if (card.card_faces) {
    card.card_faces.forEach((face) => {
      if (face.oracle_text) {
        allOracleTexts.push(face.oracle_text);
      }
    });
  }
  const combinedOracleText = allOracleTexts.join("\n").toLowerCase();

  // Heuristic 1: "Any Color" producers.
  if (
    combinedOracleText.includes("add one mana of any color") ||
    combinedOracleText.includes(
      "mana of any color in your commander's color identity",
    )
  ) {
    sources.M = 1;
  }

  // Heuristic 2: Fetch lands.
  const fetchLandRegex =
    /search your library for an? ([\w\s,]+(?:or [\w\s,]+)*) card/g;
  let fetchMatch;
  while ((fetchMatch = fetchLandRegex.exec(combinedOracleText)) !== null) {
    const landTypesStr = fetchMatch[1];
    for (const landType in BASIC_LAND_TYPE_TO_MANA) {
      if (landTypesStr.includes(landType)) {
        sources[BASIC_LAND_TYPE_TO_MANA[landType]] = 1;
      }
    }
  }

  // Heuristic 3: Explicit "Add {mana}" abilities.
  const addManaRegex = /add ((?:{[WUBRGCXY\d\/P]+}\s*(?:or)?\s*)+)/gi; // Case-insensitive
  let addMatch;
  while ((addMatch = addManaRegex.exec(combinedOracleText)) !== null) {
    const manaPart = addMatch[1];
    const manaSymbols = manaPart.match(/{[wubrgc]}/gi) || []; // Case-insensitive

    if (manaPart.includes(" or ")) {
      manaSymbols.forEach((s) => {
        const color = s.replace(/[{}]/g, "").toUpperCase() as keyof ManaSources;
        sources[color] = 1;
      });
    } else {
      manaSymbols.forEach((s) => {
        const color = s.replace(/[{}]/g, "").toUpperCase() as keyof ManaSources;
        sources[color] = (sources[color] || 0) + 1;
      });
    }
  }

  return sources;
};

/**
 * Calculates the number of each type of mana symbol in a card's mana cost.
 */
const getManaPips = (card: ScryfallApiCard): ManaPips => {
  const pips: ManaPips = {
    W: 0,
    U: 0,
    B: 0,
    R: 0,
    G: 0,
    C: 0,
    P: 0,
    Generic: 0,
  };
  const costStrings: string[] = [];

  if (card.mana_cost) {
    costStrings.push(card.mana_cost);
  }
  if (card.card_faces) {
    card.card_faces.forEach((face) => {
      if (face.mana_cost) {
        costStrings.push(face.mana_cost);
      }
    });
  }

  costStrings.forEach((cost) => {
    const symbols = cost.match(/{([^{}]+)}/g) || [];
    symbols.forEach((symbol) => {
      const s = symbol.replace(/[{}]/g, "");
      if (s.includes("/P")) {
        pips.P += 1;
      } else if (["W", "U", "B", "R", "G"].includes(s)) {
        pips[s as keyof ManaPips] += 1;
      } else if (s === "C") {
        pips.C += 1;
      } else if (!isNaN(parseInt(s, 10))) {
        pips.Generic += parseInt(s, 10);
      }
    });
  });

  return pips;
};

// Color mapping for charts
const TYPE_COLORS = {
  Creature: "#8B5CF6",
  Instant: "#06B6D4",
  Sorcery: "#EF4444",
  Artifact: "#6B7280",
  Enchantment: "#10B981",
  Planeswalker: "#F59E0B",
  Land: "#84CC16",
  Battle: "#EC4899",
  Other: "#64748B",
  Unknown: "#374151",
} as const;

// Better contrast colors for light/dark mode accessibility
const COLOR_IDENTITY_COLORS = {
  W: "#fef3c7", // Old washed yellow
  U: "#3B82F6", // Blue - good contrast
  B: "#94A3B8", // Slate 400 - good contrast on dark backgrounds
  R: "#DC2626", // Red - good contrast
  G: "#059669", // Green - good contrast
  Colorless: "#6B7280", // Gray - good contrast
  Multicolor: "#F59E0B", // Orange - good contrast
} as const;

const COLOR_IDENTITY_NAMES = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
  Colorless: "Colorless",
  Multicolor: "Multicolor",
} as const;

// Rarity colors and text colors for good contrast
const RARITY_STYLES = {
  common: {
    bg: "#64748B",
    text: "#FFFFFF",
  },
  uncommon: {
    bg: "#6B7280",
    text: "#FFFFFF",
  },
  rare: {
    bg: "#F59E0B",
    text: "#000000",
  },
  mythic: {
    bg: "#DC2626",
    text: "#FFFFFF",
  },
  special: {
    bg: "#8B5CF6",
    text: "#FFFFFF",
  },
  bonus: {
    bg: "#059669",
    text: "#FFFFFF",
  },
} as const;

const RARITY_ORDER: Record<string, number> = {
  mythic: 1,
  rare: 2,
  uncommon: 3,
  common: 4,
  special: 5,
  bonus: 6,
};

interface DeckStatisticsProps {
  deck: DeckWithDetails;
}

// Custom hook for media queries
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const matchMedia = window.matchMedia(query);
      matchMedia.addEventListener("change", callback);
      return () => {
        matchMedia.removeEventListener("change", callback);
      };
    },
    [query],
  );

  const getSnapshot = () => {
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

interface PieChartLegendProps {
  data: Array<{
    fill: string;
    percentage: string;
    [key: string]: string | number;
  }>;
  labelKey: string;
}

const PieChartLegend = ({ data, labelKey }: PieChartLegendProps) => (
  <div className="mb-4 grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
    {data.map((entry) => (
      <div key={entry[labelKey] as string} className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{ backgroundColor: entry.fill }}
        />
        <div className="flex-1 truncate">
          {entry[labelKey]}{" "}
          <span className="font-medium text-muted-foreground">
            ({entry.percentage}%)
          </span>
        </div>
      </div>
    ))}
  </div>
);

export default function DeckStatistics({ deck }: DeckStatisticsProps) {
  const stats = useMemo(() => {
    // Only count true mainboard (no sideboard, no maybeboard) for stats
    const mainboardCards =
      deck.cards?.filter((card) => !card.is_sideboard && !card.is_maybeboard) ||
      [];

    const totalCards = mainboardCards.reduce(
      (sum, card) => sum + card.quantity,
      0,
    );

    // Card type distribution
    const typeDistribution = mainboardCards.reduce(
      (acc, card) => {
        const primaryType = getPrimaryCardType(card.card.type_line);
        acc[primaryType] = (acc[primaryType] || 0) + card.quantity;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Mana curve (CMC distribution) - EXCLUDING LANDS
    const manaCurve = mainboardCards
      .filter((card) => getPrimaryCardType(card.card.type_line) !== "Land")
      .reduce(
        (acc, card) => {
          const cmc = Math.min(card.card.cmc || 0, 10); // Cap at 10+ for display
          const cmcKey = cmc >= 10 ? "10+" : cmc.toString();
          acc[cmcKey] = (acc[cmcKey] || 0) + card.quantity;
          return acc;
        },
        {} as Record<string, number>,
      );

    // Color identity distribution
    const colorDistribution = mainboardCards.reduce(
      (acc, card) => {
        const colors = card.card.color_identity || [];
        if (colors.length === 0) {
          acc["Colorless"] = (acc["Colorless"] || 0) + card.quantity;
        } else if (colors.length === 1) {
          const color = colors[0];
          acc[color] = (acc[color] || 0) + card.quantity;
        } else {
          acc["Multicolor"] = (acc["Multicolor"] || 0) + card.quantity;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    // Mana source distribution
    const manaSources = mainboardCards.reduce(
      (acc, cardInDeck) => {
        const cardSources = getManaSources(cardInDeck.card);
        for (const color in cardSources) {
          const key = color as keyof ManaSources;
          if (cardSources[key] > 0) {
            acc[key] += cardSources[key] * cardInDeck.quantity;
          }
        }
        return acc;
      },
      { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, M: 0 } as ManaSources,
    );

    // Total mana symbols (pips) distribution
    const manaSymbolsDistribution = mainboardCards
      .filter((c) => getPrimaryCardType(c.card.type_line) !== "Land")
      .reduce(
        (acc, cardInDeck) => {
          const cardPips = getManaPips(cardInDeck.card);
          for (const key in cardPips) {
            const pipKey = key as keyof ManaPips;
            if (cardPips[pipKey] > 0) {
              acc[pipKey] += cardPips[pipKey] * cardInDeck.quantity;
            }
          }
          return acc;
        },
        {
          W: 0,
          U: 0,
          B: 0,
          R: 0,
          G: 0,
          C: 0,
          P: 0,
          Generic: 0,
        } as ManaPips,
      );

    // Rarity distribution
    const rarityDistribution = mainboardCards.reduce(
      (acc, card) => {
        const rarity = card.card.rarity;
        acc[rarity] = (acc[rarity] || 0) + card.quantity;
        return acc;
      },
      {} as Record<string, number>,
    );

    const nonLandCmcs = mainboardCards
      .filter((card) => getPrimaryCardType(card.card.type_line) !== "Land")
      .flatMap((deckCard) => {
        const cmc =
          deckCard?.card && typeof deckCard.card.cmc === "number"
            ? deckCard.card.cmc
            : 0;
        const quantity = deckCard?.quantity || 0;
        return Array(quantity).fill(cmc);
      });

    const calculateAverage = (values: number[]) =>
      values.length > 0
        ? values.reduce((sum, val) => sum + val, 0) / values.length
        : 0;

    const calculateMedian = (values: number[]): number => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const averageCmcNonLand = calculateAverage(nonLandCmcs);
    const medianCmcNonLand = calculateMedian(nonLandCmcs);

    // Additional useful stats
    const landCount = typeDistribution["Land"] || 0;
    const nonLandCount = totalCards - landCount;
    const landRatio = totalCards > 0 ? (landCount / totalCards) * 100 : 0;

    const multicolorCount = colorDistribution["Multicolor"] || 0;
    const multicolorRatio =
      totalCards > 0 ? (multicolorCount / totalCards) * 100 : 0;

    // Cards that potentially provide card advantage (basic heuristic)
    const cardAdvantageCount = mainboardCards.reduce((count, card) => {
      const oracleText = (card.card.oracle_text || "").toLowerCase();
      if (
        oracleText.includes("draw") ||
        oracleText.includes("search") ||
        oracleText.includes("tutor")
      ) {
        return count + card.quantity;
      }
      return count;
    }, 0);

    return {
      totalCards,
      typeDistribution,
      manaCurve,
      colorDistribution,
      manaSources,
      manaSymbolsDistribution,
      rarityDistribution,
      medianCmcNonLand,
      averageCmcNonLand,
      landCount,
      nonLandCount,
      landRatio,
      multicolorRatio,
      cardAdvantageCount,
    };
  }, [deck]);

  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Prepare chart data
  const typeChartData = Object.entries(stats.typeDistribution)
    .map(([type, count]) => ({
      type,
      count,
      percentage: ((count / stats.totalCards) * 100).toFixed(1),
      fill: TYPE_COLORS[type as keyof typeof TYPE_COLORS] || "#64748B",
    }))
    .sort((a, b) => b.count - a.count);

  const manaCurveData = Array.from({ length: 11 }, (_, i) => {
    const cmcKey = i >= 10 ? "10+" : i.toString();
    return {
      cmc: cmcKey,
      count: stats.manaCurve[cmcKey] || 0,
      index: i,
    };
  });

  const colorChartData = Object.entries(stats.colorDistribution)
    .filter(([, count]) => count > 0) // Only include colors that exist
    .map(([color, count]) => ({
      color:
        COLOR_IDENTITY_NAMES[color as keyof typeof COLOR_IDENTITY_NAMES] ||
        color,
      colorKey: color,
      count,
      percentage: ((count / stats.totalCards) * 100).toFixed(1),
      fill:
        COLOR_IDENTITY_COLORS[color as keyof typeof COLOR_IDENTITY_COLORS] ||
        "#64748B",
    }))
    .sort((a, b) => b.count - a.count);

  const rarityChartData = Object.entries(stats.rarityDistribution)
    .map(([rarity, count]) => ({
      rarity: rarity.charAt(0).toUpperCase() + rarity.slice(1),
      rarityKey: rarity,
      count,
      percentage: ((count / stats.totalCards) * 100).toFixed(1),
    }))
    .sort((a, b) => {
      const orderA = RARITY_ORDER[a.rarityKey] || 99;
      const orderB = RARITY_ORDER[b.rarityKey] || 99;
      return orderA - orderB;
    });

  const MANA_SOURCE_NAMES = {
    W: "White",
    U: "Blue",
    B: "Black",
    R: "Red",
    G: "Green",
    C: "Colorless",
    M: "Any Color",
  };

  const manaSourceData = (["W", "U", "B", "R", "G", "C", "M"] as const)
    .map((key) => ({
      key,
      name: MANA_SOURCE_NAMES[key],
      count: stats.manaSources[key],
    }))
    .filter((source) => source.count > 0)
    .sort((a, b) => b.count - a.count);

  const MANA_SYMBOL_NAMES = {
    W: "White",
    U: "Blue",
    B: "Black",
    R: "Red",
    G: "Green",
    C: "Colorless",
    P: "Phyrexian",
    Generic: "Generic",
  };

  const manaSymbolData = (
    Object.keys(MANA_SYMBOL_NAMES) as Array<keyof typeof MANA_SYMBOL_NAMES>
  )
    .map((key) => ({
      key,
      name: MANA_SYMBOL_NAMES[key],
      count: stats.manaSymbolsDistribution[key],
    }))
    .filter((symbol) => symbol.count > 0)
    .sort((a, b) => b.count - a.count);

  const chartConfig = {
    count: {
      label: "Cards",
    },
  };

  type PieChartDataPoint = {
    [key: string]: string | number;
    percentage: string;
    fill: string;
  };

  const renderAccessiblePieChartLabel = (labelKey: string) =>
    function AccessiblePieChartLabel(
      props: unknown,
    ): React.ReactElement | null {
      const labelProps = props as {
        cx?: number;
        cy?: number;
        midAngle?: number;
        outerRadius?: number;
        payload?: PieChartDataPoint;
      };

      const { cx, cy, midAngle, outerRadius, payload } = labelProps;

      if (
        typeof cx !== "number" ||
        typeof cy !== "number" ||
        typeof midAngle !== "number" ||
        typeof outerRadius !== "number" ||
        !payload
      ) {
        return null;
      }

      const RADIAN = Math.PI / 180;
      const radius = outerRadius + 30;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      const textAnchor = x > cx ? "start" : "end";
      const labelText = payload[labelKey] as string;

      return (
        <g style={{ pointerEvents: "none" }}>
          <text
            x={x}
            y={y}
            textAnchor={textAnchor}
            dominantBaseline="central"
            fill="currentColor"
            className="text-xs font-medium text-foreground"
          >
            <tspan fill={payload.fill}>● </tspan>
            {`${labelText} (${payload.percentage}%)`}
          </text>
        </g>
      );
    };

  const renderTypeChartLabel = renderAccessiblePieChartLabel("type");
  const renderColorChartLabel = renderAccessiblePieChartLabel("color");

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-bold">{stats.totalCards}</div>
            <p className="text-xs text-muted-foreground">Total Cards</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-bold">
              {stats.medianCmcNonLand.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Median Spell CMC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-bold">
              {stats.averageCmcNonLand.toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground">Average Spell CMC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-bold">
              {stats.landRatio.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">Lands</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card Type Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Card Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col p-4 pt-0 pb-2">
            {!isDesktop && (
              <PieChartLegend data={typeChartData} labelKey="type" />
            )}
            <ChartContainer
              config={chartConfig}
              className={clsx("w-full", isDesktop ? "h-[250px]" : "h-[200px]")}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart
                  margin={
                    isDesktop
                      ? { top: 20, right: 20, bottom: 20, left: 20 }
                      : {}
                  }
                >
                  <Pie
                    data={typeChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={isDesktop ? 70 : 80}
                    dataKey="count"
                    label={isDesktop ? renderTypeChartLabel : undefined}
                    labelLine={false}
                  >
                    {typeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md text-xs">
                            <div className="font-medium">{data.type}</div>
                            <div className="text-muted-foreground">
                              {data.count} cards ({data.percentage}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Mana Curve */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Mana Curve
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col p-4 pt-0 pb-2">
            {!isDesktop && (
              <PieChartLegend data={colorChartData} labelKey="color" />
            )}
            <ChartContainer
              config={chartConfig}
              className={clsx("w-full", isDesktop ? "h-[250px]" : "h-[200px]")}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={manaCurveData}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <XAxis
                    dataKey="cmc"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={20}
                  />
                  <Bar
                    dataKey="count"
                    radius={[2, 2, 0, 0]}
                    fill="#8B5CF6"
                    activeBar={{ fill: "#A855F7" }}
                    style={{
                      transition: "fill 0.2s ease",
                      cursor: "pointer",
                    }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md text-xs">
                            <div className="font-medium">CMC {label}</div>
                            <div className="text-muted-foreground">
                              {payload[0].value} cards
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Color Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" />
              Color Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col p-4 pt-0 pb-2">
            {!isDesktop && (
              <PieChartLegend data={colorChartData} labelKey="color" />
            )}
            <ChartContainer
              config={chartConfig}
              className={clsx("w-full", isDesktop ? "h-[250px]" : "h-[200px]")}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart
                  margin={
                    isDesktop
                      ? { top: 20, right: 20, bottom: 20, left: 20 }
                      : {}
                  }
                >
                  <Pie
                    data={colorChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={isDesktop ? 70 : 80}
                    dataKey="count"
                    labelLine={false}
                    label={isDesktop ? renderColorChartLabel : undefined}
                  >
                    {colorChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md text-xs">
                            <div className="font-medium">{data.color}</div>
                            <div className="text-muted-foreground">
                              {data.count} cards ({data.percentage}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Deck Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Deck Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Lands</span>
                <Badge variant="outline" className="text-xs h-5">
                  {stats.landCount} ({stats.landRatio.toFixed(1)}%)
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Non-lands</span>
                <Badge variant="outline" className="text-xs h-5">
                  {stats.nonLandCount}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Multicolor Cards
                </span>
                <Badge variant="outline" className="text-xs h-5">
                  {stats.multicolorRatio.toFixed(1)}%
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <span className="text-xs font-medium">Rarity Breakdown</span>
              {rarityChartData.map((item) => {
                const rarityStyle =
                  RARITY_STYLES[item.rarityKey as keyof typeof RARITY_STYLES];
                return (
                  <div
                    key={item.rarity}
                    className="flex justify-between items-center"
                  >
                    <span className="text-xs text-muted-foreground">
                      {item.rarity}
                    </span>
                    <div
                      className="text-xs h-5 px-2 py-1 rounded-md font-medium flex items-center"
                      style={{
                        backgroundColor: rarityStyle.bg,
                        color: rarityStyle.text,
                      }}
                    >
                      {item.count} ({item.percentage}%)
                    </div>
                  </div>
                );
              })}
            </div>

            {stats.cardAdvantageCount > 0 && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Potential Card Advantage
                  </span>
                  <Badge variant="outline" className="text-xs h-5">
                    {stats.cardAdvantageCount} cards
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mana Sources */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplets className="h-4 w-4" />
              Mana Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {manaSourceData.length > 0 ? (
              manaSourceData.map((source) => (
                <div
                  key={source.key}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center gap-2">
                    {source.key === "M" ? (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ManaCost manaCost={`{${source.key}}`} size="sm" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {source.name}
                    </span>
                  </div>
                  <Badge variant="outline">{source.count} Sources</Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                No mana sources found in mainboard.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Total Mana Symbols */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sigma className="h-4 w-4" />
              Total Mana Symbols
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {manaSymbolData.length > 0 ? (
              manaSymbolData.map((symbol) => (
                <div
                  key={symbol.key}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center gap-2">
                    {symbol.key === "Generic" ? (
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ManaCost manaCost={`{${symbol.key}}`} size="sm" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {symbol.name}
                    </span>
                  </div>
                  <Badge variant="outline">{symbol.count} Pips</Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                No mana symbols found in mainboard spells.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
