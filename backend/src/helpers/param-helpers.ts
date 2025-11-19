import { Context } from "hono";
import { ValidationError } from "../middlewares/error-handler";

/**
 * Extract and validate integer ID from route parameter
 * @param c - Hono context
 * @param paramName - Name of the parameter (default: "id")
 * @returns Validated integer ID
 * @throws ValidationError if ID is invalid
 */
export function getIntId(c: Context, paramName: string = "id"): number {
  const idStr = c.req.param(paramName);
  const id = parseInt(idStr, 10);

  if (isNaN(id) || id <= 0) {
    throw new ValidationError(`Invalid ${paramName}: must be a positive integer`);
  }

  return id;
}

/**
 * Extract and validate string ID from route parameter
 * @param c - Hono context
 * @param paramName - Name of the parameter (default: "id")
 * @returns Validated string ID
 * @throws ValidationError if ID is empty
 */
export function getStringId(c: Context, paramName: string = "id"): string {
  const id = c.req.param(paramName);

  if (!id || id.trim() === "") {
    throw new ValidationError(`Invalid ${paramName}: cannot be empty`);
  }

  return id;
}

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Extract and validate pagination parameters from query string
 * @param c - Hono context
 * @param defaultLimit - Default limit value (default: 50)
 * @param maxLimit - Maximum allowed limit (default: 200)
 * @returns Pagination parameters
 */
export function getPaginationParams(
  c: Context,
  defaultLimit: number = 50,
  maxLimit: number = 200
): PaginationParams {
  const pageStr = c.req.query("page");
  const limitStr = c.req.query("limit");

  let page = pageStr ? parseInt(pageStr, 10) : 1;
  let limit = limitStr ? parseInt(limitStr, 10) : defaultLimit;

  // Validate and sanitize values
  page = Math.max(1, isNaN(page) ? 1 : page);
  limit = Math.max(1, isNaN(limit) ? defaultLimit : Math.min(limit, maxLimit));

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Extract optional integer query parameter
 * @param c - Hono context
 * @param paramName - Name of the query parameter
 * @param defaultValue - Default value if not provided
 * @returns Integer value or default
 */
export function getOptionalInt(
  c: Context,
  paramName: string,
  defaultValue: number | null = null
): number | null {
  const value = c.req.query(paramName);

  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Extract optional string query parameter
 * @param c - Hono context
 * @param paramName - Name of the query parameter
 * @param defaultValue - Default value if not provided
 * @returns String value or default
 */
export function getOptionalString(
  c: Context,
  paramName: string,
  defaultValue: string | null = null
): string | null {
  const value = c.req.query(paramName);
  return value && value.trim() !== "" ? value : defaultValue;
}

/**
 * Extract optional boolean query parameter
 * @param c - Hono context
 * @param paramName - Name of the query parameter
 * @param defaultValue - Default value if not provided
 * @returns Boolean value or default
 */
export function getOptionalBoolean(
  c: Context,
  paramName: string,
  defaultValue: boolean = false
): boolean {
  const value = c.req.query(paramName);

  if (!value) return defaultValue;

  // Handle common boolean representations
  const lowerValue = value.toLowerCase();
  if (lowerValue === "true" || lowerValue === "1" || lowerValue === "yes") {
    return true;
  }
  if (lowerValue === "false" || lowerValue === "0" || lowerValue === "no") {
    return false;
  }

  return defaultValue;
}
