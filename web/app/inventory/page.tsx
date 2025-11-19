// app/inventory/page.tsx

import { Metadata } from "next";
import { Suspense } from "react";
import ReadOnlyInventoryClient from "@/components/inventory/read-only/inventory-browse-client";
import { InventoryBrowseSkeleton } from "@/components/inventory/inventory-browse-skeleton";
import type { PaginatedMasterInventoryResponse } from "#/backend/src/types";
import { META_FETCH_LIMIT, INVENTORY_PAGE_SIZE } from "@/lib/constants";
import { pickRepresentativeInventoryImage } from "@/lib/image-utils";
import { generateInventoryMetadata } from "@/lib/metadata-utils";
import { fetchInventoryMeta, fetchPlaces } from "@/lib/api-server";

export const dynamic = "force-dynamic";

async function fetchInventoryMetaWrapper(): Promise<PaginatedMasterInventoryResponse> {
  return await fetchInventoryMeta(1, META_FETCH_LIMIT);
}

export async function generateMetadata(): Promise<Metadata> {
  let meta: PaginatedMasterInventoryResponse;
  try {
    meta = await fetchInventoryMetaWrapper();
  } catch (err) {
    console.error("[SSR] Failed to fetch inventory metadata:", err);
    return {
      title: "Inventory | Lotusflare",
      description: "Browse your Inventory.",
    };
  }

  const totalUnique = meta.totalCount ?? 0;
  const repImage = pickRepresentativeInventoryImage(meta.data ?? []);

  return generateInventoryMetadata({
    totalUnique,
    imageUrl: repImage,
    isEditMode: false,
  });
}

async function getInventoryPageData() {
  try {
    const [inventoryData, places] = await Promise.all([
      fetchInventoryMeta(1, INVENTORY_PAGE_SIZE),
      fetchPlaces(),
    ]);
    return { inventoryData, places };
  } catch (error) {
    console.error("[SSR] Failed to fetch inventory page data:", error);
    return {
      inventoryData: { data: [], totalCount: 0, hasMore: false },
      places: [],
    };
  }
}

export default async function NewInventoryPage() {
  const { inventoryData, places } = await getInventoryPageData();

  return (
    <Suspense fallback={<InventoryBrowseSkeleton />}>
      <ReadOnlyInventoryClient
        initialInventory={inventoryData}
        initialPlaces={places}
      />
    </Suspense>
  );
}
