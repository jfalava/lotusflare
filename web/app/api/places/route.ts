import { NextRequest } from "next/server";
import { proxyToBackend } from "../_lib/proxy";

/**
 * GET /api/places - Fetch all places
 */
export async function GET(request: NextRequest) {
  return proxyToBackend(request, "/api/places");
}
