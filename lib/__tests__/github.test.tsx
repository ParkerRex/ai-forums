// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { useGitHubIssues } from "../github";
import { SWRConfig } from "swr";
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig
    value={{
      dedupingInterval: 0,
      provider: () => new Map(),
    }}
  >
    {children}
  </SWRConfig>
);

describe("useGitHubIssues", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should fetch GitHub issues successfully", async () => {
    const mockIssues = [
      {
        id: 1,
        number: 1,
        title: "Issue 1",
        html_url: "https://github.com/joinvai/vai-vex/issues/1",
      },
      {
        id: 2,
        number: 2,
        title: "Issue 2",
        html_url: "https://github.com/joinvai/vai-vex/issues/2",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIssues,
    } as Response);

    const { result } = renderHook(() => useGitHubIssues(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.issues).toEqual([]);
    expect(result.current.error).toBeUndefined();

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check fetched data
    expect(result.current.issues).toEqual(mockIssues);
    expect(result.current.error).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith("/api/github/issues?page=1");
  });

  it("should handle pagination", async () => {
    const mockIssues = [
      {
        id: 3,
        number: 3,
        title: "Issue 3",
        html_url: "https://github.com/joinvai/vai-vex/issues/3",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIssues,
    } as Response);

    const { result } = renderHook(() => useGitHubIssues(2), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/github/issues?page=2");
    expect(result.current.issues).toEqual(mockIssues);
  });

  it("should handle fetch errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useGitHubIssues(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
    expect(result.current.issues).toEqual([]);
  });

  it("should handle non-ok responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() => useGitHubIssues(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
    expect(result.current.issues).toEqual([]);
  });
});
