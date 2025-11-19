import { NextRequest } from "next/server";
import { proxyToBackend } from "~/api/_lib/proxy";

/**
 * GET /api/decks/:id - Fetch deck by ID
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  return proxyToBackend(request, `/api/decks/${params.id}`);
}

/**
 * DELETE /api/decks/:id - Delete a deck
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  return proxyToBackend(request, `/api/decks/${params.id}`);
}
