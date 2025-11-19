/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  page?: number;
  limit?: number;
}

/**
 * Create a paginated response object
 * @param data - Array of data items
 * @param totalCount - Total count of items (across all pages)
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  totalCount: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    totalCount,
    hasMore: page * limit < totalCount,
    page,
    limit,
  };
}

/**
 * Create an empty paginated response
 * @param totalCount - Total count (usually 0 for empty responses)
 * @returns Empty paginated response
 */
export function createEmptyPaginatedResponse<T>(
  totalCount: number = 0
): PaginatedResponse<T> {
  return {
    data: [],
    totalCount,
    hasMore: false,
  };
}

/**
 * Success response with data
 */
export interface SuccessResponse<T> {
  data: T;
  message?: string;
}

/**
 * Create a success response
 * @param data - Response data
 * @param message - Optional success message
 * @returns Success response object
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): SuccessResponse<T> {
  const response: SuccessResponse<T> = { data };
  if (message) {
    response.message = message;
  }
  return response;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  message: string;
  error?: string;
  details?: unknown;
}

/**
 * Create an error response
 * @param message - Error message
 * @param error - Optional error details
 * @param details - Optional additional details
 * @returns Error response object
 */
export function createErrorResponse(
  message: string,
  error?: string,
  details?: unknown
): ErrorResponse {
  const response: ErrorResponse = { message };
  if (error) response.error = error;
  if (details) response.details = details;
  return response;
}
