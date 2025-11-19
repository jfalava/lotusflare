// components/card/card-detail-modal-content.tsx
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import useSWR from "swr";
import clsx from "clsx";
import { motion } from "framer-motion";
import type {
  ScryfallApiCard,
  PaginatedMasterInventoryResponse,
  MasterInventoryWithDetails,
} from "#/backend/src/types";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Info, ImageOff, RefreshCw } from "lucide-react";
import { ManaCost } from "@/components/ui/mana-cost";
import { OracleTextWithSymbols } from "@/components/ui/oracle-text-with-symbols";
import { ModalCollectionList } from "@/components/card/modal-collection-list";
import { getCardLocalizedImageUri } from "#/backend/src/card-utils";

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch error");
  return res.json();
};

export type CardDetailModalContentProps = {
  card: ScryfallApiCard & {
    quantity?: number;
    is_foil?: boolean;
    place_name?: string | null;
    notes?: string | null;
    condition?: string | null;
    language?: string | null;
    is_commander?: boolean;
    is_sideboard?: boolean;
  };
};

function useModalHoverPreview() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const loaded = useRef<Set<string>>(new Set());
  useEffect(() => {
    const enter = async (
      ev: CustomEvent<{
        e: MouseEvent;
        imgUri?: string;
        name?: string;
        language?: string;
        cardObj?: ScryfallApiCard;
      }>,
    ) => {
      const { e, imgUri, name, language, cardObj } = ev.detail || {};
      if (!imgUri || !previewRef.current) return;
      let final = imgUri;
      try {
        if (language && language !== "en" && cardObj) {
          const loc = await getCardLocalizedImageUri(
            cardObj,
            language as unknown as import("#/backend/src/types").LanguageCode,
          );
          if (loc) final = loc;
        }
      } catch {}
      const x = e.clientX + 12;
      const y = e.clientY + 12;
      const el = previewRef.current;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.visibility = "visible";
      const img = el.querySelector("img") as HTMLImageElement | null;
      if (img) {
        img.src = final;
        img.alt = name ?? "";
        if (!loaded.current.has(final)) img.style.opacity = "0";
      }
    };
    const move = (ev: CustomEvent<{ e: MouseEvent }>) => {
      const { e } = ev.detail || {};
      const el = previewRef.current;
      if (!el || !e) return;
      const w = 250;
      const h = el.offsetHeight || 350;
      let x = e.clientX + 12;
      let y = e.clientY + 12;
      if (x + w > window.innerWidth) x = e.clientX - w - 12;
      if (y + h > window.innerHeight) y = window.innerHeight - h - 5;
      if (y < 0) y = 5;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.visibility = "visible";
    };
    const leave = () => {
      const el = previewRef.current;
      if (!el) return;
      el.style.visibility = "hidden";
      el.style.left = "-9999px";
      el.style.top = "-9999px";
    };
    const onImgLoad = (e: Event) => {
      const img = e.currentTarget as HTMLImageElement;
      loaded.current.add(img.src);
      img.style.opacity = "1";
    };
    const img = document.createElement("img");
    img.className =
      "w-[250px] max-h-[80vh] rounded shadow-xl border border-black/20 bg-black transition-opacity duration-200";
    img.draggable = false;
    img.addEventListener("load", onImgLoad);
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.pointerEvents = "none";
    container.style.zIndex = "9999";
    container.style.visibility = "hidden";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.appendChild(img);
    previewRef.current = container;
    document.body.appendChild(container);
    const onEnter = ((e: Event) =>
      enter(
        e as CustomEvent<{
          e: MouseEvent;
          imgUri?: string;
          name?: string;
          language?: string;
          cardObj?: ScryfallApiCard;
        }>,
      )) as EventListener;
    const onMove = ((e: Event) =>
      move(e as CustomEvent<{ e: MouseEvent }>)) as EventListener;
    const onLeave = (() => leave()) as EventListener;
    window.addEventListener("inventory-hover-enter", onEnter);
    window.addEventListener("inventory-hover-move", onMove);
    window.addEventListener("inventory-hover-leave", onLeave);
    return () => {
      window.removeEventListener("inventory-hover-enter", onEnter);
      window.removeEventListener("inventory-hover-move", onMove);
      window.removeEventListener("inventory-hover-leave", onLeave);
      img.removeEventListener("load", onImgLoad);
      container.remove();
    };
  }, []);
}

function HoverPreviewPortal() {
  useModalHoverPreview();
  return null;
}

export function CardDetailModalContent({ card }: CardDetailModalContentProps) {
  const [faceIndex, setFaceIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Record<number, boolean>>({});
  const [mounted, setMounted] = useState(false);

  const { data, isLoading } = useSWR<PaginatedMasterInventoryResponse>(
    `/api/v2/inventory?q=${encodeURIComponent(card.name)}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const masterItem = data?.data?.[0] as MasterInventoryWithDetails | undefined;

  const details = useMemo(() => masterItem?.details ?? [], [masterItem]);

  // this printing only
  const thisPrinting = useMemo(
    () => details.filter((d) => d.card_scryfall_id === card.id),
    [details, card.id],
  );

  // multi‐face handling
  const isMultiFaced =
    Array.isArray(card.card_faces) && card.card_faces.length > 1;
  const totalFaces = isMultiFaced ? card.card_faces!.length : 1;

  const faces = useMemo(() => {
    if (!isMultiFaced || !card.card_faces) {
      return [
        {
          name: card.name,
          mana_cost: card.mana_cost,
          type_line: card.type_line,
          oracle_text: card.oracle_text,
          power: card.power,
          toughness: card.toughness,
          loyalty: card.loyalty,
          image_uris: card.image_uris,
        },
      ];
    }
    return card.card_faces.map((face) => ({
      name: face?.name || card.name,
      mana_cost: face?.mana_cost || card.mana_cost,
      type_line: face?.type_line || card.type_line,
      oracle_text: face?.oracle_text || card.oracle_text,
      power: face?.power || card.power,
      toughness: face?.toughness || card.toughness,
      loyalty: face?.loyalty || card.loyalty,
      image_uris: face?.image_uris || card.image_uris,
    }));
  }, [card, isMultiFaced]);

  const currentFace = faces[faceIndex];

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // preload images for smooth flip
  useEffect(() => {
    if (!isMultiFaced) return;
    faces.forEach((face, idx) => {
      const url = face.image_uris?.large || face.image_uris?.normal;
      if (url && !imagesLoaded[idx]) {
        const img = new Image();
        img.onload = () =>
          setImagesLoaded((prev) => ({ ...prev, [idx]: true }));
        img.src = url;
      }
    });
  }, [faces, isMultiFaced, imagesLoaded]);

  const handleRotate = () => {
    if (!isMultiFaced || isRotating) return;
    setIsRotating(true);
    setImgError(false);
    setFaceIndex((p) => (p + 1) % totalFaces);
    setTimeout(() => setIsRotating(false), 800);
  };

  return (
    <>
      <DialogHeader className="px-6 pt-6">
        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
          <span className="font-beleren">{currentFace.name}</span>
          {!!thisPrinting.length && (
            <Badge variant="secondary" className="font-mono">
              {thisPrinting.reduce((sum, d) => sum + d.quantity, 0)}×
            </Badge>
          )}
        </DialogTitle>
      </DialogHeader>

      <ScrollArea
        className="px-6 pb-6 flex-1 overflow-auto"
        id="card-detail-scroll-area"
      >
        {" "}
        <Tabs defaultValue="overview" className="flex flex-col h-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="collection">My Collection</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="py-6 flex-1 overflow-auto">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Card image flip */}
              <div
                className="relative rounded-lg overflow-hidden shadow-lg"
                style={{ perspective: "1000px" }}
              >
                <motion.div
                  className="w-full aspect-[63/88] bg-muted relative"
                  animate={
                    mounted ? { rotateY: faceIndex * 180 } : { rotateY: 0 }
                  }
                  transition={{
                    duration: 0.8,
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {" "}
                  {faces.map((face, idx) => {
                    const url =
                      face.image_uris?.large || face.image_uris?.normal;
                    const show = idx === faceIndex;
                    return (
                      <div
                        key={idx}
                        className="absolute inset-0 w-full h-full flex items-center justify-center"
                        style={{
                          transform: `rotateY(${idx * 180}deg)`,
                          backfaceVisibility: "hidden",
                          opacity: show ? 1 : 0,
                        }}
                      >
                        {imgError || !url ? (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <ImageOff className="h-12 w-12 text-muted-foreground" />
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={face.name}
                            className="w-full h-full object-contain"
                            onError={() => setImgError(true)}
                          />
                        )}
                      </div>
                    );
                  })}
                </motion.div>
                {isMultiFaced && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-md"
                    onClick={handleRotate}
                    disabled={isRotating}
                  >
                    <RefreshCw
                      className={clsx(
                        "h-4 w-4 transition-transform duration-300",
                        isRotating && "rotate-180",
                      )}
                    />
                    <span className="ml-1 text-xs">Transform</span>
                  </Button>
                )}
              </div>

              {/* Details */}
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{currentFace.type_line}</Badge>
                    <Badge variant="outline">{card.rarity}</Badge>
                    <Badge variant="outline">{card.set_name}</Badge>
                    {isMultiFaced && (
                      <Badge variant="secondary">
                        {card.layout === "transform"
                          ? "Transformable"
                          : card.layout === "modal_dfc"
                            ? "Modal DFC"
                            : card.layout === "adventure"
                              ? "Adventure"
                              : "Multi-Faced"}
                      </Badge>
                    )}
                  </div>
                  <motion.div
                    key={`stats-${faceIndex}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="flex items-center gap-3"
                  >
                    {currentFace.mana_cost && (
                      <ManaCost manaCost={currentFace.mana_cost} />
                    )}
                    {currentFace.power && currentFace.toughness && (
                      <Badge variant="secondary" className="font-mono text-md">
                        {currentFace.power}/{currentFace.toughness}
                      </Badge>
                    )}
                    {currentFace.loyalty && (
                      <div className="relative inline-block">
                        <ManaCost
                          manaCost="{loyalty-start}"
                          size="lg"
                          asImage
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                          {currentFace.loyalty}
                        </span>
                      </div>
                    )}
                  </motion.div>
                </CardContent>
                <CardContent>
                  <motion.div
                    key={`oracle-${faceIndex}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <OracleTextWithSymbols
                      text={currentFace.oracle_text}
                      className="text-sm"
                    />
                  </motion.div>
                </CardContent>
                <div className="flex gap-2 px-6 pb-6">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <a
                      href={card.scryfall_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Info className="mr-2 h-4 w-4" />
                      Scryfall
                    </a>
                  </Button>
                  {card.purchase_uris?.cardmarket && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <a
                        href={card.purchase_uris.cardmarket}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Cardmarket
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* COLLECTION */}
          <TabsContent value="collection" className="py-6 flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
              </div>
            ) : !masterItem ? (
              <div
                className={clsx(
                  "flex flex-col items-center justify-center",
                  "h-full py-10 text-muted-foreground",
                )}
              >
                <ImageOff className="h-8 w-8 mb-2" />
                <p>No "{card.name}" copies were found in your collection.</p>
              </div>
            ) : (
              <ModalCollectionList
                item={masterItem}
                onMouseEnter={(e, imgUri, name, language, cardObj) => {
                  const event = new CustomEvent("inventory-hover-enter", {
                    detail: { e, imgUri, name, language, cardObj },
                  });
                  window.dispatchEvent(event);
                }}
                onMouseMove={(e) => {
                  const event = new CustomEvent("inventory-hover-move", {
                    detail: { e },
                  });
                  window.dispatchEvent(event);
                }}
                onMouseLeave={() => {
                  const event = new CustomEvent("inventory-hover-leave");
                  window.dispatchEvent(event);
                }}
              />
            )}{" "}
          </TabsContent>
        </Tabs>
      </ScrollArea>
      <HoverPreviewPortal />
    </>
  );
}
