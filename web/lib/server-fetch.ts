import packageJson from "@/package.json";

/**
 * Get the API base URL based on the current environment
 */
export function getApiBaseUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:8787";
  }

  const prodUrl = process.env.PROD_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (!prodUrl) {
    throw new Error(
      "PROD_APP_URL or NEXT_PUBLIC_BASE_URL environment variable is not set",
    );
  }

  return prodUrl;
}

/**
 * Common headers for SSR fetch requests
 */
export function getServerFetchHeaders(apiBaseUrl: string): HeadersInit {
  return {
    "User-Agent": `Lotusflare/WEB v${packageJson.version}`,
    Accept: "application/json",
    "X-Requested-With": "SSR",
    ...(process.env.NODE_ENV !== "development" && {
      Host: new URL(apiBaseUrl).host,
    }),
  };
}

export interface ServerFetchOptions extends Omit<RequestInit, "signal"> {
  /**
   * Timeout in milliseconds (default: 15000)
   */
  timeout?: number;
}

/**
 * Server-side fetch with timeout and standard headers
 * @param url - The URL to fetch
 * @param options - Fetch options with optional timeout
 * @returns Response object
 */
export async function serverFetch(
  url: string,
  options: ServerFetchOptions = {},
): Promise<Response> {
  const { timeout = 15000, ...fetchOptions } = options;
  const apiBaseUrl = getApiBaseUrl();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        ...getServerFetchHeaders(apiBaseUrl),
        ...fetchOptions.headers,
      },
      ...fetchOptions,
    });

    clearTimeout(timeoutId);
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Server-side fetch with automatic JSON parsing and error handling
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function serverFetchJson<T>(
  url: string,
  options: ServerFetchOptions = {},
): Promise<T> {
  const response = await serverFetch(url, options);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error(
      `[SSR] Fetch failed: ${response.status} ${response.statusText}`,
      errorText,
    );
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  return (await response.json()) as T;
}

/**
 * Server-side fetch with error handling that returns null on failure
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Parsed JSON response or null on error
 */
export async function serverFetchJsonSafe<T>(
  url: string,
  options: ServerFetchOptions = {},
): Promise<T | null> {
  try {
    return await serverFetchJson<T>(url, options);
  } catch (error) {
    console.error("[SSR] Failed to fetch:", error);
    return null;
  }
}
