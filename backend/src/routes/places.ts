import { Hono } from "hono";
import { getIntId } from "../helpers/param-helpers";
import { handleKnownErrors } from "../middlewares/error-handler";
import {
  getValidatedData,
  validateRequest,
} from "../middlewares/validate-request";
import type {
  Bindings,
  CreatePlacePayload,
  PlaceDbo,
  UpdatePlacePayload,
} from "../types";
import { createPlaceSchema, updatePlaceSchema } from "../validators";

const app = new Hono<{ Bindings: Bindings }>();

// == Places Routes ==
app.get("/", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM Places ORDER BY name ASC",
    ).all<PlaceDbo>();
    return c.json(results || []);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to fetch places");
  }
});

app.post("/", validateRequest(createPlaceSchema), async (c) => {
  try {
    const { name, type, description } = getValidatedData<CreatePlacePayload>(c);

    const result = await c.env.DB.prepare(
      "INSERT INTO Places (name, type, description) VALUES (?, ?, ?) RETURNING *",
    )
      .bind(name, type, description || null)
      .first<PlaceDbo>();

    return result
      ? c.json(result, 201)
      : c.json({ message: "Failed to create place" }, 500);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
      return c.json({ message: "A place with this name already exists." }, 409);
    }
    return handleKnownErrors(e, c, "Failed to create place");
  }
});

app.get("/:id", async (c) => {
  try {
    const id = getIntId(c);
    const place = await c.env.DB.prepare("SELECT * FROM Places WHERE id = ?")
      .bind(id)
      .first<PlaceDbo>();

    return place ? c.json(place) : c.json({ message: "Place not found" }, 404);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to fetch place");
  }
});

app.put("/:id", validateRequest(updatePlaceSchema), async (c) => {
  try {
    const id = getIntId(c);
    const { name, type, description } = getValidatedData<UpdatePlacePayload>(c);

    const fieldsToUpdate: string[] = [];
    const valuesToBind: (string | null)[] = [];

    if (name !== undefined) {
      fieldsToUpdate.push("name = ?");
      valuesToBind.push(name);
    }
    if (type !== undefined) {
      fieldsToUpdate.push("type = ?");
      valuesToBind.push(type);
    }
    // For description, allow setting to null explicitly
    if (
      Object.prototype.hasOwnProperty.call(
        { name, type, description },
        "description",
      )
    ) {
      fieldsToUpdate.push("description = ?");
      valuesToBind.push(description === undefined ? null : description);
    }

    if (fieldsToUpdate.length === 0) {
      return c.json({ message: "No valid fields to update" }, 400);
    }

    fieldsToUpdate.push("updated_at = CURRENT_TIMESTAMP");
    valuesToBind.push(id.toString());

    const updatedPlace = await c.env.DB.prepare(
      `UPDATE Places SET ${fieldsToUpdate.join(", ")} WHERE id = ? RETURNING *`,
    )
      .bind(...valuesToBind)
      .first<PlaceDbo>();

    return updatedPlace
      ? c.json(updatedPlace)
      : c.json({ message: "Place not found or failed to update" }, 404);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
      return c.json({ message: "A place with this name already exists." }, 409);
    }
    return handleKnownErrors(e, c, "Failed to update place");
  }
});

app.delete("/:id", async (c) => {
  try {
    const id = getIntId(c);

    const { success, meta } = await c.env.DB.prepare(
      "DELETE FROM Places WHERE id = ?",
    )
      .bind(id)
      .run();

    return success && meta.changes > 0
      ? c.body(null, 204)
      : c.json({ message: "Place not found or failed to delete" }, 404);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to delete place");
  }
});

export default app;
