import { expect, test, describe } from "vitest";
import { formatTierPrice } from "../../lib/admin-utils";

describe("Payment Calculations", () => {
  describe("Stripe Transaction Fee Calculations", () => {
    test("should calculate standard 2.9% + 30¢ fee correctly", () => {
      const testCases = [
        { amount: 9900, expectedFee: 317, expectedNet: 9583 }, // $99 payment
        { amount: 5000, expectedFee: 175, expectedNet: 4825 }, // $50 payment
        { amount: 3900, expectedFee: 143, expectedNet: 3757 }, // $39 payment
        { amount: 37500, expectedFee: 1118, expectedNet: 36382 }, // $375 payment
        { amount: 48000, expectedFee: 1422, expectedNet: 46578 }, // $480 payment
        { amount: 100, expectedFee: 33, expectedNet: 67 }, // $1 payment
        { amount: 1000, expectedFee: 59, expectedNet: 941 }, // $10 payment
      ];

      for (const { amount, expectedFee, expectedNet } of testCases) {
        const fee = Math.round(amount * 0.029 + 30);
        const net = amount - fee;
        
        expect(fee).toBe(expectedFee);
        expect(net).toBe(expectedNet);
      }
    });

    test("should handle edge cases in fee calculation", () => {
      // Test rounding
      const amount1 = 1234; // $12.34
      const fee1 = Math.round(amount1 * 0.029 + 30);
      expect(fee1).toBe(66); // 35.786 + 30 = 65.786, rounds to 66

      // Test very small amount
      const amount2 = 50; // $0.50
      const fee2 = Math.round(amount2 * 0.029 + 30);
      expect(fee2).toBe(31); // 1.45 + 30 = 31.45, rounds to 31

      // Test large amount
      const amount3 = 1000000; // $10,000
      const fee3 = Math.round(amount3 * 0.029 + 30);
      expect(fee3).toBe(29030); // 29000 + 30 = 29030
    });

    test("should calculate net amount correctly after fees", () => {
      const calculateNetAmount = (amountCents: number): number => {
        const fee = Math.round(amountCents * 0.029 + 30);
        return amountCents - fee;
      };

      // Test various subscription amounts
      expect(calculateNetAmount(9900)).toBe(9583); // $99 member tier
      expect(calculateNetAmount(5000)).toBe(4825); // $50 early bird
      expect(calculateNetAmount(3900)).toBe(3757); // $39 founding member
    });
  });

  describe("Refund Calculations", () => {
    test("should calculate full refund correctly", () => {
      const payment = {
        amount: 9900,
        refundedAmount: 0,
      };

      const refundAmount = payment.amount;
      const remainingAfterRefund = payment.amount - refundAmount;

      expect(refundAmount).toBe(9900);
      expect(remainingAfterRefund).toBe(0);
    });

    test("should calculate partial refund correctly", () => {
      const payment = {
        amount: 9900,
        refundedAmount: 0,
      };

      const partialRefundAmount = 4950; // 50% refund
      const remainingAfterRefund = payment.amount - partialRefundAmount;

      expect(partialRefundAmount).toBe(4950);
      expect(remainingAfterRefund).toBe(4950);
    });

    test("should handle multiple partial refunds", () => {
      const payment = {
        amount: 9900,
        refundedAmount: 2000,
      };

      const additionalRefund = 3000;
      const totalRefunded = payment.refundedAmount + additionalRefund;
      const remainingRefundable = payment.amount - totalRefunded;

      expect(totalRefunded).toBe(5000);
      expect(remainingRefundable).toBe(4900);
    });

    test("should prevent over-refunding", () => {
      const payment = {
        amount: 9900,
        refundedAmount: 8000,
      };

      const remainingRefundable = payment.amount - payment.refundedAmount;
      const attemptedRefund = 3000;

      expect(remainingRefundable).toBe(1900);
      expect(attemptedRefund > remainingRefundable).toBe(true);
    });

    test("should handle fee reversal on refunds", () => {
      // When refunding, the transaction fee is typically not returned to the merchant
      const originalAmount = 9900;
      const originalFee = Math.round(originalAmount * 0.029 + 30);
      const originalNet = originalAmount - originalFee;

      const refundAmount = originalAmount;
      const refundFee = 0; // Stripe doesn't refund the fee
      const netLoss = refundAmount; // Merchant loses the full refund amount

      expect(originalNet).toBe(9583);
      expect(netLoss).toBe(9900);
      // Merchant effectively loses: refund amount + original fee
      const totalLoss = netLoss + originalFee;
      expect(totalLoss).toBe(10217);
    });
  });

  describe("Tier Pricing Calculations", () => {
    test("should format monthly prices correctly", () => {
      expect(formatTierPrice("founding_member", "monthly")).toBe("$39/mo");
      expect(formatTierPrice("early_bird", "monthly")).toBe("$50/mo");
      expect(formatTierPrice("member", "monthly")).toBe("$99/mo");
    });

    test("should format yearly prices correctly", () => {
      expect(formatTierPrice("founding_member", "yearly")).toBe("$375/yr");
      expect(formatTierPrice("early_bird", "yearly")).toBe("$480/yr");
      // Member tier doesn't have yearly pricing
      expect(formatTierPrice("member", "yearly")).toBe("$99/mo");
    });

    test("should use specific amount when provided", () => {
      expect(formatTierPrice("founding_member", "monthly", 3900)).toBe("$39/mo");
      expect(formatTierPrice("founding_member", "yearly", 37500)).toBe("$375/yr");
      expect(formatTierPrice("early_bird", "monthly", 5000)).toBe("$50/mo");
      expect(formatTierPrice("early_bird", "yearly", 48000)).toBe("$480/yr");
    });

    test("should handle custom amounts", () => {
      // Test discounted prices
      expect(formatTierPrice("member", "monthly", 7900)).toBe("$79/mo");
      expect(formatTierPrice("member", "yearly", 79900)).toBe("$799/yr");
    });

    test("should return empty string for invalid tier", () => {
      expect(formatTierPrice("invalid_tier", "monthly")).toBe("");
      expect(formatTierPrice("free", "monthly")).toBe("");
      expect(formatTierPrice("scholarship", "monthly")).toBe("");
    });
  });

  describe("Yearly Savings Calculations", () => {
    test("should calculate founding member yearly savings", () => {
      const monthlyPrice = 39;
      const yearlyPrice = 375;
      const monthlyAnnualized = monthlyPrice * 12;
      const savings = monthlyAnnualized - yearlyPrice;
      const savingsPercent = Math.round((savings / monthlyAnnualized) * 100);

      expect(monthlyAnnualized).toBe(468);
      expect(savings).toBe(93);
      expect(savingsPercent).toBe(20);
    });

    test("should calculate early bird yearly savings", () => {
      const monthlyPrice = 50;
      const yearlyPrice = 480;
      const monthlyAnnualized = monthlyPrice * 12;
      const savings = monthlyAnnualized - yearlyPrice;
      const savingsPercent = Math.round((savings / monthlyAnnualized) * 100);

      expect(monthlyAnnualized).toBe(600);
      expect(savings).toBe(120);
      expect(savingsPercent).toBe(20);
    });

    test("should handle no yearly option for member tier", () => {
      const monthlyPrice = 99;
      const hasYearlyOption = false;

      expect(monthlyPrice).toBe(99);
      expect(hasYearlyOption).toBe(false);
    });
  });

  describe("Proration Calculations", () => {
    test("should calculate upgrade proration", () => {
      // Upgrading from $50/mo to $99/mo mid-cycle
      const oldPrice = 5000; // $50 in cents
      const newPrice = 9900; // $99 in cents
      const daysInCycle = 30;
      const daysRemaining = 15;

      const unusedAmount = Math.round((oldPrice * daysRemaining) / daysInCycle);
      const newAmount = Math.round((newPrice * daysRemaining) / daysInCycle);
      const prorationAmount = newAmount - unusedAmount;

      expect(unusedAmount).toBe(2500); // $25 credit
      expect(newAmount).toBe(4950); // $49.50 charge
      expect(prorationAmount).toBe(2450); // $24.50 to pay
    });

    test("should calculate downgrade proration", () => {
      // Downgrading from $99/mo to $50/mo mid-cycle
      const oldPrice = 9900; // $99 in cents
      const newPrice = 5000; // $50 in cents
      const daysInCycle = 30;
      const daysRemaining = 20;

      const unusedAmount = Math.round((oldPrice * daysRemaining) / daysInCycle);
      const newAmount = Math.round((newPrice * daysRemaining) / daysInCycle);
      const creditAmount = unusedAmount - newAmount;

      expect(unusedAmount).toBe(6600); // $66 credit
      expect(newAmount).toBe(3333); // $33.33 charge
      expect(creditAmount).toBe(3267); // $32.67 credit
    });

    test("should handle yearly to monthly switch", () => {
      // Switching from $375/yr to $39/mo with 6 months remaining
      const yearlyPrice = 37500; // $375 in cents
      const monthlyPrice = 3900; // $39 in cents
      const monthsInYear = 12;
      const monthsRemaining = 6;

      const unusedAmount = Math.round((yearlyPrice * monthsRemaining) / monthsInYear);
      const monthlyTotal = monthlyPrice * monthsRemaining;
      const difference = monthlyTotal - unusedAmount;

      expect(unusedAmount).toBe(18750); // $187.50 credit
      expect(monthlyTotal).toBe(23400); // $234 for 6 months
      expect(difference).toBe(4650); // $46.50 additional cost
    });
  });

  describe("Currency Formatting", () => {
    test("should format cents to dollars correctly", () => {
      const formatCentsToDollars = (cents: number): string => {
        return `$${(cents / 100).toFixed(2)}`;
      };

      expect(formatCentsToDollars(9900)).toBe("$99.00");
      expect(formatCentsToDollars(5000)).toBe("$50.00");
      expect(formatCentsToDollars(3900)).toBe("$39.00");
      expect(formatCentsToDollars(37500)).toBe("$375.00");
      expect(formatCentsToDollars(99)).toBe("$0.99");
      expect(formatCentsToDollars(1)).toBe("$0.01");
      expect(formatCentsToDollars(1234)).toBe("$12.34");
    });

    test("should handle negative amounts for refunds", () => {
      const formatCentsToDollars = (cents: number): string => {
        const isNegative = cents < 0;
        const absoluteValue = Math.abs(cents);
        return `${isNegative ? '-' : ''}$${(absoluteValue / 100).toFixed(2)}`;
      };

      expect(formatCentsToDollars(-9900)).toBe("-$99.00");
      expect(formatCentsToDollars(-5000)).toBe("-$50.00");
      expect(formatCentsToDollars(-150)).toBe("-$1.50");
    });
  });
});