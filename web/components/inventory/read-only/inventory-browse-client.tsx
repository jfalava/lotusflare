"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Loader2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type {
  MasterInventoryWithDetails,
  PlaceDbo,
  PaginatedMasterInventoryResponse,
  ScryfallApiCard,
  LanguageCode,
} from "#/backend/src/types";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { InventoryColorGroup } from "@/utils/inventory-color-group";
import { InventoryTabsHeader } from "@/components/inventory/shared/inventory-tabs-header";
import { COLOR_TABS } from "@/components/inventory/shared/inventory-constants";
import type {
  TabDisplayInfo,
  TabKey,
} from "@/components/inventory/shared/inventory-types";
import { ReadOnlyMasterInventoryGridItem } from "./read-only-inventory-grid-item";
import { InventoryViewControls } from "@/components/inventory/shared/inventory-view-controls";
import { ReadOnlyMasterInventoryListItem } from "./read-only-inventory-list-item";
import { useTopLoader } from "nextjs-toploader";
import { InventorySearch } from "@/components/inventory/inventory-search";
import { InventoryExportMenu } from "@/components/inventory/shared/inventory-export-menu";
import { InfiniteScrollSentinel } from "@/components/inventory/shared/infinite-scroll-sentinel";
import dynamic from "next/dynamic";
const InventoryReadOnlySkeleton = dynamic(
  () =>
    import(
      "@/components/inventory/read-only/inventory-read-only-skeleton"
    ).then((m) => m.InventoryReadOnlySkeleton),
  { ssr: false },
);
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { getCardLocalizedImageUri } from "#/backend/src/card-utils";
import clsx from "clsx";
import { useViewMode } from "@/components/context/view-mode-context";
import { useSettings } from "@/components/context/settings-context";
import { INVENTORY_PAGE_SIZE } from "@/lib/constants";

const PAGE_SIZE = INVENTORY_PAGE_SIZE;
const INTERACTIVE_SELECTOR =
  "button, a, [role='button'], input, select, textarea," +
  " [data-radix-dropdown-menu-trigger], [data-radix-dropdown-menu-content]," +
  " [data-radix-popper-content-wrapper], [role='menu'], [role='menuitem']";

export default function ReadOnlyInventoryClient() {
  const [masterInventory, setMasterInventory] = useState<
    MasterInventoryWithDetails[]
  >([]);
  const [places, setPlaces] = useState<PlaceDbo[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("White");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { viewMode, setViewMode } = useViewMode();
  const loader = useTopLoader();
  const loaderRef = useRef(loader);
  const [inventorySearchTerm, setInventorySearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [isInventorySearching, setIsInventorySearching] = useState(false);
  const [filteredMasterInventory, setFilteredMasterInventory] = useState<
    MasterInventoryWithDetails[] | null
  >(null);
  const previousTabRef = useRef<TabKey>("White");
  const { infiniteScroll, setInfiniteScroll } = useSettings();
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

  const previewRef = useRef<HTMLDivElement>(null);
  const [hoveredPreview, setHoveredPreview] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const loadedImagesRef = useRef<Set<string>>(new Set());

  async function fetchTabCounts() {
    try {
      const response = await fetch("/api/v2/inventory/counts");
      if (!response.ok) throw new Error("Failed to fetch tab counts");
      const data = (await response.json()) as Record<string, number>;
      setTabCounts(data);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  useEffect(() => {
    fetchTabCounts();
  }, []);

  useEffect(() => {
    async function fetchPlaces() {
      try {
        const res = await fetch("/api/places");
        if (!res.ok) throw new Error("Failed to fetch places");
        const data = (await res.json()) as PlaceDbo[];
        setPlaces(data);
      } catch (err) {
        toast.error((err as Error).message);
      }
    }
    fetchPlaces();
  }, []);

  const fetchMasterInventory = useCallback(
    async (
      pageToFetch = 1,
      append = false,
      searchTerm = "",
      colorGroup = "",
    ) => {
      const isSearch = !!searchTerm;

      if (isSearch) {
        setIsInventorySearching(true);
      } else if (!initialLoadRef.current) {
        loaderRef.current.start();
      }

      try {
        const url = new URL("/api/v2/inventory", window.location.origin);
        url.searchParams.set("page", String(pageToFetch));
        url.searchParams.set("limit", String(PAGE_SIZE));
        if (searchTerm) {
          url.searchParams.set("q", searchTerm);
        } else if (colorGroup) {
          url.searchParams.set("colorGroup", colorGroup);
        }

        const invResp = await fetch(url.toString());

        if (!invResp.ok) throw new Error("Failed to fetch master inventory");
        const invData =
          (await invResp.json()) as PaginatedMasterInventoryResponse;

        setTotalCount(invData.totalCount);
        setHasMore(invData.hasMore);

        const targetStateUpdater = isSearch
          ? setFilteredMasterInventory
          : setMasterInventory;

        if (append) {
          targetStateUpdater((prev: MasterInventoryWithDetails[] | null) => {
            const prevItems = prev || [];
            const newOnes = invData.data.filter(
              (n) =>
                !prevItems.some(
                  (p: MasterInventoryWithDetails) =>
                    p.oracle_id === n.oracle_id,
                ),
            );
            return [...prevItems, ...newOnes];
          });
        } else {
          targetStateUpdater(invData.data);
        }
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        if (initialLoadRef.current) {
          setIsInitialLoading(false);
          initialLoadRef.current = false;
        }
        if (isSearch) {
          setIsInventorySearching(false);
        }
        if (!isSearch && !initialLoadRef.current) {
          loaderRef.current.done();
        }
      }
    },
    [],
  );

  useEffect(() => {
    const isSearch = activeTab === "search";
    fetchMasterInventory(
      currentPage,
      infiniteScroll && currentPage > 1,
      isSearch ? activeSearchTerm : "",
      isSearch ? "" : activeTab,
    );
  }, [
    currentPage,
    infiniteScroll,
    activeSearchTerm,
    activeTab,
    fetchMasterInventory,
  ]);

  const groupedInventory = useMemo(() => {
    const data = filteredMasterInventory ?? masterInventory;
    const out: Record<
      InventoryColorGroup | "search",
      MasterInventoryWithDetails[]
    > = {
      White: [],
      Blue: [],
      Black: [],
      Red: [],
      Green: [],
      Multicolor: [],
      Colorless: [],
      Artifact: [],
      Land: [],
      search: filteredMasterInventory ?? [],
    };

    const source = filteredMasterInventory ? "search" : activeTab;
    if (source === "search") {
      out.search = data;
    } else {
      out[source as InventoryColorGroup] = data;
    }

    return out;
  }, [masterInventory, filteredMasterInventory, activeTab]);

  const tabsToDisplay = useMemo<TabDisplayInfo[]>(() => {
    const base = COLOR_TABS.map((t) => ({
      key: t.key,
      label: t.label,
      manaSymbol: t.manaSymbol,
      manafontClass: t.manafontClass,
      count: tabCounts[t.key] || 0,
    }));
    if (filteredMasterInventory !== null) {
      return [
        {
          key: "search" as TabKey,
          label: "Search Results",
          lucideIcon: Search,
          count: isInventorySearching ? undefined : totalCount,
        },
        ...base,
      ];
    }
    return base;
  }, [tabCounts, filteredMasterInventory, isInventorySearching, totalCount]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const paginationRange = useMemo<(number | "...")[]>(() => {
    const totalPageNumbers = 7;
    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const siblings = 1;
    const leftSibling = Math.max(currentPage - siblings, 1);
    const rightSibling = Math.min(currentPage + siblings, totalPages);
    const showLeftEllipsis = leftSibling > 2;
    const showRightEllipsis = rightSibling < totalPages - 1;
    const pages: (number | "...")[] = [];

    if (!showLeftEllipsis && showRightEllipsis) {
      const leftCount = 3 + 2 * siblings;
      for (let i = 1; i <= leftCount; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (showLeftEllipsis && !showRightEllipsis) {
      pages.push(1);
      pages.push("...");
      const rightCount = 3 + 2 * siblings;
      for (let i = totalPages - rightCount + 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (showLeftEllipsis && showRightEllipsis) {
      pages.push(1);
      pages.push("...");
      for (let i = leftSibling; i <= rightSibling; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  }, [totalPages, currentPage]);

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
    if ((e.target as Element).closest(INTERACTIVE_SELECTOR)) {
      return;
    }
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
    // Skip touch devices entirely
    if (isTouchDevice) return;

    const tgt = e.target as Element;
    // If we're over any interactive element: hide the preview immediately
    if (tgt.closest(INTERACTIVE_SELECTOR)) {
      if (previewRef.current) {
        previewRef.current.style.visibility = "hidden";
      }
      return;
    }

    // Otherwise, if we have a hoveredPreview, position & ensure it's visible
    if (previewRef.current && hoveredPreview) {
      const w = 250;
      const h = previewRef.current.offsetHeight;
      let x = e.clientX + 12;
      let y = e.clientY + 12;
      // Flip left if overflow
      if (x + w > window.innerWidth) x = e.clientX - w - 12;
      // Clamp bottom
      if (y + h > window.innerHeight) y = window.innerHeight - h - 5;
      if (y < 0) y = 5;

      previewRef.current.style.left = `${x}px`;
      previewRef.current.style.top = `${y}px`;
      previewRef.current.style.visibility = "visible";
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

  const handleToggleExpanded = (oracleId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(oracleId)) {
        newSet.delete(oracleId);
      } else {
        newSet.add(oracleId);
      }
      return newSet;
    });
  };

  const handleTabChange = useCallback(
    (val: string) => {
      setActiveTab((currentActiveTab) => {
        if (currentActiveTab === "search" && val !== "search") {
          previousTabRef.current = val as TabKey;
        }
        return val as TabKey;
      });
      handleMouseLeaveContainer();
      setCurrentPage(1);
      setFilteredMasterInventory(null);
      setActiveSearchTerm("");
      setInventorySearchTerm("");
      setExpandedItems(new Set());
    },
    [handleMouseLeaveContainer],
  );

  const handleInventorySearch = async (term: string) => {
    handleMouseLeaveContainer();
    setInventorySearchTerm(term);
    setActiveSearchTerm(term);
    setActiveTab("search");
    setCurrentPage(1);
    setFilteredMasterInventory([]);
    setExpandedItems(new Set());
  };

  const handleClearInventorySearch = () => {
    handleMouseLeaveContainer();
    setInventorySearchTerm("");
    setActiveSearchTerm("");
    setFilteredMasterInventory(null);
    setActiveTab(previousTabRef.current);
    setCurrentPage(1);
    setExpandedItems(new Set());
  };

  if (isInitialLoading) {
    return <InventoryReadOnlySkeleton viewMode={viewMode} />;
  }

  return (
    <div
      className="container mx-auto p-4"
      onMouseLeave={handleMouseLeaveContainer}
      onTouchStart={handleTouchStart}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:flex justify-end mb-4">
            <InventoryExportMenu
              className="mb-2 mr-0 md:mb-0 md:mr-1"
              inventory={masterInventory}
              currentListForTab={groupedInventory[activeTab]}
              activeTab={activeTab}
            />
            <InventoryViewControls
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              infiniteScroll={infiniteScroll}
              onInfiniteScrollToggle={(v) => {
                if (!v) {
                  setCurrentPage(1);
                }
                setInfiniteScroll(v);
              }}
            />
          </div>
          <InventorySearch
            value={inventorySearchTerm}
            onValueChange={setInventorySearchTerm}
            onSearchSubmit={handleInventorySearch}
            onClear={handleClearInventorySearch}
            isSearching={isInventorySearching}
          />

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <InventoryTabsHeader
              tabsToDisplay={tabsToDisplay}
              activeTab={activeTab}
            />

            {tabsToDisplay.map((tab) => (
              <TabsContent key={tab.key} value={tab.key}>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {groupedInventory[
                      tab.key as keyof typeof groupedInventory
                    ].map((item) => (
                      <ReadOnlyMasterInventoryGridItem
                        key={item.oracle_id}
                        item={item}
                        isExpanded={expandedItems.has(item.oracle_id)}
                        onToggleExpanded={handleToggleExpanded}
                        onMouseEnter={handleMouseEnter}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeaveContainer}
                        places={places}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg shadow-sm">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase">
                            Name
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase">
                            Total
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase">
                            Versions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {groupedInventory[
                          tab.key as keyof typeof groupedInventory
                        ].map((item) => (
                          <ReadOnlyMasterInventoryListItem
                            key={item.oracle_id}
                            item={item}
                            isExpanded={expandedItems.has(item.oracle_id)}
                            onToggleExpanded={handleToggleExpanded}
                            onMouseEnter={handleMouseEnter}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeaveContainer}
                            places={places}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {infiniteScroll && activeTab !== "search" && hasMore && (
            <InfiniteScrollSentinel
              onLoadMore={() => setCurrentPage((p) => p + 1)}
              hasMore={hasMore}
              className="w-full h-1"
            />
          )}

          {(!infiniteScroll || activeTab === "search") && totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination aria-label="Pagination">
                <PaginationPrevious
                  aria-disabled={currentPage === 1}
                  onClick={() =>
                    currentPage > 1 && handlePageChange(currentPage - 1)
                  }
                />
                <PaginationContent>
                  {paginationRange.map((page, idx) => (
                    <PaginationItem key={idx}>
                      {page === "..." ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          isActive={page === currentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(page as number);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                </PaginationContent>
                <PaginationNext
                  aria-disabled={currentPage === totalPages}
                  onClick={() =>
                    currentPage < totalPages &&
                    handlePageChange(currentPage + 1)
                  }
                />
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

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
          <div
            className={clsx(
              "w-[250px] max-h-[80vh] rounded shadow-xl border border-black/20",
              "bg-black flex items-center justify-center",
            )}
          >
            <Loader2 className="h-6 w-6 animate-spin text-white" />
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
              "w-[250px] max-h-[80vh] rounded shadow-xl border border-black/20",
              "bg-black transition-opacity duration-200",
              previewLoading ? "opacity-0" : "opacity-100",
            )}
            draggable={false}
            loading="lazy"
          />
        )}
      </div>
    </div>
  );
}
