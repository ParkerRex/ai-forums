/**
 * PostHog-Style Conversion Copy Library
 * 
 * Fun, transparent, anti-corporate messaging that builds trust.
 * Inspired by PostHog's developer-friendly approach.
 */

export type PaywallVariant = "default" | "humorous" | "transparent" | "social" | "developer";

export interface PaywallCopy {
  headline: string;
  subheadline: string;
  cta: string;
  trustSignals: string[];
  valueProp?: string;
}

export interface SuccessCopy {
  headline: string;
  welcome: (name?: string) => string;
  celebration: string;
  nextSteps: string;
}

/**
 * Paywall messaging variants for A/B testing
 */
export const paywallCopy: Record<PaywallVariant, PaywallCopy> = {
  default: {
    headline: "The good stuff is behind the paywall 🎯",
    subheadline: "No BS. No annual contracts. Just $99/mo for everything.",
    cta: "Get instant access → $99/mo",
    trustSignals: [
      "Cancel in one click",
      "30-day money-back guarantee",
      "Join 2,000+ engineers"
    ],
    valueProp: "We could make this free, but then we'd have to show you ads 🤮"
  },
  
  humorous: {
    headline: "This post costs money (sorry not sorry)",
    subheadline: "But hey, it's less than your daily coffee addiction ☕",
    cta: "Fine, take my money → $99/mo",
    trustSignals: [
      "Cancel anytime (we won't cry)",
      "30-day guarantee (we're confident)",
      "2,000+ engineers can't be wrong"
    ],
    valueProp: "At least we're honest about wanting your money 🤷"
  },
  
  transparent: {
    headline: "Want the full story? Join the club.",
    subheadline: "Transparent pricing: $99/mo. No 'contact sales' BS.",
    cta: "Yes, unlock everything",
    trustSignals: [
      "No retention specialist calls",
      "Cancel with one click",
      "Full refund within 30 days"
    ],
    valueProp: "We believe in honest pricing. Here's ours."
  },
  
  social: {
    headline: "Join 2,000+ smart engineers inside",
    subheadline: "Vercel engineers, OpenAI researchers, and indie hackers are already here.",
    cta: "Join the community → $99/mo",
    trustSignals: [
      "Active Discord community",
      "Weekly AMAs with experts",
      "Cancel anytime, no questions"
    ],
    valueProp: "You're not just buying content, you're joining a movement."
  },
  
  developer: {
    headline: "This content requires authentication 🔐",
    subheadline: "if (wallet.balance >= 99) { content.unlock() }",
    cta: "sudo access --grant → $99/mo",
    trustSignals: [
      "No tracking pixels",
      "Open source friendly",
      "DELETE subscription anytime"
    ],
    valueProp: "Built by developers, for developers. No dark patterns."
  }
};

/**
 * Success page messaging
 */
export const successCopy: Record<PaywallVariant, SuccessCopy> = {
  default: {
    headline: "You're in! Welcome to the inside 🎉",
    welcome: (name) => name ? `We're excited to have you, ${name}!` : "We're excited to have you!",
    celebration: "You just joined 2,000+ engineers building the future of AI.",
    nextSteps: "Let's get you set up and exploring."
  },
  
  humorous: {
    headline: "Success! Your wallet is now lighter 💸",
    welcome: (name) => name ? `But seriously ${name}, welcome aboard!` : "But seriously, welcome aboard!",
    celebration: "You've made a questionable financial decision. We love it.",
    nextSteps: "Time to make this worth your money."
  },
  
  transparent: {
    headline: "Payment confirmed. Access granted. ✅",
    welcome: (name) => name ? `Welcome ${name}. Here's what happens next:` : "Welcome. Here's what happens next:",
    celebration: "No surprises. Just immediate access to everything we promised.",
    nextSteps: "Set up your account to get started."
  },
  
  social: {
    headline: "Welcome to the community! 🚀",
    welcome: (name) => name ? `${name}, you're now part of something special.` : "You're now part of something special.",
    celebration: "2,001 engineers and counting. You're in good company.",
    nextSteps: "Join our Discord and say hi!"
  },
  
  developer: {
    headline: "HTTP 200: Payment successful 🎯",
    welcome: (name) => name ? `User ${name} successfully authenticated.` : "User successfully authenticated.",
    celebration: "Transaction committed. Rolling forward, not back.",
    nextSteps: "Initialize your profile to continue."
  }
};

/**
 * Trust-building messages used across the site
 */
export const trustMessages = {
  pricing: {
    transparent: "We show our prices upfront. No 'contact sales' nonsense.",
    fair: "Pay for what you use. Cancel when you want. We're not your gym membership.",
    guarantee: "30-day guarantee because we're confident you'll love it."
  },
  
  cancellation: {
    easy: "Cancel in one click. No phone calls. No guilt trips.",
    instant: "Cancellation takes effect immediately. No waiting periods.",
    respectful: "We'll miss you, but we won't beg you to stay."
  },
  
  value: {
    community: "You're not just buying content. You're joining 2,000+ engineers.",
    quality: "Every post is worth the price of admission.",
    support: "Your subscription keeps us ad-free and independent."
  }
};

/**
 * Call-to-action variations
 */
export const ctaVariants = {
  confident: "Get instant access → $99/mo",
  humorous: "Shut up and take my money",
  simple: "Join now",
  developer: "git checkout -b premium",
  social: "Join 2,000+ engineers",
  direct: "Yes, I want access",
  playful: "I'm convinced. Let's go!",
  transparent: "Start membership - $99/mo"
};

/**
 * Error messages with personality
 */
export const errorMessages = {
  checkoutFailed: "Oops! Stripe had a moment. Try again?",
  cardDeclined: "Your card said no. Got another one?",
  networkError: "The internet broke. It happens. Try again?",
  genericError: "Something went wrong. We're on it!"
};

/**
 * Get a random variant for A/B testing
 */
export function getRandomVariant(): PaywallVariant {
  const variants: PaywallVariant[] = ["default", "humorous", "transparent", "social", "developer"];
  return variants[Math.floor(Math.random() * variants.length)];
}

/**
 * Get variant based on user preferences or A/B test assignment
 */
export function getPaywallVariant(userPreference?: PaywallVariant): PaywallVariant {
  // In production, this would check user preferences, A/B test assignments, etc.
  return userPreference || "default";
}