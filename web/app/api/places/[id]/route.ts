import { NextRequest } from "next/server";
import { proxyToBackend } from "~/api/_lib/proxy";

/**
 * DELETE /api/places/:id - Delete a place
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return proxyToBackend(request, `/api/places/${params.id}`);
}
