import { Context } from "hono";
import { ZodSchema } from "zod";

/**
 * Middleware to validate request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Hono middleware function
 */
export function validateRequest<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: () => Promise<void>) => {
    let body: unknown;

    try {
      body = await c.req.json();
    } catch (e) {
      return c.json({ message: "Invalid JSON in request body" }, 400);
    }

    const validation = schema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          message: "Validation failed",
          errors: validation.error.flatten(),
        },
        400
      );
    }

    // Store validated data in context for use in route handler
    c.set("validatedData", validation.data);

    await next();
  };
}

/**
 * Get validated data from context (type-safe)
 * @param c - Hono context
 * @returns Validated data
 */
export function getValidatedData<T>(c: Context): T {
  return c.get("validatedData") as T;
}
