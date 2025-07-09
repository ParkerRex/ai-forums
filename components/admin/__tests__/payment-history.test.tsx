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
  PaymentHistory, 
  PaymentHistoryCompact,
  type PaymentRecord,
} from "../payment-history";
import { Id } from "@/convex/_generated/dataModel";

type MockComponentProps = {
  children?: React.ReactNode;
  className?: string;
  [key: string]: unknown;
};

// Mock the PaymentDetailsModal component
vi.mock("../payment-details-modal", () => ({
  PaymentDetailsModal: ({ paymentId, onClose }: { paymentId: string; onClose: () => void }) => (
    <div data-testid="payment-details-modal" data-payment-id={paymentId}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className, variant }: MockComponentProps & { variant?: string }) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: MockComponentProps) => <table>{children}</table>,
  TableHeader: ({ children }: MockComponentProps) => <thead>{children}</thead>,
  TableBody: ({ children }: MockComponentProps) => <tbody>{children}</tbody>,
  TableRow: ({ children, onClick, className }: MockComponentProps & { onClick?: () => void }) => (
    <tr onClick={onClick} className={className}>
      {children}
    </tr>
  ),
  TableHead: ({ children, className }: MockComponentProps) => (
    <th className={className}>{children}</th>
  ),
  TableCell: ({ children, className }: MockComponentProps) => (
    <td className={className}>{children}</td>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: MockComponentProps) => <div>{children}</div>,
  CardHeader: ({ children, className }: MockComponentProps) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children }: MockComponentProps) => <div>{children}</div>,
  CardTitle: ({ children, className }: MockComponentProps) => (
    <h3 className={className}>{children}</h3>
  ),
}));

describe("PaymentHistory", () => {
  const mockPayments: PaymentRecord[] = [
    {
      _id: "payment1" as Id<"payments">,
      memberId: "member1" as Id<"members">,
      subscriptionId: "sub1" as Id<"subscriptions">,
      stripePaymentIntentId: "pi_123",
      stripeInvoiceId: "inv_123",
      amount: 5000, // $50.00
      currency: "usd",
      status: "succeeded",
      description: "Monthly subscription",
      paymentMethod: {
        type: "card",
        brand: "visa",
        last4: "4242",
      },
      transactionFee: 175,
      netAmount: 4825,
      createdAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    },
    {
      _id: "payment2" as Id<"payments">,
      memberId: "member1" as Id<"members">,
      subscriptionId: "sub1" as Id<"subscriptions">,
      stripePaymentIntentId: "pi_456",
      stripeInvoiceId: "inv_456",
      amount: 5000,
      currency: "usd",
      status: "refunded",
      description: "Monthly subscription - Refunded",
      paymentMethod: {
        type: "card",
        brand: "mastercard",
        last4: "5555",
      },
      refundedAmount: 5000,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7, // 7 days ago
    },
    {
      _id: "payment3" as Id<"payments">,
      memberId: "member1" as Id<"members">,
      subscriptionId: "sub1" as Id<"subscriptions">,
      stripePaymentIntentId: "pi_789",
      amount: 2500,
      currency: "usd",
      status: "failed",
      description: "Monthly subscription",
      paymentMethod: {
        type: "card",
        last4: "1234",
      },
      failureReason: "Card declined",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14, // 14 days ago
    },
  ];

  const mockOnPaymentClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty State", () => {
    it("shows empty state when no payments", () => {
      render(<PaymentHistory payments={[]} />);

      expect(screen.getByText("No payment history")).toBeInTheDocument();
    });
  });

  describe("Payment Table", () => {
    it("renders all payments in table", () => {
      render(<PaymentHistory payments={mockPayments} />);

      // Check for text that appears in multiple elements
      const monthlySubscriptions = screen.getAllByText("Monthly subscription");
      expect(monthlySubscriptions.length).toBeGreaterThan(0);
      
      expect(screen.getByText("Monthly subscription - Refunded")).toBeInTheDocument();
      
      // Check for payment method parts separately
      expect(screen.getByText(/visa/)).toBeInTheDocument();
      expect(screen.getByText(/4242/)).toBeInTheDocument();
      expect(screen.getByText(/mastercard/)).toBeInTheDocument();
      expect(screen.getByText(/5555/)).toBeInTheDocument();
    });

    it("displays payment amounts correctly", () => {
      render(<PaymentHistory payments={mockPayments} />);

      expect(screen.getByText("$50.00")).toBeInTheDocument();
      expect(screen.getByText("-$50.00")).toBeInTheDocument(); // Refunded
      expect(screen.getByText("$25.00")).toBeInTheDocument();
    });

    it("shows correct status badges", () => {
      render(<PaymentHistory payments={mockPayments} />);

      // Use getAllByText since there might be multiple instances
      const paidBadges = screen.getAllByText("Paid");
      const refundedBadges = screen.getAllByText("Refunded");
      const failedBadges = screen.getAllByText("Failed");
      
      expect(paidBadges.length).toBeGreaterThan(0);
      expect(refundedBadges.length).toBeGreaterThan(0);
      expect(failedBadges.length).toBeGreaterThan(0);
    });

    it("displays failure reason for failed payments", () => {
      render(<PaymentHistory payments={mockPayments} />);

      const failedPayment = mockPayments.find(p => p.status === "failed");
      if (failedPayment?.failureReason) {
        expect(screen.getByText(failedPayment.failureReason)).toBeInTheDocument();
      }
    });

    it("handles payment click with custom handler", () => {
      render(
        <PaymentHistory 
          payments={mockPayments} 
          onPaymentClick={mockOnPaymentClick}
        />
      );

      const firstRow = screen.getAllByRole("row")[1]; // Skip header row
      fireEvent.click(firstRow);

      expect(mockOnPaymentClick).toHaveBeenCalledWith(mockPayments[0]._id);
    });

    it("opens modal when clicking payment without custom handler", async () => {
      render(<PaymentHistory payments={mockPayments} />);

      const firstRow = screen.getAllByRole("row")[1];
      fireEvent.click(firstRow);

      await waitFor(() => {
        expect(screen.getByTestId("payment-details-modal")).toBeInTheDocument();
        expect(screen.getByTestId("payment-details-modal")).toHaveAttribute(
          "data-payment-id",
          mockPayments[0]._id
        );
      });
    });

    it("handles view button click", () => {
      render(
        <PaymentHistory 
          payments={mockPayments} 
          onPaymentClick={mockOnPaymentClick}
        />
      );

      const viewButtons = screen.getAllByRole("button");
      fireEvent.click(viewButtons[0]);

      expect(mockOnPaymentClick).toHaveBeenCalledWith(mockPayments[0]._id);
    });
  });

  describe("Stats Display", () => {
    it("shows stats when showStats is true", () => {
      render(<PaymentHistory payments={mockPayments} showStats={true} />);

      // Total Revenue
      expect(screen.getByText("Total Revenue")).toBeInTheDocument();
      // There are multiple $50.00 in the page, use getAllByText
      const fiftyDollarAmounts = screen.getAllByText("$50.00");
      expect(fiftyDollarAmounts.length).toBeGreaterThan(0);

      // Total Refunded
      expect(screen.getByText("Total Refunded")).toBeInTheDocument();
      // There might be multiple -$50.00 values
      const refundedAmounts = screen.getAllByText("-$50.00");
      expect(refundedAmounts.length).toBeGreaterThan(0);

      // Success Rate
      expect(screen.getByText("Success Rate")).toBeInTheDocument();
      expect(screen.getByText("33.3%")).toBeInTheDocument();

      // Failed Payments
      expect(screen.getByText("Failed Payments")).toBeInTheDocument();
      // The "1" might appear in multiple places
      const ones = screen.getAllByText("1");
      expect(ones.length).toBeGreaterThan(0);
    });

    it("does not show stats by default", () => {
      render(<PaymentHistory payments={mockPayments} />);

      expect(screen.queryByText("Total Revenue")).not.toBeInTheDocument();
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <PaymentHistory payments={mockPayments} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("Partial Refunds", () => {
    it("displays partial refund information", () => {
      const paymentWithPartialRefund: PaymentRecord = {
        ...mockPayments[0],
        status: "partially_refunded",
        refundedAmount: 2500,
      };

      render(<PaymentHistory payments={[paymentWithPartialRefund]} />);

      expect(screen.getByText("Partial Refund")).toBeInTheDocument();
      expect(screen.getByText("Refunded: $25.00")).toBeInTheDocument();
    });
  });
});

describe("PaymentHistoryCompact", () => {
  const mockPayments: PaymentRecord[] = [
    {
      _id: "payment1" as Id<"payments">,
      memberId: "member1" as Id<"members">,
      stripePaymentIntentId: "pi_123",
      amount: 5000,
      currency: "usd",
      status: "succeeded",
      description: "Monthly subscription",
      paymentMethod: {
        type: "card",
        brand: "visa",
        last4: "4242",
      },
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
    },
    {
      _id: "payment2" as Id<"payments">,
      memberId: "member1" as Id<"members">,
      stripePaymentIntentId: "pi_456",
      amount: 3900,
      currency: "usd",
      status: "succeeded",
      description: "Monthly subscription",
      paymentMethod: {
        type: "card",
        brand: "amex",
        last4: "0005",
      },
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    },
  ];

  const mockOnViewAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state", () => {
    render(<PaymentHistoryCompact payments={[]} />);

    expect(screen.getByText("No payments yet")).toBeInTheDocument();
  });

  it("renders limited payments by default", () => {
    const manyPayments = Array.from({ length: 10 }, (_, i) => ({
      ...mockPayments[0],
      _id: `payment${i}` as Id<"payments">,
    }));

    render(<PaymentHistoryCompact payments={manyPayments} />);

    // Should only show 5 by default
    const paymentItems = screen.getAllByText(/\$50\.00/);
    expect(paymentItems).toHaveLength(5);
  });

  it("respects custom limit", () => {
    const manyPayments = Array.from({ length: 10 }, (_, i) => ({
      ...mockPayments[0],
      _id: `payment${i}` as Id<"payments">,
    }));

    render(<PaymentHistoryCompact payments={manyPayments} limit={3} />);

    const paymentItems = screen.getAllByText(/\$50\.00/);
    expect(paymentItems).toHaveLength(3);
  });

  it("shows view all button when there are more payments", () => {
    const manyPayments = Array.from({ length: 10 }, (_, i) => ({
      ...mockPayments[0],
      _id: `payment${i}` as Id<"payments">,
    }));

    render(
      <PaymentHistoryCompact 
        payments={manyPayments} 
        onViewAll={mockOnViewAll}
      />
    );

    const viewAllButton = screen.getByText("View all 10 payments");
    expect(viewAllButton).toBeInTheDocument();

    fireEvent.click(viewAllButton);
    expect(mockOnViewAll).toHaveBeenCalled();
  });

  it("does not show view all button when all payments are shown", () => {
    render(
      <PaymentHistoryCompact 
        payments={mockPayments} 
        onViewAll={mockOnViewAll}
      />
    );

    expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
  });

  it("displays payment information correctly", () => {
    render(<PaymentHistoryCompact payments={mockPayments} />);

    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("$39.00")).toBeInTheDocument();
    // Check for payment method parts separately
    expect(screen.getByText(/visa/)).toBeInTheDocument();
    expect(screen.getByText(/4242/)).toBeInTheDocument();
    expect(screen.getByText(/amex/)).toBeInTheDocument();
    expect(screen.getByText(/0005/)).toBeInTheDocument();
  });

  it("shows payment method type when brand is not available", () => {
    const paymentWithoutBrand: PaymentRecord = {
      ...mockPayments[0],
      paymentMethod: {
        type: "bank_transfer",
        last4: "9999",
      },
    };

    render(<PaymentHistoryCompact payments={[paymentWithoutBrand]} />);

    // Check for the payment method text which may be split across elements
    expect(screen.getByText(/bank_transfer/)).toBeInTheDocument();
    expect(screen.getByText(/9999/)).toBeInTheDocument();
  });
});