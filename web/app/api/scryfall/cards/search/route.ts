import { NextRequest } from "next/server";
import { proxyToBackend } from "~/api/_lib/proxy";

/**
 * GET /api/scryfall/cards/search - Search for Scryfall cards
 * Supports query parameters: q (required), unique, order, dir, etc.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const path = queryString
    ? `/api/scryfall/cards/search?${queryString}`
    : "/api/scryfall/cards/search";

  return proxyToBackend(request, path);
}
