// ./middlewares/auth.ts
import type { Context, Next } from "hono";
import type { Bindings } from "../types";

/**
 * Authentication middleware that validates bearer tokens
 *
 * Public endpoints (no auth required):
 * - /api/health
 *
 * All other endpoints require Bearer token authentication
 */
export async function authMiddleware(
  c: Context<{ Bindings: Bindings }>,
  next: Next,
) {
  // Define public endpoints that don't require authentication
  const publicEndpoints = ["/api/health"];

  // Check if the current path is a public endpoint
  if (publicEndpoints.includes(c.req.path)) {
    return await next();
  }

  // Get the Authorization header
  const auth = c.req.header("Authorization");

  // Check if Authorization header is present and properly formatted
  if (!auth || !auth.startsWith("Bearer ")) {
    return c.text("Unauthorized", 401);
  }

  // Extract the token (remove "Bearer " prefix)
  const token = auth.slice(7);

  // Get the expected token from environment/secrets
  const expectedToken = c.env.LOTUSFLARE_AUTH;

  // Validate the token
  if (!expectedToken || token !== expectedToken) {
    return c.text("Unauthorized", 401);
  }

  // Token is valid, proceed to the next middleware/handler
  await next();
}
