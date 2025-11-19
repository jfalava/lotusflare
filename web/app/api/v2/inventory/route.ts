import { NextRequest } from "next/server";
import { proxyToBackend } from "~/api/_lib/proxy";

/**
 * POST /api/v2/inventory - Create or find master inventory entry
 */
export async function POST(request: NextRequest) {
  return proxyToBackend(request, "/api/v2/inventory");
}
