import { NextRequest } from "next/server";
import { proxyToBackend } from "~/api/_lib/proxy";

/**
 * GET /api/decks/:id - Fetch deck by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/decks/${id}`);
}

/**
 * DELETE /api/decks/:id - Delete a deck
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/decks/${id}`);
}
