import { NextRequest } from "next/server";
import { proxyToBackend } from "~/api/_lib/proxy";

/**
 * GET /api/scryfall/cards/:id - Fetch Scryfall card by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return proxyToBackend(request, `/api/scryfall/cards/${params.id}`);
}
