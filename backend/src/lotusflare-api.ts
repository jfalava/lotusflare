// ./mtg-companion-api.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { ZodError } from "zod";
import type { Bindings } from "./types";

// Import routes
import activityRoutes from "./routes/activity";
import adminRoutes from "./routes/admin";
import dashboardRoutes from "./routes/dashboard";
import deckRoutes from "./routes/decks";
import inventoryRoutes from "./routes/inventory";
import placesRoutes from "./routes/places";
import scryfallRoutes from "./routes/scryfall";

// --- Hono App Setup ---
const app = new Hono<{ Bindings: Bindings }>();

// --- CORS Middleware ---
app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      // Define all allowed origins
      const allowedOrigins: string[] = [];
      const prodAppUrl = c.env.PROD_APP_URL;
      if (prodAppUrl) {
        allowedOrigins.push(prodAppUrl);
      }
      // 2. If in the development environment, ALSO allow localhost.
      if (c.env.WORKER_ENV === "development") {
        allowedOrigins.push("http://localhost:3000");
      }

      // 3. Check if the incoming request's origin is on the constructed whitelist.
      return allowedOrigins.includes(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"], // Add any other custom headers
    maxAge: 86400, // Cache preflight response for 1 day
    credentials: true, // If you use cookies or authorization headers
  }),
);

// --- Authentication Middleware ---
app.use("/api/*", async (c, next) => {
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
  const expectedToken = await c.env.LOTUSFLARE_AUTH.get();

  // Validate the token
  if (!expectedToken || token !== expectedToken) {
    return c.text("Unauthorized", 401);
  }

  // Token is valid, proceed to the next middleware/handler
  await next();
});

// --- API Sub-Router ---
const api = new Hono<{ Bindings: Bindings }>();

// Mount routes
api.route("/dashboard", dashboardRoutes);
api.route("/scryfall", scryfallRoutes);
api.route("/places", placesRoutes);
api.route("/v2/inventory", inventoryRoutes);
api.route("/decks", deckRoutes);
api.route("/activity", activityRoutes);
api.route("/admin", adminRoutes);

// --- Main Handler ---
export default {
  fetch: app.fetch,
};

// Error handling for Zod validation errors
app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      {
        message: "Validation failed",
        errors: err.flatten().fieldErrors,
      },
      400,
    );
  }
  // Log other errors to the console
  console.error(`[WORKER] Unhandled error: ${err.message}`, err.stack);
  return c.json(
    {
      message: "An unexpected error occurred.",
      error: err.message, // Be careful about exposing error details in production
    },
    500,
  );
});

// Route all /api calls to the 'api' sub-router
app.route("/api", api);
