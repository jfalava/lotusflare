import { NextRequest } from "next/server";
import { proxyToBackend } from "~/api/_lib/proxy";

/**
 * PUT /api/v2/inventory/details/:id - Update inventory detail
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v2/inventory/details/${id}`);
}
