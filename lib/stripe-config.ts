/**
 * Stripe Configuration Helper
 * 
 * Provides type-safe access to Stripe environment variables
 * with proper validation and error handling
 */

interface StripeConfig {
  publishableKey: string;
  memberMonthlyPriceId: string;
  memberYearlyPriceId: string;
  monthlyPrice: number;
  yearlyPrice: number;
}

/**
 * Get validated Stripe configuration from environment variables
 * @throws Error if required configuration is missing
 */
export function getStripeConfig(): StripeConfig {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const memberMonthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MEMBER_MONTHLY_PRICE_ID;
  const memberYearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MEMBER_YEARLY_PRICE_ID;
  
  if (!publishableKey || !memberMonthlyPriceId || !memberYearlyPriceId) {
    throw new Error("Stripe configuration is incomplete. Please check environment variables.");
  }
  
  return {
    publishableKey,
    memberMonthlyPriceId,
    memberYearlyPriceId,
    monthlyPrice: 99,
    yearlyPrice: 990,
  };
}

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  try {
    getStripeConfig();
    return true;
  } catch {
    return false;
  }
}