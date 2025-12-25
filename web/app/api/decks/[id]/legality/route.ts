import { NextRequest } from "next/server";
import { proxyToBackend } from "~/api/_lib/proxy";

/**
 * GET /api/decks/:id/legality - Check deck legality for a specific format
 * Supports query parameters: format (required)
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const path = queryString
    ? `/api/decks/${params.id}/legality?${queryString}`
    : `/api/decks/${params.id}/legality`;

  return proxyToBackend(request, path);
}
