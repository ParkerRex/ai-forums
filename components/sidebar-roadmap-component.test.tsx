// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";

// Use `vi.hoisted` so the spy is created before Vitest hoists and executes the
// mock factory, preventing TDZ issues.
const mockUseGitHubIssues = vi.hoisted(() => vi.fn());

vi.mock("@/lib/github", () => ({
  useGitHubIssues: mockUseGitHubIssues,
}));

import { SidebarRoadmapComponent } from "./sidebar-roadmap-component";

// Mock the BugReportModal component
vi.mock("@/components/bug-report-modal", () => ({
  BugReportModal: ({ isOpen }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div data-testid="bug-report-modal">Bug Report Modal</div> : null,
}));

// Mock the ExpandIcon component
vi.mock("@/components/ui/expand", () => ({
  ExpandIcon: React.forwardRef(function MockExpandIcon() {
    return <svg data-testid="expand-icon" />;
  }),
}));

describe("SidebarRoadmapComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
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

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders error state with bug report button", () => {
    mockUseGitHubIssues.mockReturnValue({
      issues: [],
      isLoading: false,
      error: new Error("Test error"),
    });

    render(<SidebarRoadmapComponent />);

    expect(
      screen.getByText("Failed to load roadmap items."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /report bug/i }),
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

  it("opens bug report modal when report bug button is clicked", () => {
    mockUseGitHubIssues.mockReturnValue({
      issues: [],
      isLoading: false,
      error: null,
    });

    render(<SidebarRoadmapComponent />);

    const reportBugButton = screen.getByRole("button", { name: /report bug/i });
    fireEvent.click(reportBugButton);

    expect(screen.getByTestId("bug-report-modal")).toBeInTheDocument();
  });

  it("opens roadmap dialog when expand icon is clicked", async () => {
    const mockIssues = [
      {
        id: 1,
        number: 1,
        title: "Test Issue 1",
        html_url: "https://github.com/test/1",
      },
    ];

    mockUseGitHubIssues.mockReturnValue({
      issues: mockIssues,
      isLoading: false,
      error: null,
    });

    // Mock fetch for loading more issues
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<SidebarRoadmapComponent />);

    const expandButton = screen.getByTestId("expand-icon").closest("button");
    fireEvent.click(expandButton!);

    await waitFor(() => {
      expect(screen.getByText("Project Roadmap")).toBeInTheDocument();
      expect(
        screen.getByText("All open issues and upcoming features for VAI VEX"),
      ).toBeInTheDocument();
    });
  });

  it("displays expand icon in top right corner", () => {
    mockUseGitHubIssues.mockReturnValue({
      issues: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SidebarRoadmapComponent />);

    // Find the expand icon by data-testid
    const expandIcon = screen.getByTestId("expand-icon");
    expect(expandIcon).toBeInTheDocument();
    
    // The expand icon is wrapped in a button, so find the button parent
    const expandButton = expandIcon.closest("button");
    expect(expandButton).toBeInTheDocument();
    expect(expandButton).toHaveClass("h-5", "w-5", "hover:bg-accent/50");
  });

  it("displays bug report button at the bottom with ghost style", () => {
    mockUseGitHubIssues.mockReturnValue({
      issues: [],
      isLoading: false,
      error: null,
    });

    render(<SidebarRoadmapComponent />);

    const reportBugButton = screen.getByRole("button", { name: /report bug/i });
    expect(reportBugButton).toBeInTheDocument();

    // Check that it's a ghost button and full width
    expect(reportBugButton).toHaveClass("w-full"); // Full width
  });
});
