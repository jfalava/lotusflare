import { NextRequest } from "next/server";
import { proxyToBackend } from "~/api/_lib/proxy";

/**
 * DELETE /api/places/:id - Delete a place
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/places/${id}`);
}
