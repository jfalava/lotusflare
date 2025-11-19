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
      } catch {
        // No body or already consumed
        body = undefined;
      }
    }

    // Forward the request to the backend with auth headers
    const headers: HeadersInit = {
      ...getAuthHeaders(),
    };

    // Only set Content-Type if the client provided one, or if we have a body and need a default
    const clientContentType = request.headers.get("Content-Type");
    if (clientContentType) {
      headers["Content-Type"] = clientContentType;
    } else if (body && body.length > 0) {
      // Only default to application/json if there's actually a body
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method: request.method,
      headers,
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

    // Provide more specific error responses based on error type
    if (error instanceof TypeError) {
      // Network errors (e.g., DNS resolution failure, connection refused)
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes("fetch") ||
        errorMessage.includes("network") ||
        errorMessage.includes("connection")
      ) {
        return NextResponse.json(
          {
            error: "Backend service unavailable",
            details:
              "Unable to connect to the backend service. Please try again later.",
          },
          { status: 503 },
        );
      }
    }

    // Generic error fallback
    return NextResponse.json(
      {
        error: "Failed to proxy request to backend",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
