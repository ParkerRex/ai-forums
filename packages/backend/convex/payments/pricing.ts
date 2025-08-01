export type Tier = "founding_member" | "early_bird" | "member";
export type BillingInterval = "monthly" | "yearly";

export const STRIPE_PRICES: Record<Tier, Record<BillingInterval, string>> = {
  founding_member: {
    monthly: process.env.STRIPE_FOUNDING_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_FOUNDING_YEARLY_PRICE_ID!,
  },
  early_bird: {
    monthly: process.env.STRIPE_EARLY_BIRD_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_EARLY_BIRD_YEARLY_PRICE_ID!,
  },
  member: {
    monthly: process.env.STRIPE_MEMBER_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_MEMBER_YEARLY_PRICE_ID!,
  },
};

/**
 * Get Stripe price ID for a specific tier and billing interval
 * @param tier - The subscription tier
 * @param billingInterval - Monthly or yearly billing
 * @returns Stripe price ID
 * @throws Error if price ID is not configured
 */
export function getStripePrice(
  tier: Tier,
  billingInterval: BillingInterval
): string {
  const priceId = STRIPE_PRICES[tier]?.[billingInterval];

  if (!priceId) {
    throw new Error(
      `Stripe price ID not configured for tier: ${tier}, billing: ${billingInterval}`
    );
  }

  return priceId;
}

/**
 * Validate that all required Stripe price IDs are configured
 * @throws Error if any price ID is missing
 */
export function validateStripeConfiguration(): void {
  const requiredPrices = [
    "STRIPE_FOUNDING_MONTHLY_PRICE_ID",
    "STRIPE_FOUNDING_YEARLY_PRICE_ID",
    "STRIPE_EARLY_BIRD_MONTHLY_PRICE_ID",
    "STRIPE_EARLY_BIRD_YEARLY_PRICE_ID",
    "STRIPE_MEMBER_MONTHLY_PRICE_ID",
    "STRIPE_MEMBER_YEARLY_PRICE_ID",
  ];

  const missing = requiredPrices.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Stripe price environment variables: ${missing.join(", ")}`
    );
  }
}

/**
 * Get pricing information for display purposes
 * This returns the actual pricing amounts, not the Stripe price IDs
 */
export const PRICING_INFO: Record<
  Tier,
  { name: string; monthly: number; yearly: number; badge?: string }
> = {
  founding_member: {
    name: "Founding Member",
    monthly: 39,
    yearly: 375,
    badge: "Forever Price",
  },
  early_bird: {
    name: "Early Bird",
    monthly: 50,
    yearly: 480,
    badge: "Grandfathered",
  },
  member: {
    name: "Pro Member",
    monthly: 99,
    yearly: 950,
  },
};

/**
 * Get pricing info for a specific tier
 * @param tier - The subscription tier
 * @returns Pricing information for display
 */
export function getPricingInfo(tier: Tier) {
  return PRICING_INFO[tier];
}
