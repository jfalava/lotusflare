import { NextRequest } from "next/server";
import { proxyToBackend } from "../_lib/proxy";

/**
 * GET /api/activity - Fetch activity feed
 * Supports query parameters: page, limit
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const path = queryString ? `/api/activity?${queryString}` : "/api/activity";

  return proxyToBackend(request, path);
}
