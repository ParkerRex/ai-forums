// @vitest-environment jsdom
import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useNewsFeed } from "../../hooks/use-news-feed";
import React from "react";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

// Set up global localStorage mock
global.localStorage = localStorageMock as any;

// Mock Convex
const mockUseAction = vi.fn();
vi.mock("convex/react", () => ({
  useAction: () => mockUseAction(),
  ConvexProvider: ({ children }: any) => children,
}));

// Mock useCurrentMember
const mockUseCurrentMember = vi.fn<[], any>(() => ({ member: null }));
vi.mock("@/hooks/use-current-member", () => ({
  useCurrentMember: () => mockUseCurrentMember(),
}));

describe("useNewsFeed", () => {
  const mockArticles = [
    {
      title: "AI Breakthrough",
      url: "https://example.com/ai-breakthrough",
      publishedDate: "2024-01-15T10:00:00Z",
      author: "John Doe",
      summary: "Major AI advancement announced",
      source: "AI News",
    },
    {
      title: "Microsoft Copilot Update",
      url: "https://github.com/microsoft/chat-copilot/update",
      publishedDate: "2024-01-14T10:00:00Z",
      summary: "New features in Copilot",
      source: "Microsoft Copilot",
    },
  ];

  let mockGetNews: any;

  beforeEach(() => {
    // Clear localStorage
    localStorageMock.clear();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock action
    mockGetNews = vi.fn().mockResolvedValue(mockArticles);
    
    // Set up useAction mock to return our mock function
    mockUseAction.mockReturnValue(mockGetNews);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should load news on mount", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    };
    
    const { result } = renderHook(() => useNewsFeed(), { wrapper });

    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.news).toEqual([]);

    // Wait for news to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.news).toEqual(mockArticles);
    expect(mockGetNews).toHaveBeenCalledWith({ userId: undefined });
  });

  it("should load from localStorage cache if available", async () => {
    const cachedData = {
      data: mockArticles,
      timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
    };
    localStorage.setItem("vai_news_cache", JSON.stringify(cachedData));

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    };
    
    const { result } = renderHook(() => useNewsFeed(), { wrapper });

    // Should load from cache immediately
    expect(result.current.loading).toBe(false);
    expect(result.current.news).toEqual(mockArticles);
    
    // Should not call the API
    expect(mockGetNews).not.toHaveBeenCalled();
  });

  it("should ignore expired cache", async () => {
    const cachedData = {
      data: [{ title: "Old news", url: "https://old.com", source: "Old" }],
      timestamp: Date.now() - 35 * 60 * 1000, // 35 minutes ago (expired)
    };
    localStorage.setItem("vai_news_cache", JSON.stringify(cachedData));

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    };
    
    const { result } = renderHook(() => useNewsFeed(), { wrapper });

    // Should start loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should fetch fresh data
    expect(mockGetNews).toHaveBeenCalled();
    expect(result.current.news).toEqual(mockArticles);
  });

  it("should handle refresh correctly", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    };
    
    const { result } = renderHook(() => useNewsFeed(), { wrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetNews).toHaveBeenCalledTimes(1);

    // Refresh
    await act(async () => {
      await result.current.refresh();
    });

    // Should call API again
    expect(mockGetNews).toHaveBeenCalledTimes(2);
    expect(result.current.news).toEqual(mockArticles);
  });

  it("should handle API errors gracefully", async () => {
    mockGetNews.mockRejectedValueOnce(new Error("API Error"));
    
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    };
    
    const { result } = renderHook(() => useNewsFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should handle error without crashing
    expect(result.current.news).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("should cache results in localStorage after successful fetch", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    };
    
    const { result } = renderHook(() => useNewsFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check localStorage
    const cached = localStorage.getItem("vai_news_cache");
    expect(cached).toBeTruthy();
    
    const parsedCache = JSON.parse(cached!);
    expect(parsedCache.data).toEqual(mockArticles);
    expect(parsedCache.timestamp).toBeGreaterThan(Date.now() - 1000); // Within last second
  });

  it("should pass userId when member is available", async () => {
    const mockMemberId = "member123";
    mockUseCurrentMember.mockReturnValue({ 
      member: { _id: mockMemberId } 
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    };
    
    const { result } = renderHook(() => useNewsFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetNews).toHaveBeenCalledWith({ userId: mockMemberId });
  });

  it("should handle localStorage errors gracefully", async () => {
    // Mock localStorage.setItem to throw
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = vi.fn(() => {
      throw new Error("localStorage error");
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    };
    
    const { result } = renderHook(() => useNewsFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should still work despite localStorage error
    expect(result.current.news).toEqual(mockArticles);
    
    // Restore localStorage
    localStorageMock.setItem = originalSetItem;
  });
});