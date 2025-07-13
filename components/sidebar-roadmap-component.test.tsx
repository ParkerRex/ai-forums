// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";

// Use `vi.hoisted` so the spy is created before Vitest hoists and executes the
// mock factory, preventing TDZ issues.
const mockUseGitHubIssues = vi.hoisted(() => vi.fn());

vi.mock("@/lib/github", () => ({
  useGitHubIssues: mockUseGitHubIssues,
}));

import { SidebarRoadmapComponent } from "./sidebar-roadmap-component";

describe("SidebarRoadmapComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders the component with title "Roadmap"', () => {
    mockUseGitHubIssues.mockReturnValue({
      issues: [],
      isLoading: false,
      error: null,
    });

    render(<SidebarRoadmapComponent />);

    expect(screen.getByText("Roadmap")).toBeInTheDocument();
  });

  it("renders loading state correctly", () => {
    mockUseGitHubIssues.mockReturnValue({
      issues: [],
      isLoading: true,
      error: null,
    });

    render(<SidebarRoadmapComponent />);

    // Check for the loading spinner by its class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseGitHubIssues.mockReturnValue({
      issues: [],
      isLoading: false,
      error: new Error("Test error"),
    });

    render(<SidebarRoadmapComponent />);

    expect(
      screen.getByText("Unable to load roadmap"),
    ).toBeInTheDocument();
  });

  it("renders issues when loaded", () => {
    const mockIssues = [
      {
        id: 1,
        number: 1,
        title: "Test Issue 1",
        html_url: "https://github.com/test/1",
      },
      {
        id: 2,
        number: 2,
        title: "Test Issue 2",
        html_url: "https://github.com/test/2",
      },
    ];

    mockUseGitHubIssues.mockReturnValue({
      issues: mockIssues,
      isLoading: false,
      error: null,
    });

    render(<SidebarRoadmapComponent />);

    expect(screen.getByText("Test Issue 1")).toBeInTheDocument();
    expect(screen.getByText("Test Issue 2")).toBeInTheDocument();
  });

  it("shows Submit feedback link", () => {
    mockUseGitHubIssues.mockReturnValue({
      issues: [],
      isLoading: false,
      error: null,
    });

    render(<SidebarRoadmapComponent />);

    const feedbackLink = screen.getByText("Submit feedback");
    expect(feedbackLink).toBeInTheDocument();
    expect(feedbackLink).toHaveAttribute("href", "https://github.com/joinvai/vai-vex/issues");
    expect(feedbackLink).toHaveAttribute("target", "_blank");
  });

  it("shows first 3 issues when collapsed", () => {
    const mockIssues = [
      { id: 1, number: 1, title: "Issue 1", html_url: "https://github.com/test/1" },
      { id: 2, number: 2, title: "Issue 2", html_url: "https://github.com/test/2" },
      { id: 3, number: 3, title: "Issue 3", html_url: "https://github.com/test/3" },
      { id: 4, number: 4, title: "Issue 4", html_url: "https://github.com/test/4" },
      { id: 5, number: 5, title: "Issue 5", html_url: "https://github.com/test/5" },
    ];

    mockUseGitHubIssues.mockReturnValue({
      issues: mockIssues,
      isLoading: false,
      error: null,
    });

    render(<SidebarRoadmapComponent />);

    expect(screen.getByText("Issue 1")).toBeInTheDocument();
    expect(screen.getByText("Issue 2")).toBeInTheDocument();
    expect(screen.getByText("Issue 3")).toBeInTheDocument();
    expect(screen.queryByText("Issue 4")).not.toBeInTheDocument();
    expect(screen.queryByText("Issue 5")).not.toBeInTheDocument();
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("expands to show all issues when chevron is clicked", () => {
    const mockIssues = [
      { id: 1, number: 1, title: "Issue 1", html_url: "https://github.com/test/1" },
      { id: 2, number: 2, title: "Issue 2", html_url: "https://github.com/test/2" },
      { id: 3, number: 3, title: "Issue 3", html_url: "https://github.com/test/3" },
      { id: 4, number: 4, title: "Issue 4", html_url: "https://github.com/test/4" },
      { id: 5, number: 5, title: "Issue 5", html_url: "https://github.com/test/5" },
    ];

    mockUseGitHubIssues.mockReturnValue({
      issues: mockIssues,
      isLoading: false,
      error: null,
    });

    render(<SidebarRoadmapComponent />);

    // Find and click the chevron button
    const chevronButton = screen.getByRole("button", { name: "" });
    fireEvent.click(chevronButton);

    // All issues should now be visible
    expect(screen.getByText("Issue 1")).toBeInTheDocument();
    expect(screen.getByText("Issue 2")).toBeInTheDocument();
    expect(screen.getByText("Issue 3")).toBeInTheDocument();
    expect(screen.getByText("Issue 4")).toBeInTheDocument();
    expect(screen.getByText("Issue 5")).toBeInTheDocument();
    expect(screen.queryByText("+2 more")).not.toBeInTheDocument();
  });

  it("caches issues in localStorage", () => {
    const mockIssues = [
      { id: 1, number: 1, title: "Issue 1", html_url: "https://github.com/test/1" },
    ];

    mockUseGitHubIssues.mockReturnValue({
      issues: mockIssues,
      isLoading: false,
      error: null,
    });

    render(<SidebarRoadmapComponent />);

    // Check that issues were cached
    const cached = localStorage.getItem("vai_roadmap_cache");
    expect(cached).toBeTruthy();
    const { data } = JSON.parse(cached!);
    expect(data).toEqual(mockIssues);
  });

  it("loads cached issues on mount", () => {
    const cachedIssues = [
      { id: 1, number: 1, title: "Cached Issue", html_url: "https://github.com/test/1" },
    ];

    // Set up cache
    localStorage.setItem("vai_roadmap_cache", JSON.stringify({
      data: cachedIssues,
      timestamp: Date.now(),
    }));

    mockUseGitHubIssues.mockReturnValue({
      issues: [],
      isLoading: false,
      error: null,
    });

    const { rerender } = render(<SidebarRoadmapComponent />);

    // Should show cached issue
    expect(screen.getByText("Cached Issue")).toBeInTheDocument();

    // When new issues come in, they should replace cached ones
    const newIssues = [
      { id: 2, number: 2, title: "New Issue", html_url: "https://github.com/test/2" },
    ];
    
    mockUseGitHubIssues.mockReturnValue({
      issues: newIssues,
      isLoading: false,
      error: null,
    });

    rerender(<SidebarRoadmapComponent />);
    
    expect(screen.getByText("New Issue")).toBeInTheDocument();
    expect(screen.queryByText("Cached Issue")).not.toBeInTheDocument();
  });
});
