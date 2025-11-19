// app/edit/inventory/page.tsx

import { Metadata } from "next";
import { Suspense } from "react";
import NewInventoryClient from "@/components/inventory/inventory-edit-client";
import { InventoryBrowseSkeleton } from "@/components/inventory/inventory-browse-skeleton";
import type { PaginatedMasterInventoryResponse } from "#/backend/src/types";
import { getApiBaseUrl, serverFetchJson } from "@/lib/server-fetch";
import { META_FETCH_LIMIT } from "@/lib/constants";
import { pickRepresentativeInventoryImage } from "@/lib/image-utils";
import { generateInventoryMetadata } from "@/lib/metadata-utils";

export const dynamic = "force-dynamic";

async function fetchInventoryMeta(): Promise<PaginatedMasterInventoryResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const url = new URL(`${apiBaseUrl}/api/v2/inventory`);
  url.searchParams.set("page", "1");
  url.searchParams.set("limit", META_FETCH_LIMIT.toString());

  return await serverFetchJson<PaginatedMasterInventoryResponse>(
    url.toString(),
  );
}

export async function generateMetadata(): Promise<Metadata> {
  let meta: PaginatedMasterInventoryResponse;
  try {
    meta = await fetchInventoryMeta();
  } catch (err) {
    console.error("[SSR] Failed to fetch inventory metadata:", err);
    return {
      title: "Edit inventory | Lotusflare",
      description: "Edit your inventory.",
    };
  }

  const totalUnique = meta.totalCount ?? 0;
  const repImage = pickRepresentativeInventoryImage(meta.data ?? []);

  return generateInventoryMetadata({
    totalUnique,
    imageUrl: repImage,
    isEditMode: true,
  });
}

export default function NewInventoryPage() {
  return (
    <Suspense fallback={<InventoryBrowseSkeleton />}>
      <NewInventoryClient />
    </Suspense>
  );
}
