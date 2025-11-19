"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { FileSearch2, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import type {
  MasterInventoryWithDetails,
  ScryfallApiCard,
  PlaceDbo,
  InventoryDetailWithCardDetails,
  PaginatedMasterInventoryResponse,
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
import { MasterInventoryGridItem } from "./inventory-grid-item";
import { InventoryViewControls } from "@/components/inventory/shared/inventory-view-controls";
import { MasterInventoryListItem } from "./inventory-list-item";
import ScryfallSearchBar from "./scryfall-search-bar";
import { useTopLoader } from "nextjs-toploader";
import { InventorySearch } from "@/components/inventory/inventory-search";
import { useViewMode } from "@/components/context/view-mode-context";
import { useSettings } from "@/components/context/settings-context";
import { InfiniteScrollSentinel } from "@/components/inventory/shared/infinite-scroll-sentinel";
import { InventoryExportMenu } from "@/components/inventory/shared/inventory-export-menu";
import { InventoryBrowseSkeleton } from "@/components/inventory/inventory-browse-skeleton";
import { BulkImportModal } from "./bulk-import-modal";
import { AddToMasterModal } from "./add-to-master-modal";
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
import { Button } from "../ui/button";
import Link from "next/link";
import { Kbd } from "../ui/kbd";
import { INVENTORY_PAGE_SIZE } from "@/lib/constants";
import {
  fetchInventoryMeta,
  fetchInventoryCounts,
  deleteInventoryDetail,
} from "@/lib/api-server";

const PAGE_SIZE = INVENTORY_PAGE_SIZE;
const INTERACTIVE_SELECTOR =
  "button, a, [role='button'], input, select, textarea," +
  " [data-radix-dropdown-menu-trigger], [data-radix-dropdown-menu-content]," +
  " [data-radix-popper-content-wrapper], [role='menu'], [role='menuitem']";

interface NewInventoryClientProps {
  initialInventory: PaginatedMasterInventoryResponse;
  initialPlaces: PlaceDbo[];
}

/**
 * Utility function to determine card color group
 * @param {ScryfallApiCard} card - The card to analyze
 * @returns {InventoryColorGroup} The color group of the card
 */
function getCardColorGroup(card: ScryfallApiCard): InventoryColorGroup {
  // Handle double-faced cards - check card_faces if present
  let cardColors = card.colors;
  let cardTypeLine = card.type_line;

  // For double-faced cards, use the front face's information
  if (
    !cardColors &&
    Array.isArray(card.card_faces) &&
    card.card_faces.length > 0
  ) {
    cardColors = card.card_faces[0].colors;
  }
  if (
    !cardTypeLine &&
    Array.isArray(card.card_faces) &&
    card.card_faces.length > 0
  ) {
    cardTypeLine = card.card_faces[0].type_line;
  }

  // Handle lands
  if (cardTypeLine?.toLowerCase().includes("land")) {
    return "Land";
  }

  // Handle artifacts (non-creature artifacts or artifact creatures without other colors)
  if (cardTypeLine?.toLowerCase().includes("artifact")) {
    if (!cardColors || cardColors.length === 0) {
      return "Artifact";
    }
  }

  // Handle colorless (no colors and not artifact/land)
  if (!cardColors || cardColors.length === 0) {
    return "Colorless";
  }

  // Handle multicolor
  if (cardColors.length > 1) {
    return "Multicolor";
  }

  // Handle single colors
  const color = cardColors[0];
  switch (color) {
    case "W":
      return "White";
    case "U":
      return "Blue";
    case "B":
      return "Black";
    case "R":
      return "Red";
    case "G":
      return "Green";
    default:
      return "Colorless";
  }
}

export default function NewInventoryClient({
  initialInventory,
  initialPlaces,
}: NewInventoryClientProps) {
  const [masterInventory, setMasterInventory] = useState<
    MasterInventoryWithDetails[]
  >(initialInventory.data);
  const [places] = useState<PlaceDbo[]>(initialPlaces);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
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
  const [hasMore, setHasMore] = useState(initialInventory.hasMore);
  const [totalCount, setTotalCount] = useState(initialInventory.totalCount);
  const [cardToAdd, setCardToAdd] = useState<ScryfallApiCard | null>(null);
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

  useEffect(() => {
    async function loadTabCounts() {
      try {
        const data = await fetchInventoryCounts();
        setTabCounts(data);
      } catch (err) {
        toast.error((err as Error).message);
      }
    }
    loadTabCounts();
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
        const invData = await fetchInventoryMeta(
          pageToFetch,
          PAGE_SIZE,
          searchTerm || undefined,
          colorGroup || undefined,
        );

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
    // 1) skip touch devices entirely
    if (isTouchDevice) return;

    const tgt = e.target as Element;
    // 2) if we're over any interactive element: hide the preview immediately
    if (tgt.closest(INTERACTIVE_SELECTOR)) {
      if (previewRef.current) {
        previewRef.current.style.visibility = "hidden";
      }
      return;
    }

    // 3) otherwise, if we have a hoveredPreview, position & ensure it's visible
    if (previewRef.current && hoveredPreview) {
      const w = 250;
      const h = previewRef.current.offsetHeight;
      let x = e.clientX + 12;
      let y = e.clientY + 12;
      // flip left if overflow
      if (x + w > window.innerWidth) x = e.clientX - w - 12;
      // clamp bottom
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

  const handleBulkItemsAdded = async (
    newItems: InventoryDetailWithCardDetails[],
  ) => {
    const newCounts = await fetchInventoryCounts();
    setTabCounts(newCounts);
    const newMap = new Map<string, MasterInventoryWithDetails>();
    newItems.forEach((d) => {
      const o = d.master_oracle_id;
      if (!newMap.has(o)) {
        newMap.set(o, {
          oracle_id: o,
          name: d.card.name,
          notes: null,
          created_at: d.added_at,
          updated_at: d.updated_at,
          details: newItems.filter((x) => x.master_oracle_id === o),
        });
      }
    });
    setMasterInventory((prev) => {
      const seen = new Set(prev.map((m) => m.oracle_id));
      const toPrepend = Array.from(newMap.values()).filter(
        (m) => !seen.has(m.oracle_id),
      );
      return [...toPrepend, ...prev];
    });
    setFilteredMasterInventory(null);
    setInventorySearchTerm("");
    setActiveSearchTerm("");
    setActiveTab("White");
    setCurrentPage(1);
    setExpandedItems(new Set());
    toast.success(`${newItems.length} items imported successfully!`);
  };

  const handleCardAdded = useCallback(
    async (detail: InventoryDetailWithCardDetails) => {
      const cardColorGroup = getCardColorGroup(detail.card);
      const isCurrentTab =
        activeTab === "search" ? true : activeTab === cardColorGroup;

      // Update tab counts
      const newCounts = await fetchInventoryCounts();
      setTabCounts(newCounts);

      // If the card doesn't belong to the current tab and we're not in search,
      // just show a toast and optionally suggest switching tabs
      if (!isCurrentTab && activeTab !== "search") {
        toast.success(
          `Added ${detail.card.name} (${detail.card.set_name}) to inventory in ${cardColorGroup} section.`,
          {
            action: {
              label: `Go to ${cardColorGroup}`,
              onClick: () => setActiveTab(cardColorGroup),
            },
          },
        );
        return;
      }

      // Refetch current tab data to ensure consistency
      const isSearch = activeTab === "search";
      await fetchMasterInventory(
        currentPage,
        false, // Don't append, replace current page
        isSearch ? activeSearchTerm : "",
        isSearch ? "" : activeTab,
      );

      toast.success(
        `Added ${detail.card.name} (${detail.card.set_name}) to inventory.`,
      );
    },
    [
      activeTab,
      activeSearchTerm,
      currentPage,
      fetchMasterInventory,
      setActiveTab,
    ],
  );

  const handleDetailUpdate = useCallback(
    async (detailId: number, updatedDetail: InventoryDetailWithCardDetails) => {
      setMasterInventory((prev) =>
        prev.map((master) => ({
          ...master,
          details: master.details.map((detail) =>
            detail.id === detailId ? updatedDetail : detail,
          ),
        })),
      );

      if (filteredMasterInventory) {
        setFilteredMasterInventory(
          (prev) =>
            prev?.map((master) => ({
              ...master,
              details: master.details.map((detail) =>
                detail.id === detailId ? updatedDetail : detail,
              ),
            })) || null,
        );
      }
    },
    [filteredMasterInventory],
  );

  const handleDetailDelete = useCallback(
    async (detailId: number) => {
      try {
        await deleteInventoryDetail(detailId);

        // Update tab counts
        const newCounts = await fetchInventoryCounts();
        setTabCounts(newCounts);

        // Refetch current tab data to ensure consistency
        const isSearch = activeTab === "search";
        await fetchMasterInventory(
          currentPage,
          false, // Don't append, replace current page
          isSearch ? activeSearchTerm : "",
          isSearch ? "" : activeTab,
        );

        // Reset pagination if we're on a page that might now be empty
        if (!infiniteScroll && currentPage > 1) {
          // Check if we need to go back a page
          const newTotalPages = Math.ceil((totalCount - 1) / PAGE_SIZE);
          if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages);
          }
        }

        toast.success("Inventory item deleted successfully");
      } catch (error) {
        toast.error("Failed to delete inventory item");
        console.error("Error deleting inventory detail:", error);
      }
    },
    [
      activeTab,
      activeSearchTerm,
      currentPage,
      fetchMasterInventory,
      infiniteScroll,
      totalCount,
    ],
  );

  if (isInitialLoading) {
    return <InventoryBrowseSkeleton viewMode={viewMode} />;
  }

  return (
    <div
      className="container mx-auto p-4"
      onMouseLeave={handleMouseLeaveContainer}
      onTouchStart={handleTouchStart}
    >
      <Card className="mb-4">
        <CardHeader className="flex justify-between">
          <BulkImportModal onImported={handleBulkItemsAdded} />
          <Button variant="outline" asChild>
            <Link
              href="https://scryfall.com/docs/syntax"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <FileSearch2 className="mr-1 h-4 w-4" />
              <span>
                <span className="max-lg:hidden">Search syntax guide</span>
                <span className="lg:hidden">Guide</span> ↗
              </span>
              <div className="hidden items-center gap-1 lg:flex ml-2">
                <Kbd>Alt</Kbd>
                <Kbd>Y</Kbd>
              </div>
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ScryfallSearchBar onCardSelected={(c) => setCardToAdd(c)} />
        </CardContent>
      </Card>

      <AddToMasterModal
        open={!!cardToAdd}
        onOpenChange={(o) => !o && setCardToAdd(null)}
        card={cardToAdd}
        places={places}
        onSuccess={(detail) => {
          handleCardAdded(detail);
          setCardToAdd(null);
        }}
      />

      <Card>
        <CardHeader className="flex justify-between">
          <div className="grid md:flex gap-x-2 justify-end">
            <InventoryExportMenu
              className="mb-2 md:mb-0"
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
        </CardHeader>
        <CardContent>
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
                      <MasterInventoryGridItem
                        key={item.oracle_id}
                        item={item}
                        isExpanded={expandedItems.has(item.oracle_id)}
                        onToggleExpanded={handleToggleExpanded}
                        onMouseEnter={handleMouseEnter}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeaveContainer}
                        places={places}
                        onDetailUpdate={handleDetailUpdate}
                        onDetailDelete={handleDetailDelete}
                        onAddCopy={(card) => setCardToAdd(card)}
                        onPrintAdded={handleCardAdded}
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
                          <MasterInventoryListItem
                            key={item.oracle_id}
                            onAddCopy={(card) => setCardToAdd(card)}
                            item={item}
                            isExpanded={expandedItems.has(item.oracle_id)}
                            onToggleExpanded={handleToggleExpanded}
                            onMouseEnter={handleMouseEnter}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeaveContainer}
                            places={places}
                            onDetailUpdate={handleDetailUpdate}
                            onDetailDelete={handleDetailDelete}
                            onPrintAdded={handleCardAdded}
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
