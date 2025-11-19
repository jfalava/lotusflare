"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import clsx from "clsx";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import type {
  PlaceDbo,
  CardCondition,
  LanguageCode,
  InventoryDetailWithCardDetails,
  ScryfallApiCard,
  AddInventoryDetailPayload,
} from "#/backend/src/types";
import {
  Check,
  ChevronsUpDown,
  AlertTriangle,
  Loader2,
  Upload,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getCardLocalizedImageUri } from "#/backend/src/card-utils";
import { useKeyPress } from "@/hooks/useKeyPress";
import { Kbd } from "../ui/kbd";

type Step = "input" | "review";
type ImportFormat = "json" | "text";

interface BulkImportCardRaw {
  scryfall_id?: string;
  quantity?: number;
  condition?: CardCondition;
  is_foil?: boolean;
  language?: LanguageCode;
  notes?: string | null;
  place_name?: string | null;
  name?: string;
  set?: string;
  collector_number?: string;
  [key: string]: unknown;
}

interface ParsedItem {
  raw: BulkImportCardRaw;
  card?: InventoryDetailWithCardDetails["card"];
  options?: ScryfallApiCard[];
  selected?: ScryfallApiCard;
  error?: string;
}

interface ParsedCard {
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
  originalLine: string;
}

interface BulkImportModalProps {
  onImported?: (newItems: InventoryDetailWithCardDetails[]) => void;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function BulkImportModal({ onImported }: BulkImportModalProps) {
  const [open, setOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [format, setFormat] = useState<ImportFormat>("text");
  const [step, setStep] = useState<Step>("input");
  const [inputText, setInputText] = useState("");
  const [places, setPlaces] = useState<PlaceDbo[]>([]);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [importPhase, setImportPhase] = useState<"masters" | "details">(
    "masters",
  );

  // Preview functionality
  const previewRef = useRef<HTMLDivElement>(null);
  const [hoveredPreview, setHoveredPreview] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const loadedImagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch("/api/places");
        if (!res.ok) throw new Error();
        setPlaces(await res.json());
      } catch {
        toast.error("Failed to load places");
      }
    })();
  }, [open]);

  useKeyPress("m", () => setOpen(true), { alt: true });

  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setFormat("text");
      setStep("input");
      setInputText("");
      setParsedItems([]);
      setLoading(false);
      setProgressIndex(0);
      setProgressTotal(0);
      setImportPhase("masters");
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      // Reset preview state
      setHoveredPreview(null);
      setPreviewLoading(false);
      setIsTouchDevice(false);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      loadedImagesRef.current.clear();
    }, 300);
    return () => clearTimeout(t);
  }, [open]);

  const parseDecklist = useCallback((text: string): ParsedCard[] => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const isArena = lines.some((l) =>
      /^\d+\s+.+\s+\([A-Z0-9]+\)\s+\d+/.test(l),
    );
    return lines.map((line) => {
      const m = isArena
        ? line.match(/^(\d+)\s+(.+?)\s+\(([A-Z0-9]+)\)\s+(\d+)$/)
        : line.match(/^(\d+)x?\s+(.+)$/);
      const quantity = m ? parseInt(m[1], 10) : 1;
      const name = m ? m[2].trim() : line;
      const setCode = isArena && m ? m[3] : undefined;
      const collectorNumber = isArena && m ? m[4] : undefined;
      return { quantity, name, setCode, collectorNumber, originalLine: line };
    });
  }, []);

  const fetchPrintOptions = useCallback(
    async (card: ParsedCard): Promise<ScryfallApiCard[]> => {
      const q =
        card.setCode && card.collectorNumber
          ? `set:${card.setCode} number:${card.collectorNumber} !"//"`
          : `!"${card.name}" unique:prints`;
      const res = await fetch(
        `/api/scryfall/cards/search?q=${encodeURIComponent(q)}`,
      );
      if (!res.ok) return [];
      const body = (await res.json()) as {
        object: string;
        data: ScryfallApiCard[];
      };
      return body.object === "list" ? body.data : [];
    },
    [],
  );

  const validItems = useMemo(
    () =>
      parsedItems.filter(
        (it) => !it.error && (format === "json" ? !!it.card : !!it.selected),
      ),
    [parsedItems, format],
  );

  // Preview handlers
  const handleTouchStart = () => {
    if (!isTouchDevice) {
      setIsTouchDevice(true);
      setHoveredPreview(null);
      setPreviewLoading(false);
      previewRef.current?.style.setProperty("visibility", "hidden");
    }
  };

  const handleMouseEnter = async (
    e: React.MouseEvent<HTMLElement>,
    imgUri: string | undefined,
    cardName: string,
    language?: string,
    card?: ScryfallApiCard,
  ) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (isTouchDevice || !imgUri) {
      previewRef.current?.style.setProperty("visibility", "hidden");
      setHoveredPreview(null);
      return;
    }

    let finalImgUri = imgUri;
    if (language && language !== "en" && card) {
      try {
        const localizedUri = await getCardLocalizedImageUri(
          card,
          language as LanguageCode,
        );
        if (localizedUri) {
          finalImgUri = localizedUri;
        }
      } catch (error) {
        console.warn(
          `Failed to fetch localized image for ${cardName} in ${language}:`,
          error,
        );
      }
    }

    const already = loadedImagesRef.current.has(finalImgUri);
    setPreviewLoading(!already);
    const x = e.clientX + 12;
    const y = e.clientY + 12;
    if (previewRef.current) {
      previewRef.current.style.left = `${x}px`;
      previewRef.current.style.top = `${y}px`;
      previewRef.current.style.visibility = "visible";
    }
    setHoveredPreview({ src: finalImgUri, alt: cardName });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!isTouchDevice && previewRef.current && hoveredPreview) {
      const w = 250;
      const h = previewRef.current.offsetHeight;
      let x = e.clientX + 12;
      let y = e.clientY + 12;
      if (x + w > window.innerWidth) x = e.clientX - w - 12;
      if (y + h > window.innerHeight) y = window.innerHeight - h - 5;
      if (y < 0) y = 5;
      previewRef.current.style.left = `${x}px`;
      previewRef.current.style.top = `${y}px`;
    }
  };

  const handleMouseLeaveContainer = useCallback(() => {
    if (isTouchDevice) return;
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredPreview(null);
      setPreviewLoading(false);
      if (previewRef.current) {
        previewRef.current.style.visibility = "hidden";
        previewRef.current.style.left = "-9999px";
        previewRef.current.style.top = "-9999px";
      }
    }, 100);
  }, [isTouchDevice]);

  const handleHidePreview = useCallback(() => {
    if (isTouchDevice) return;
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setHoveredPreview(null);
    setPreviewLoading(false);
    if (previewRef.current) {
      previewRef.current.style.visibility = "hidden";
      previewRef.current.style.left = "-9999px";
      previewRef.current.style.top = "-9999px";
    }
  }, [isTouchDevice]);

  const handleNext = async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setProgressIndex(0);

    if (format === "json") {
      let arr: unknown;
      try {
        arr = JSON.parse(inputText);
      } catch {
        toast.error("Invalid JSON");
        setLoading(false);
        return;
      }
      if (!Array.isArray(arr)) {
        toast.error("JSON must be an array");
        setLoading(false);
        return;
      }
      const raws = arr as BulkImportCardRaw[];
      setProgressTotal(raws.length);

      const items: ParsedItem[] = raws.map((raw) => ({ raw }));
      for (let i = 0; i < raws.length; i++) {
        if (signal.aborted) break;
        const it = items[i];
        const id = it.raw.scryfall_id;
        if (!id) {
          it.error = "Missing scryfall_id";
        } else {
          try {
            const r = await fetch(`/api/scryfall/cards/${id}`, { signal });
            if (!r.ok) it.error = `Not found (${r.status})`;
            else it.card = (await r.json()) as ScryfallApiCard;
          } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") {
              break;
            }
            it.error = "Fetch error";
          }
        }
        setProgressIndex(i + 1);
        if (i < raws.length - 1) await sleep(150);
      }

      if (signal.aborted) {
        toast.error("Import cancelled");
        setLoading(false);
        return;
      }

      setParsedItems(items);
      setLoading(false);
      setStep("review");
    } else {
      const parsed = parseDecklist(inputText);
      if (parsed.length === 0) {
        toast.error("No cards found");
        setLoading(false);
        return;
      }
      setProgressTotal(parsed.length);

      const items: ParsedItem[] = [];
      for (let i = 0; i < parsed.length; i++) {
        if (signal.aborted) break;
        const pc = parsed[i];
        const opts = await fetchPrintOptions(pc);
        const sel = opts[0];
        const raw: BulkImportCardRaw = {
          scryfall_id: sel?.id,
          quantity: pc.quantity,
          condition: "NM",
          is_foil: false,
          language: "en",
          notes: null,
          place_name: null,
          name: pc.name,
          set: sel?.set.toUpperCase(),
          collector_number: sel?.collector_number,
        };
        items.push({
          raw,
          options: opts,
          selected: sel,
          error: opts.length === 0 ? "No prints found" : undefined,
        });
        setProgressIndex(i + 1);
        if (i < parsed.length - 1) await sleep(150);
      }

      if (signal.aborted) {
        toast.error("Import cancelled");
        setLoading(false);
        return;
      }

      setParsedItems(items);
      setLoading(false);
      setStep("review");
    }
  };

  const handleSelectPrint = (idx: number, cardId: string) => {
    setParsedItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx] };
      const opt = item.options?.find((c) => c.id === cardId);
      if (opt) {
        item.selected = opt;
        item.raw.scryfall_id = opt.id;
        item.raw.set = opt.set.toUpperCase();
        item.raw.collector_number = opt.collector_number;
        item.error = undefined;
      }
      next[idx] = item;
      return next;
    });
  };

  const handleImport = async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setProgressIndex(0);

    const masterMap = new Map<string, string>();
    validItems.forEach((it) => {
      const sel = format === "json" ? it.card! : it.selected!;
      if (sel.oracle_id) masterMap.set(sel.oracle_id, sel.name);
    });

    // Phase 1: upsert master entries
    const masterEntries = Array.from(masterMap.entries());
    setImportPhase("masters");
    setProgressIndex(0);
    setProgressTotal(masterEntries.length);
    for (let mi = 0; mi < masterEntries.length; mi++) {
      const [oracle_id, name] = masterEntries[mi];
      if (signal.aborted) break;
      await fetch("/api/v2/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oracle_id, name, notes: null }),
        signal,
      }).catch(() => {});
      setProgressIndex(mi + 1);
      await sleep(50);
    }
    if (signal.aborted) {
      toast.error("Import cancelled");
      setLoading(false);
      return;
    }

    // Phase 2: import details
    setImportPhase("details");
    setProgressIndex(0);
    setProgressTotal(validItems.length);

    let success = 0;
    const newItems: InventoryDetailWithCardDetails[] = [];
    for (let i = 0; i < validItems.length; i++) {
      if (signal.aborted) break;
      const it = validItems[i];
      const sel = format === "json" ? it.card! : it.selected!;
      const payload: AddInventoryDetailPayload = {
        master_oracle_id: sel.oracle_id!,
        scryfall_card_id: sel.id,
        place_id: it.raw.place_name
          ? (places.find((p) => p.name === it.raw.place_name)?.id ?? null)
          : null,
        quantity: it.raw.quantity!,
        condition: it.raw.condition!,
        is_foil: it.raw.is_foil!,
        language: it.raw.language!,
        notes: it.raw.notes ?? null,
      };
      try {
        const res = await fetch("/api/v2/inventory/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal,
        });
        if (res.ok) {
          newItems.push((await res.json()) as InventoryDetailWithCardDetails);
          success++;
        }
      } catch {
        if (signal.aborted) break;
      }
      setProgressIndex(i + 1);
      await sleep(50);
    }

    if (signal.aborted) {
      toast.error("Import cancelled");
    } else {
      toast.success(`Imported ${success} / ${validItems.length}`);
    }
    setLoading(false);
    setOpen(false);
    onImported?.(newItems);
  };

  const handleCancel = () => {
    if (window.confirm("Import is in progress. Do you want to cancel it?")) {
      abortControllerRef.current?.abort();
    }
  };

  const successCount = validItems.length;
  const errorCount = parsedItems.length - successCount;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (loading && !next) {
            if (
              window.confirm(
                "An import is in progress. Cancel and close the modal?",
              )
            ) {
              abortControllerRef.current?.abort();
              setOpen(false);
            }
          } else {
            setOpen(next);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline">
            <Upload className="mr-1 size-4" />
            Bulk Import
            <div className="hidden items-center gap-1 lg:flex ml-2">
              <Kbd>Alt</Kbd>
              <Kbd>M</Kbd>
            </div>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] md:h-[60vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle>Bulk Import Inventory</DialogTitle>
            <DialogDescription>
              {step === "input"
                ? format === "json"
                  ? "Paste a JSON array of cards."
                  : "Paste a plain-text or Arena-style list."
                : "Review & adjust before import."}
            </DialogDescription>
          </DialogHeader>

          <div
            className="flex-1 px-6 py-4 min-h-0"
            onMouseLeave={handleMouseLeaveContainer}
            onTouchStart={handleTouchStart}
          >
            <Tabs
              value={format}
              onValueChange={(v) => {
                setFormat(v as ImportFormat);
                setStep("input");
                setParsedItems([]);
              }}
              className="h-full flex flex-col"
            >
              <TabsList className="flex-shrink-0 mb-4">
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>

              <TabsContent
                value="json"
                className="flex-1 flex flex-col mt-0 min-h-0 data-[state=inactive]:hidden"
              >
                {step === "input" ? (
                  <div className="flex flex-col h-full space-y-2 min-h-0">
                    <Label htmlFor="bulk-json">JSON Import</Label>
                    <Textarea
                      id="bulk-json"
                      className="flex-1 font-mono text-sm resize-none min-h-0"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={`[
  {
    "scryfall_id": "<uuid>",
    "name": "<oracle name>",
    "set": "<set code>",
    "collector_number": "<card number>",
    "quantity": 1,
    "condition": "NM",
    "is_foil": false,
    "language": "en",
    "notes": null,
    "place_name": null
  }
]`}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col h-full min-h-0">
                    <div className="flex-shrink-0 mb-4 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">Preview</span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {successCount} OK
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                        {errorCount} Failed
                      </span>
                    </div>
                    <div className="flex-1 border rounded-lg min-h-0 flex flex-col">
                      <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {parsedItems.map((it, i) => {
                          const ok = !it.error && !!it.card;
                          const card = it.card;
                          const imgUri = card?.image_uris?.normal;
                          return (
                            <div
                              key={i}
                              className={clsx(
                                "flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors",
                                ok
                                  ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-800/50 dark:hover:bg-emerald-950/30"
                                  : "bg-rose-50 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-800/50 dark:hover:bg-rose-950/30",
                              )}
                              onMouseEnter={(e) =>
                                handleMouseEnter(
                                  e,
                                  imgUri,
                                  card?.name || it.raw.name || "Unknown Card",
                                  it.raw.language || "en",
                                  card,
                                )
                              }
                              onMouseMove={handleMouseMove}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">
                                  {it.raw.quantity}×{" "}
                                  <span className="font-semibold">
                                    {card?.name ??
                                      it.raw.name ??
                                      it.raw.scryfall_id}
                                  </span>
                                </div>
                                {card && (
                                  <div className="text-xs text-muted-foreground">
                                    {card.set.toUpperCase()} #
                                    {card.collector_number}
                                  </div>
                                )}
                              </div>
                              <div className="flex-shrink-0 ml-4">
                                {ok ? (
                                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-xs">{it.error}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="text"
                className="flex-1 flex flex-col mt-0 min-h-0 data-[state=inactive]:hidden"
              >
                {step === "input" ? (
                  <div className="flex flex-col h-full space-y-2 min-h-0">
                    <Label htmlFor="bulk-text">Deck List</Label>
                    <Textarea
                      id="bulk-text"
                      className="flex-1 font-mono text-sm resize-none min-h-0"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={`4x Lightning Bolt
4 Stonecoil Serpent (CMM) 976
2x Brainstorm
1 Sol Ring`}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col h-full min-h-0">
                    <div className="flex-shrink-0 mb-4 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">Preview</span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {successCount} OK
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                        {errorCount} Failed
                      </span>
                    </div>
                    <div className="flex-1 border rounded-lg min-h-0 flex flex-col">
                      <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {parsedItems.map((it, i) => {
                          const ok = !it.error && !!it.selected;
                          const card = it.selected;
                          const imgUri = card?.image_uris?.normal;
                          return (
                            <div
                              key={i}
                              className={clsx(
                                "flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-md border transition-colors",
                                ok
                                  ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-800/50 dark:hover:bg-emerald-950/30"
                                  : "bg-rose-50 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-800/50 dark:hover:bg-rose-950/30",
                              )}
                            >
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onMouseEnter={(e) =>
                                  handleMouseEnter(
                                    e,
                                    imgUri,
                                    card?.name || it.raw.name || "Unknown Card",
                                    it.raw.language || "en",
                                    card,
                                  )
                                }
                                onMouseMove={handleMouseMove}
                              >
                                <div className="font-medium">
                                  {it.raw.quantity}×{" "}
                                  <span className="font-semibold">
                                    {it.raw.name}
                                  </span>
                                </div>
                                {card && (
                                  <div className="text-xs text-muted-foreground">
                                    {card.set.toUpperCase()} #
                                    {card.collector_number}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="w-48 justify-between text-sm"
                                      size="sm"
                                      onMouseEnter={handleHidePreview}
                                    >
                                      {card
                                        ? `${card.set.toUpperCase()} #${card.collector_number}`
                                        : "Select print…"}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-80 p-0"
                                    onMouseEnter={handleHidePreview}
                                  >
                                    <Command>
                                      <CommandInput placeholder="Search prints…" />
                                      <CommandList>
                                        <CommandEmpty>
                                          No prints found.
                                        </CommandEmpty>
                                        <CommandGroup>
                                          {it.options?.map((opt) => (
                                            <CommandItem
                                              key={opt.id}
                                              value={opt.id}
                                              onSelect={(v) =>
                                                handleSelectPrint(i, v)
                                              }
                                            >
                                              <Check
                                                className={clsx(
                                                  "mr-2 h-4 w-4",
                                                  card?.id === opt.id
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                                )}
                                              />
                                              <div className="flex flex-col">
                                                <div>
                                                  {opt.set.toUpperCase()} #
                                                  {opt.collector_number}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {opt.set_name} •{" "}
                                                  {opt.released_at}
                                                </div>
                                              </div>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>

                                {ok ? (
                                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:justify-end">
              {loading && (
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  className="w-full sm:w-auto"
                >
                  Cancel Import
                </Button>
              )}
              {step === "review" && (
                <Button
                  variant="outline"
                  onClick={() => setStep("input")}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  Back
                </Button>
              )}
              <Button
                onClick={step === "input" ? handleNext : handleImport}
                disabled={
                  loading ||
                  (step === "input" && !inputText.trim()) ||
                  (step === "review" && validItems.length === 0)
                }
                className="w-full sm:w-auto"
              >
                {loading
                  ? `${
                      importPhase === "masters"
                        ? "Adding card entries"
                        : "Importing card details"
                    } ${progressIndex}/${progressTotal}…`
                  : step === "input"
                    ? "Next"
                    : `Import ${validItems.length} Cards`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Preview - Separate from modal to avoid event conflicts */}
      <div
        ref={previewRef}
        className="fixed pointer-events-none z-[9999]"
        style={{
          visibility: "hidden",
          left: "-9999px",
          top: "-9999px",
        }}
      >
        {hoveredPreview && previewLoading && (
          <div className="w-[250px] max-h-[80vh] rounded-lg shadow-xl border bg-card flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-foreground" />
          </div>
        )}
        {hoveredPreview && (
          <img
            src={hoveredPreview.src}
            alt={hoveredPreview.alt}
            onLoad={(e) => {
              const src = (e.currentTarget as HTMLImageElement).src;
              loadedImagesRef.current.add(src);
              setPreviewLoading(false);
            }}
            onError={() => setPreviewLoading(false)}
            className={clsx(
              "w-[250px] max-h-[80vh] rounded-lg shadow-xl border transition-opacity duration-200",
              previewLoading ? "opacity-0" : "opacity-100",
            )}
            draggable={false}
            loading="lazy"
          />
        )}
      </div>
    </>
  );
}
