import { NextRequest } from "next/server";
import { proxyToBackend } from "../../../../_lib/proxy";

/**
 * PUT /api/v2/inventory/details/:id - Update inventory detail
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return proxyToBackend(request, `/api/v2/inventory/details/${params.id}`);
}
