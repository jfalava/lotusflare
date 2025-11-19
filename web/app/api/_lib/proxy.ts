import { getApiBaseUrl, getAuthHeaders } from "@/lib/server-fetch";
import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy a request to the backend API with authentication headers
 * @param request - The incoming Next.js request
 * @param path - The backend API path (e.g., "/api/places")
 * @param options - Additional fetch options
 * @returns NextResponse with the backend response
 */
export async function proxyToBackend(
  request: NextRequest,
  path: string,
  options?: RequestInit,
): Promise<NextResponse> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}${path}`;

    // Get the request body if present
    let body: string | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        body = await request.text();
      } catch (e) {
        // No body or already consumed
        body = undefined;
      }
    }

    // Forward the request to the backend with auth headers
    const response = await fetch(url, {
      method: request.method,
      headers: {
        ...getAuthHeaders(),
        "Content-Type":
          request.headers.get("Content-Type") || "application/json",
      },
      body,
      ...options,
    });

    // Get response body
    const responseBody = await response.text();

    // Return the response with the same status and headers
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("[API Proxy] Error proxying request:", error);
    return NextResponse.json(
      { error: "Failed to proxy request to backend" },
      { status: 500 },
    );
  }
}
