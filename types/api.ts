// API response type definitions

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiMeta {
  cursor?: string;
  hasMore?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore?: boolean;
  total?: number;
}

export interface ListResponse<T> {
  items: T[];
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  path?: string[];
}

// Generic success response for mutations
export interface SuccessResponse {
  success: boolean;
  message?: string;
}

// Delete response
export interface DeleteResponse {
  success: boolean;
  deleted?: boolean;
}

// Common query parameter types
export interface PaginationParams {
  cursor?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
