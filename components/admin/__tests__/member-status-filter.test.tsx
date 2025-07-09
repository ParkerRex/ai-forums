// @vitest-environment jsdom
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { 
  MemberStatusFilter, 
  StatusFilterBadges,
  type StatusFilter,
  type TierFilter,
} from "../member-status-filter";

// Mock UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className, onClick, variant }: any) => (
    <span className={className} onClick={onClick} data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, className, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      data-testid="select"
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <>{placeholder}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => (
    <option value={value}>{children}</option>
  ),
}));

describe("MemberStatusFilter", () => {
  const mockOnSearchChange = vi.fn();
  const mockOnStatusFilterChange = vi.fn();
  const mockOnTierFilterChange = vi.fn();

  const defaultProps = {
    search: "",
    onSearchChange: mockOnSearchChange,
    statusFilter: "all" as StatusFilter,
    onStatusFilterChange: mockOnStatusFilterChange,
    tierFilter: "all" as TierFilter,
    onTierFilterChange: mockOnTierFilterChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Search Input", () => {
    it("renders search input by default", () => {
      render(<MemberStatusFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search by name or email...");
      expect(searchInput).toBeInTheDocument();
    });

    it("handles search input changes", () => {
      render(<MemberStatusFilter {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search by name or email...");
      fireEvent.change(searchInput, { target: { value: "john" } });

      expect(mockOnSearchChange).toHaveBeenCalledWith("john");
    });

    it("hides search input when showSearch is false", () => {
      render(<MemberStatusFilter {...defaultProps} showSearch={false} />);

      const searchInput = screen.queryByPlaceholderText("Search by name or email...");
      expect(searchInput).not.toBeInTheDocument();
    });

    it("displays search value", () => {
      render(<MemberStatusFilter {...defaultProps} search="test search" />);

      const searchInput = screen.getByPlaceholderText("Search by name or email...");
      expect(searchInput).toHaveValue("test search");
    });
  });

  describe("Filters", () => {
    it("renders filter dropdowns", () => {
      render(<MemberStatusFilter {...defaultProps} />);

      const selects = screen.getAllByTestId("select");
      expect(selects).toHaveLength(2); // Status and Tier
    });

    it("handles status filter changes", () => {
      render(<MemberStatusFilter {...defaultProps} />);

      const statusSelect = screen.getAllByTestId("select")[0];
      fireEvent.change(statusSelect, { target: { value: "active" } });

      expect(mockOnStatusFilterChange).toHaveBeenCalledWith("active");
    });

    it("handles tier filter changes", () => {
      render(<MemberStatusFilter {...defaultProps} />);

      const tierSelect = screen.getAllByTestId("select")[1];
      fireEvent.change(tierSelect, { target: { value: "founding_member" } });

      expect(mockOnTierFilterChange).toHaveBeenCalledWith("founding_member");
    });

    it("hides tier filter when showTierFilter is false", () => {
      render(<MemberStatusFilter {...defaultProps} showTierFilter={false} />);

      const selects = screen.getAllByTestId("select");
      expect(selects).toHaveLength(1); // Only status filter
    });
  });

  describe("Active Filters Display", () => {
    it("shows no active filters when all are default", () => {
      render(<MemberStatusFilter {...defaultProps} />);

      expect(screen.queryByText("Active filters:")).not.toBeInTheDocument();
      expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
    });

    it("shows active status filter", () => {
      render(
        <MemberStatusFilter {...defaultProps} statusFilter="active" />
      );

      expect(screen.getByText("Active filters:")).toBeInTheDocument();
      expect(screen.getByText("Status: Active")).toBeInTheDocument();
    });

    it("shows active tier filter", () => {
      render(
        <MemberStatusFilter {...defaultProps} tierFilter="founding_member" />
      );

      expect(screen.getByText("Active filters:")).toBeInTheDocument();
      expect(screen.getByText("Tier: Founding")).toBeInTheDocument();
    });

    it("shows active search filter", () => {
      render(
        <MemberStatusFilter {...defaultProps} search="john" />
      );

      expect(screen.getByText("Active filters:")).toBeInTheDocument();
      expect(screen.getByText("Search: john")).toBeInTheDocument();
    });

    it("shows multiple active filters", () => {
      render(
        <MemberStatusFilter
          {...defaultProps}
          search="john"
          statusFilter="active"
          tierFilter="early_bird"
        />
      );

      expect(screen.getByText("Active filters:")).toBeInTheDocument();
      expect(screen.getByText("Status: Active")).toBeInTheDocument();
      expect(screen.getByText("Tier: Early Bird")).toBeInTheDocument();
      expect(screen.getByText("Search: john")).toBeInTheDocument();
    });
  });

  describe("Filter Removal", () => {
    it("removes individual filters by clicking badges", () => {
      render(
        <MemberStatusFilter
          {...defaultProps}
          search="john"
          statusFilter="active"
          tierFilter="early_bird"
        />
      );

      // Remove status filter
      const statusBadge = screen.getByText("Status: Active");
      fireEvent.click(statusBadge);
      expect(mockOnStatusFilterChange).toHaveBeenCalledWith("all");

      // Remove tier filter
      const tierBadge = screen.getByText("Tier: Early Bird");
      fireEvent.click(tierBadge);
      expect(mockOnTierFilterChange).toHaveBeenCalledWith("all");

      // Remove search filter
      const searchBadge = screen.getByText("Search: john");
      fireEvent.click(searchBadge);
      expect(mockOnSearchChange).toHaveBeenCalledWith("");
    });

    it("clears all filters with clear all button", () => {
      render(
        <MemberStatusFilter
          {...defaultProps}
          search="john"
          statusFilter="active"
          tierFilter="early_bird"
        />
      );

      const clearAllButton = screen.getByText("Clear all");
      fireEvent.click(clearAllButton);

      expect(mockOnSearchChange).toHaveBeenCalledWith("");
      expect(mockOnStatusFilterChange).toHaveBeenCalledWith("all");
      expect(mockOnTierFilterChange).toHaveBeenCalledWith("all");
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <MemberStatusFilter {...defaultProps} className="custom-class" />
      );

      const filterContainer = container.firstChild;
      expect(filterContainer).toHaveClass("custom-class");
    });
  });
});

describe("StatusFilterBadges", () => {
  const mockOnStatusFilterChange = vi.fn();

  const defaultProps = {
    statusFilter: "all" as StatusFilter,
    onStatusFilterChange: mockOnStatusFilterChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all status badges", () => {
    render(<StatusFilterBadges {...defaultProps} />);

    expect(screen.getByText("All Status")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Churned")).toBeInTheDocument();
  });

  it("highlights active filter", () => {
    render(<StatusFilterBadges {...defaultProps} statusFilter="active" />);

    const activeBadge = screen.getByText("Active");
    const allBadge = screen.getByText("All Status");

    // Active badge should have default variant styling
    expect(activeBadge).toHaveAttribute("data-variant", "default");
    // Inactive badges should have outline variant styling
    expect(allBadge).toHaveAttribute("data-variant", "outline");
  });

  it("handles filter changes on click", () => {
    render(<StatusFilterBadges {...defaultProps} />);

    const activeBadge = screen.getByText("Active");
    fireEvent.click(activeBadge);

    expect(mockOnStatusFilterChange).toHaveBeenCalledWith("active");
  });

  it("displays counts when provided", () => {
    const counts = {
      active: 45,
      cancelled: 5,
      churned: 10,
      total: 60,
    };

    render(
      <StatusFilterBadges {...defaultProps} counts={counts} />
    );

    // Check for the text and count separately since they may be in different elements
    expect(screen.getByText("All Status")).toBeInTheDocument();
    expect(screen.getByText("(60)")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("(45)")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("(5)")).toBeInTheDocument();
    expect(screen.getByText("Churned")).toBeInTheDocument();
    expect(screen.getByText("(10)")).toBeInTheDocument();
  });

  it("handles all filter types", () => {
    const filters: StatusFilter[] = ["all", "active", "cancelled", "churned"];

    filters.forEach((filter) => {
      const { unmount } = render(<StatusFilterBadges {...defaultProps} />);

      const badge = screen.getByText(
        filter === "all" ? "All Status" : filter.charAt(0).toUpperCase() + filter.slice(1)
      );
      fireEvent.click(badge);

      expect(mockOnStatusFilterChange).toHaveBeenCalledWith(filter);
      mockOnStatusFilterChange.mockClear();
      unmount();
    });
  });
});