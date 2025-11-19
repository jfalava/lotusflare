import { Hono } from "hono";
import type { Bindings } from "../types";

const app = new Hono<{ Bindings: Bindings }>();

// == Admin Routes (Optional) ==
// Example: A protected route to refresh some data
app.get("/refresh-scryfall-sets", async (c) => {
  const secret = c.req.header("X-Refresh-Secret");
  if (secret !== c.env.REFRESH_SECRET) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  // Your logic to refresh set data from Scryfall would go here
  return c.json({ message: "Set data refresh initiated." });
});

export default app;
