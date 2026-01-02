/**
 * Centralized API client for making HTTP requests
 *
 * This module provides a type-safe, consistent way to make API calls
 * with automatic error handling and parameter serialization.
 *
 * Usage:
 * ```typescript
 * import { api, ApiError } from "@/lib/api-client";
 *
 * // GET request
 * const posts = await api.get<Post[]>("/api/posts", { categoryId: "abc" });
 *
 * // POST request
 * const newPost = await api.post<Post>("/api/posts", { title: "Hello" });
 *
 * // Error handling
 * try {
 *   await api.post("/api/posts", data);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.log(error.status, error.code);
 *   }
 * }
 * ```
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Array<{ code: string; message: string; path?: string[] }>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Check if this is a client error (4xx)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if this is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if the error is due to authentication
   */
  isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * Check if the error is due to authorization
   */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * Check if the resource was not found
   */
  isNotFound(): boolean {
    return this.status === 404;
  }
}

type RequestParams = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  params?: RequestParams;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl = "", defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = defaultHeaders;
  }

  /**
   * Build a URL with query parameters
   */
  private buildUrl(path: string, params?: RequestParams): string {
    const url = new URL(path, this.baseUrl || window.location.origin);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Make an HTTP request
   */
  private async request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options?.headers,
    };

    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options?.signal,
    });

    // Handle empty responses
    if (response.status === 204) {
      return undefined as T;
    }

    // Try to parse response as JSON
    let data: unknown;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = {};
      }
    } else {
      data = await response.text();
    }

    // Handle error responses
    if (!response.ok) {
      const errorData = data as { error?: string; code?: string; details?: unknown[] };
      throw new ApiError(
        errorData?.error || `Request failed: ${response.status}`,
        response.status,
        errorData?.code,
        errorData?.details as Array<{ code: string; message: string; path?: string[] }>,
      );
    }

    return data as T;
  }

  /**
   * Make a GET request
   */
  get<T>(
    path: string,
    params?: RequestParams,
    options?: Omit<RequestOptions, "params" | "body">,
  ): Promise<T> {
    return this.request<T>("GET", path, { ...options, params });
  }

  /**
   * Make a POST request
   */
  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">): Promise<T> {
    return this.request<T>("POST", path, { ...options, body });
  }

  /**
   * Make a PATCH request
   */
  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">): Promise<T> {
    return this.request<T>("PATCH", path, { ...options, body });
  }

  /**
   * Make a PUT request
   */
  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">): Promise<T> {
    return this.request<T>("PUT", path, { ...options, body });
  }

  /**
   * Make a DELETE request
   */
  delete<T>(path: string, options?: Omit<RequestOptions, "body">): Promise<T> {
    return this.request<T>("DELETE", path, options);
  }

  /**
   * Create a new client with additional default headers
   */
  withHeaders(headers: Record<string, string>): ApiClient {
    return new ApiClient(this.baseUrl, { ...this.defaultHeaders, ...headers });
  }
}

/**
 * Default API client instance
 *
 * Usage:
 * ```typescript
 * import { api } from "@/lib/api-client";
 *
 * const posts = await api.get<Post[]>("/api/posts");
 * ```
 */
export const api = new ApiClient();

/**
 * Create a custom API client with specific configuration
 *
 * Usage:
 * ```typescript
 * const externalApi = createApiClient("https://api.example.com");
 * const data = await externalApi.get<Data>("/endpoint");
 * ```
 */
export function createApiClient(
  baseUrl?: string,
  defaultHeaders?: Record<string, string>,
): ApiClient {
  return new ApiClient(baseUrl, defaultHeaders);
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Extract a user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
