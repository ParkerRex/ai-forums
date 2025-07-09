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
import { MemberCard } from "../member-card";
import { Id } from "@/convex/_generated/dataModel";

// Mock the convex hooks with a simple implementation
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

// Mock the UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardFooter: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 className={className}>{children}</h3>
  ),
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: any) => <img src={src} alt={alt} />,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: any) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: any) => (
    <div role="menu">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div role="menuitem" onClick={onClick}>
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

describe("MemberCard", () => {
  const mockMember = {
    _id: "member123" as Id<"members">,
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    avatarUrl: "https://example.com/avatar.jpg",
    role: "user",
    tier: "early_bird",
    billingInterval: "monthly" as const,
    status: "active" as const,
    joinedDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    amountCents: 5000,
    bio: "Software developer passionate about AI",
  };

  const mockOnSelect = vi.fn();
  const mockOnViewDetails = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders member information correctly", () => {
      render(<MemberCard member={mockMember} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
      expect(screen.getByText("Software developer passionate about AI")).toBeInTheDocument();
      expect(screen.getByText("Early Bird")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      // There are multiple instances of $50/mo in the card
      const priceElements = screen.getAllByText("$50/mo");
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it("renders without optional fields", () => {
      const minimalMember = {
        _id: "member123" as Id<"members">,
        email: "test@example.com",
        status: "active" as const,
      };

      render(<MemberCard member={minimalMember} />);

      expect(screen.getByText("test@example.com")).toBeInTheDocument();
      expect(screen.getByText("test")).toBeInTheDocument(); // Default name from email
    });

    it("shows admin badge when role is admin", () => {
      render(<MemberCard member={{ ...mockMember, role: "admin" }} />);

      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("handles checkbox selection", () => {
      render(
        <MemberCard
          member={mockMember}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      expect(mockOnSelect).toHaveBeenCalledWith(mockMember._id);
    });

    it("handles view details click", () => {
      render(
        <MemberCard
          member={mockMember}
          onViewDetails={mockOnViewDetails}
        />
      );

      const viewButton = screen.getByText("View Details");
      fireEvent.click(viewButton);

      expect(mockOnViewDetails).toHaveBeenCalledWith(mockMember._id);
    });
  });

  describe("List Variant", () => {
    it("renders simplified list view", () => {
      render(<MemberCard member={mockMember} variant="list" />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
      expect(screen.getByText("Early Bird")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.queryByText("Software developer passionate about AI")).not.toBeInTheDocument();
    });
  });

  describe("Avatar Display", () => {
    it("shows avatar image when available", () => {
      render(<MemberCard member={mockMember} />);

      const avatar = screen.getByAltText("John Doe");
      expect(avatar).toHaveAttribute("src", mockMember.avatarUrl);
    });

    it("shows initials when avatar is not available", () => {
      render(
        <MemberCard member={{ ...mockMember, avatarUrl: undefined }} />
      );

      expect(screen.getByText("JD")).toBeInTheDocument();
    });
  });
});