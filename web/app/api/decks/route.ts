import { NextRequest } from "next/server";
import { proxyToBackend } from "~/api/_lib/proxy";

/**
 * GET /api/decks - Fetch all decks
 */
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/decks");
}

/**
 * POST /api/decks - Create a new deck
 */
export async function POST(request: NextRequest) {
  return proxyToBackend(request, "/api/decks");
}
