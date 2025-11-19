import { Context } from "hono";

/**
 * Wrap an async handler with error handling
 * @param handler - Async handler function
 * @param errorMessage - Error message to return on failure
 * @returns Wrapped handler with error handling
 */
export function withErrorHandling<T>(
  handler: (c: Context) => Promise<Response>,
  errorMessage: string,
) {
  return async (c: Context): Promise<Response> => {
    try {
      return await handler(c);
    } catch (e: unknown) {
      console.error(`${errorMessage}:`, e);
      return c.json(
        {
          message: errorMessage,
          error: (e as Error).message,
        },
        500,
      );
    }
  };
}

/**
 * Custom error classes for better error handling
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Handle known error types with appropriate status codes
 * @param error - Error object
 * @param c - Hono context
 * @param defaultMessage - Default error message
 * @returns Response with appropriate status code
 */
export function handleKnownErrors(
  error: unknown,
  c: Context,
  defaultMessage: string,
): Response {
  console.error(`${defaultMessage}:`, error);

  if (error instanceof NotFoundError) {
    return c.json({ message: error.message }, 404);
  }

  if (error instanceof ValidationError) {
    return c.json({ message: error.message }, 400);
  }

  if (error instanceof UnauthorizedError) {
    return c.json({ message: error.message }, 401);
  }

  return c.json(
    {
      message: defaultMessage,
      error: (error as Error).message,
    },
    500,
  );
}
