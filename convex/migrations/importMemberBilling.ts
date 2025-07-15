/**
 * Migration to import member billing data from CSV
 * 
 * This migration updates existing members with billing information from
 * the CSV export, including tier, subscription status, and dates.
 * Members are migrating from a different Stripe account, so we don't
 * create subscription records - just update member profiles.
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";

// Base date for calculations (July 9, 2025)
const TODAY = new Date('2025-07-09').getTime();

/**
 * Parse "Joined Jun 23, 2025" format to Unix timestamp
 */
function parseJoinedDate(dateStr: string): number {
  if (!dateStr) return TODAY;
  const match = dateStr.match(/Joined (\w+ \d+, \d+)/);
  if (match) {
    return new Date(match[1]).getTime();
  }
  return TODAY;
}

/**
 * Parse "Active 5h ago" format to Unix timestamp
 */
function parseLastActive(activeStr: string): number {
  if (!activeStr) return TODAY;
  
  // Handle "Active now" or similar
  if (activeStr.includes('now') || activeStr.includes('Active 0')) {
    return TODAY;
  }
  
  // Parse relative time
  const match = activeStr.match(/Active (\d+)([mhd]) ago/);
  if (!match) return TODAY;
  
  const [_, value, unit] = match;
  const num = parseInt(value);
  const multipliers: Record<string, number> = { 
    m: 60 * 1000,           // minutes
    h: 60 * 60 * 1000,      // hours
    d: 24 * 60 * 60 * 1000  // days
  };
  
  return TODAY - (num * (multipliers[unit] || 0));
}

/**
 * Parse renewal date strings
 */
function parseRenewalDate(renewalStr: string): number | undefined {
  if (!renewalStr) return undefined;
  
  // Handle "Renews in X days"
  const renewMatch = renewalStr.match(/Renews in (\d+) days?/);
  if (renewMatch) {
    return TODAY + (parseInt(renewMatch[1]) * 24 * 60 * 60 * 1000);
  }
  
  // Handle "Cancelled (churns in X days)"
  const churnMatch = renewalStr.match(/churns in (\d+) days?/);
  if (churnMatch) {
    return TODAY + (parseInt(churnMatch[1]) * 24 * 60 * 60 * 1000);
  }
  
  // Handle specific date formats
  if (renewalStr.includes('Churned')) {
    // Already churned - no future date
    return undefined;
  }
  
  return undefined;
}

/**
 * Map CSV status to subscription status
 */
function mapSubscriptionStatus(status: string, renewalStr: string): "active" | "cancelled" | "past_due" | "expired" | "none" {
  if (!status || status === "Free" || renewalStr === "Lifetime access") {
    return "none";
  }
  
  if (renewalStr?.includes("Cancelled")) {
    return "cancelled";
  }
  
  if (renewalStr?.includes("Declined")) {
    return "past_due";
  }
  
  if (renewalStr?.includes("Churned")) {
    return "expired";
  }
  
  if (status === "active") {
    return "active";
  }
  
  return "none";
}

/**
 * Map tier from CSV (LEGACY MIGRATION ONLY)
 * Note: This maps to deprecated tiers which are then migrated by testReactivation.ts
 * Final state: no free tier, scholarships via Stripe coupons with early_bird tier
 */
function mapTier(tier: string, status: string, renewalStr: string): "founding_member" | "early_bird" | "member" {
  if (status === "Free" || renewalStr === "Lifetime access") {
    return "member"; // Will be migrated to early_bird with coupon
  }

  if (tier === "founding_member") return "founding_member";
  if (tier === "early_bird") return "early_bird";
  if (tier === "member") return "member";

  return "member"; // Will be migrated to member tier
}

/**
 * Parse amount in cents
 */
function parseAmountCents(amountStr: string): number {
  if (!amountStr) return 0;
  
  // Remove any non-numeric characters except dots
  const cleaned = amountStr.replace(/[^\d.]/g, '');
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) return 0;
  
  // If amount looks like it's already in cents (> 100), use as is
  // Otherwise multiply by 100
  return amount > 100 ? Math.round(amount) : Math.round(amount * 100);
}

/**
 * Determine billing interval from amount or explicit data
 */
function parseBillingInterval(amountStr: string, intervalStr?: string): "monthly" | "yearly" {
  if (intervalStr === "yearly") return "yearly";
  if (intervalStr === "monthly") return "monthly";
  
  // Check if amount string contains yearly indicator
  if (amountStr?.includes("year") || amountStr?.includes("480")) {
    return "yearly";
  }
  
  return "monthly";
}

// CSV data structure
interface MemberCSVRow {
  email: string;
  firstName: string;
  lastName: string;
  tier: string;
  status: string;
  billingInterval: string;
  amountCents: string;
  lastPaymentDate: string;
  location: string;
  bio: string;
  'last active': string;
  renewalDate: string;
}

// The CSV data - parsed manually since we can't use fs in Convex
const csvData: MemberCSVRow[] = [
  { email: "hiramclark@gmail.com", firstName: "Hiram", lastName: "Clark", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jul 8, 2025", location: "", bio: "", "last active": "Active 18h ago", renewalDate: "News in 29 days" },
  { email: "bjorn@runaker.se", firstName: "Bjorn", lastName: "Runaker", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jul 7, 2025", location: "", bio: "", "last active": "Active 1d ago", renewalDate: "Renews in 29 days" },
  { email: "todd@bonnewell.com", firstName: "Todd", lastName: "Bonnewell", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jul 5, 2025", location: "", bio: "Looking to learn.", "last active": "Active 2h ago", renewalDate: "Renews in 29 days" },
  { email: "jonathan@stokkland.com", firstName: "Jonathan", lastName: "Stokkland", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jul 4, 2025", location: "Sydney, Australia", bio: "Imaging Expert, CS Student", "last active": "Active 10h ago", renewalDate: "Renews in 28 days" },
  { email: "aemaes@gmail.com", firstName: "Emm", lastName: "Ess", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 23, 2025", location: "", bio: "Currently delving into AI research and development, committed to pushing the boundaries of what's possible in artificial intelligence.", "last active": "Active 5d ago", renewalDate: "Renews in 15 days" },
  { email: "david.manibod@gmail.com", firstName: "David", lastName: "Manibod", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 22, 2025", location: "", bio: "Here to learn and motivate", "last active": "Active 1d ago", renewalDate: "Renews in 14 days" },
  { email: "ryanleerhodes@gmail.com", firstName: "Ryan", lastName: "Rhodes", tier: "early_bird", status: "Cancelled (churns in 14 days)", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 21, 2025", location: "", bio: "fasdfadsf", "last active": "Active 11h ago", renewalDate: "Cancelled (churns in 14 days)" },
  { email: "rileyrmahoney@gmail.com", firstName: "Riley", lastName: "Mahoney", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 20, 2025", location: "Fort Lauderdale, Florida", bio: "Fullstack web developer, tennis enthusiast", "last active": "Active 4d ago", renewalDate: "Renews in 13 days" },
  { email: "kyle.m.marks@icloud.com", firstName: "Kyle", lastName: "Marks", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 20, 2025", location: "Vancouver", bio: "vibing", "last active": "Active 4d ago", renewalDate: "Renews in 13 days" },
  { email: "joeypayne.freedom@gmail.com", firstName: "Joey", lastName: "Payne", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 19, 2025", location: "Bali, Ubud", bio: "Joey Payne, founder of BoomRevenue—entrepreneur & AI consultant helping businesses scale with automation, leads, and smart booming revenue strategies.", "last active": "Active 7d ago", renewalDate: "Renews in 12 days" },
  { email: "crusoebirkhead@gmail.com", firstName: "Crusoe", lastName: "Birkhead", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 19, 2025", location: "", bio: "bio", "last active": "Active 5h ago", renewalDate: "Renews in 11 days" },
  { email: "ifj.juhasz.peter@gmail.com", firstName: "Peter", lastName: "Juhasz", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 17, 2025", location: "", bio: "bio", "last active": "Active 21h ago", renewalDate: "Renews in 10 days" },
  { email: "scottdellinger@yahoo.com", firstName: "Scott", lastName: "Dellinger", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 15, 2025", location: "", bio: "Just a guy", "last active": "Active 13d ago", renewalDate: "Renews in 8 days" },
  { email: "content@helpsmin.com", firstName: "Helps", lastName: "Ministries", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 14, 2025", location: "", bio: "I serve on the Discovery Bible Project under HELPS Ministries to help bridge the translation gap between the English Bible and the sacred originals.", "last active": "Active 2h ago", renewalDate: "Renews in 6 days" },
  { email: "pw911ebay@gmail.com", firstName: "P", lastName: "W", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 14, 2025", location: "", bio: "TBC", "last active": "Active 7d ago", renewalDate: "Renews in 6 days" },
  { email: "boothe.jeff@gmail.com", firstName: "Jeff", lastName: "Boothe", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 13, 2025", location: "", bio: "Enterprise web dev founder reUrgency 2009. Total AI retool of our systems and clients apps.", "last active": "Active 5d ago", renewalDate: "Renews in 6 days" },
  { email: "jachian.22@gmail.com", firstName: "Jason", lastName: "Chiang", tier: "early_bird", status: "active", billingInterval: "yearly", amountCents: "48000", lastPaymentDate: "Joined Jun 13, 2025", location: "", bio: "Navigating the AI seas", "last active": "Active 2d ago", renewalDate: "Renews in 341 days" },
  { email: "arnavg2019@email.iimcal.ac.in", firstName: "Arnav", lastName: "Grover", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 13, 2025", location: "", bio: "Founder learning to code with AI.", "last active": "Active 3d ago", renewalDate: "Renews in 5 days" },
  { email: "matt@mattjdavidson.com", firstName: "Matt", lastName: "Davidson", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 13, 2025", location: "", bio: "Software Eng", "last active": "Active 7d ago", renewalDate: "Renews in 5 days" },
  { email: "taylor@growthsaloon.com", firstName: "Taylor", lastName: "Coteus", tier: "early_bird", status: "active", billingInterval: "yearly", amountCents: "48000", lastPaymentDate: "Joined Jun 12, 2025", location: "", bio: "I am a Business Process Manager and i've been following along your YouTube channel to build tons of prototypes over the last couple months!", "last active": "Active 20d ago", renewalDate: "Renews in 340 days" },
  { email: "cczaban@zerothprinciples.ai", firstName: "Christopher", lastName: "Czaban", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 12, 2025", location: "", bio: "AI Solutions Engineer & Architect", "last active": "Active 9d ago", renewalDate: "Renews in 4 days" },
  { email: "michael.j.tier@gmail.com", firstName: "Michael", lastName: "Tier", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 12, 2025", location: "Boca Raton", bio: "Michael—Tech PM, reformed software dev,real estate & stock investor, ADHD  hacker, AI-automation tinkerer. Sharing systems & prompts to level up ops.", "last active": "Active 1d ago", renewalDate: "Renews in 4 days" },
  { email: "jasen@glowing.io", firstName: "Jasen", lastName: "Lew", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 12, 2025", location: "", bio: "Entrepreneur", "last active": "Active 5h ago", renewalDate: "Renews in 4 days" },
  { email: "rick.kieffer@gmail.com", firstName: "Rick", lastName: "Kieffer", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 11, 2025", location: "Copenhagen", bio: "🚀🤖", "last active": "Active 4d ago", renewalDate: "Renews in 4 days" },
  { email: "davidram3rd@gmail.com", firstName: "David", lastName: "Ramirez", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 9, 2025", location: "", bio: "Just looking to learn new things every day", "last active": "Active 14h ago", renewalDate: "Renews in 2 days" },
  { email: "morrisonb84@gmail.com", firstName: "Ben", lastName: "Morrison", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 9, 2025", location: "", bio: "developer in the startup space, specializing in sports tech", "last active": "Active 17d ago", renewalDate: "Renews in 2 days" },
  { email: "micah.davis@letsmake.com", firstName: "Mike", lastName: "Davis", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 7, 2025", location: "", bio: "dev", "last active": "Active 25d ago", renewalDate: "Renews in 0 days" },
  { email: "james.loesch2@gmail.com", firstName: "James", lastName: "Loesch", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 6, 2025", location: "", bio: "Here to learn", "last active": "Active 4d ago", renewalDate: "Renews in 30 days" },
  { email: "schuilenburgchris@gmail.com", firstName: "Chris", lastName: "Schuilenburg", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 6, 2025", location: "Netherlands", bio: "Aspiring Founder, working on my current startup.", "last active": "Active 7h ago", renewalDate: "Renews in 29 days" },
  { email: "merlin.floyd@gmail.com", firstName: "Merlin", lastName: "Floyd", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 5, 2025", location: "", bio: "nothing to see here", "last active": "Active 28d ago", renewalDate: "Renews in 29 days" },
  { email: "dtedesco1@gmail.com", firstName: "Daniel", lastName: "Tedesco", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 4, 2025", location: "Beijing China", bio: "Days @google. nights and weekends teaching agents to fly", "last active": "Active 4d ago", renewalDate: "Renews in 332 days" },
  { email: "pietersz@gmail.com", firstName: "Dimitri", lastName: "Pietersz", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 3, 2025", location: "", bio: "Freelance Data Engineer with a secret love for DevOps and Coding (which I want to explore more)", "last active": "Active 3d ago", renewalDate: "Renews in 26 days" },
  { email: "joe.hosemann@gmail.com", firstName: "Joe", lastName: "Hosemann", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 2, 2025", location: "", bio: "", "last active": "Active 1h ago", renewalDate: "Renews in 26 days" },
  { email: "josh@gracefulbydesign.com", firstName: "Josh", lastName: "Coleman", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 2, 2025", location: "", bio: "Business operations and ads manager for my amazing wife's brand Graceful By Design.", "last active": "Active 7d ago", renewalDate: "Renews in 25 days" },
  { email: "douglasdrew11@gmail.com", firstName: "Douglas", lastName: "P", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Jun 1, 2025", location: "", bio: "Entrepreneur, Lawyer", "last active": "Active 14d ago", renewalDate: "Renews in 25 days" },
  { email: "ceo@getdatazen.com", firstName: "Andrew", lastName: "Warner", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 31, 2025", location: "", bio: "CEO of getdatazen.com", "last active": "Active 29d ago", renewalDate: "Renews in 23 days" },
  { email: "jschon@jschon.net", firstName: "Jeff", lastName: "S.", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 31, 2025", location: "", bio: "Semi-retired Corporate Tech Exec turned entrepreneur.  Currently ecomm brand owner, but can't get SaaS off my mind.  \nParamotor pilot... if you know.", "last active": "Active 15d ago", renewalDate: "Renews in 23 days" },
  { email: "javie@javierios.com", firstName: "Javier", lastName: "Rios", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 30, 2025", location: "", bio: "Looking to learn more about intigration", "last active": "Active 4d ago", renewalDate: "Renews in 23 days" },
  { email: "andrewjohnharvey@gmail.com", firstName: "Andy", lastName: "Harvey", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 29, 2025", location: "", bio: "A Product Manager building with AI", "last active": "Active 16h ago", renewalDate: "Renews in 22 days" },
  { email: "chensok@gmail.com", firstName: "Vinchenso", lastName: "Kendall", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 29, 2025", location: "Cape Town", bio: "Real Estate Ghostwriter and Investor", "last active": "Active 4d ago", renewalDate: "" },
  { email: "anomalia.research@gmail.com", firstName: "Anoma", lastName: "R", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 29, 2025", location: "", bio: "Building mobile apps | Tech enthusiast", "last active": "Active 21d ago", renewalDate: "Declined (churns in 4 days)" },
  { email: "mike@makeshapes.com", firstName: "Mike", lastName: "Courian", tier: "early_bird", status: "active", billingInterval: "yearly", amountCents: "48000", lastPaymentDate: "Joined May 28, 2025", location: "Auckland, New Zealand", bio: "👨‍💻 Co-founder @ Makeshapes.com //\nDeveloper in Training 🚧", "last active": "Active 3d ago", renewalDate: "" },
  { email: "mtorrescohencol@gmail.com", firstName: "Mateo", lastName: "Torres-Cohen", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 27, 2025", location: "", bio: "Helloooo, my name is Mateo. I am a first year university student and intern working on AI platforms. Come say hi, friendships ARE connections.", "last active": "Active 34d ago", renewalDate: "Declined (churns in 3 days)" },
  { email: "seltzdesign@protonmail.com", firstName: "Armin", lastName: "Seltz", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 27, 2025", location: "", bio: "Computational Designer from Zurich, Switzerland", "last active": "Active 18d ago", renewalDate: "Renews in 19 days" },
  { email: "henrik@thepia.net", firstName: "Henrik", lastName: "Vendelbo", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 27, 2025", location: "", bio: "Working on Recording Things in the real world", "last active": "Active 11d ago", renewalDate: "Renews in 19 days" },
  { email: "corey@cmetech.io", firstName: "Corey", lastName: "Ellis", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 26, 2025", location: "", bio: "Software Engineer working in Telecom industry", "last active": "Active 1d ago", renewalDate: "Cancelled (churns in 19 days)" },
  { email: "orakemu@gmail.com", firstName: "Yorgo", lastName: "Hoebeke", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 25, 2025", location: "", bio: "phd in psychology turned dev - making Orakemu a life management app to help you be organized and live intentionally", "last active": "Active 14m ago", renewalDate: "Renews in 17 days" },
  { email: "maximacademic@gmail.com", firstName: "Maxim", lastName: "Alayev", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 24, 2025", location: "", bio: "Software Engineer", "last active": "Active 4d ago", renewalDate: "Renews in 16 days" },
  { email: "romneycola@romeai.io", firstName: "Romney", lastName: "Cola", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 21, 2025", location: "", bio: "Making The Process to Deploy & Get Results With Ai Phone Call Assistants As Easy As Possible", "last active": "Active 14h ago", renewalDate: "Renews in 14 days" },
  { email: "bxbxbxbxbxr@gmail.com", firstName: "Brad", lastName: "W", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 21, 2025", location: "", bio: "atx", "last active": "Active 9d ago", renewalDate: "Renews in 14 days" },
  { email: "trent.swords@gmail.com", firstName: "Trent", lastName: "Swords", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 21, 2025", location: "", bio: "I'm passionate about having fun learning and building new things and learning from others.", "last active": "Active 2h ago", renewalDate: "Renews in 14 days" },
  { email: "martin.martinez.mit@gmail.com", firstName: "Martin", lastName: "Martinez", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 21, 2025", location: "", bio: "", "last active": "Active 18h ago", renewalDate: "Renews in 13 days" },
  { email: "j.te@nimbuscoreconnect.nl", firstName: "Jeffrey", lastName: "Te", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 19, 2025", location: "", bio: "Jeffrey Te | Nimbus Core Connect", "last active": "Active 33d ago", renewalDate: "Renews in 12 days" },
  { email: "alekellegard@protonmail.com", firstName: "Aleksander", lastName: "Ellegård", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 19, 2025", location: "", bio: "student programming 3rd yr", "last active": "Active 32d ago", renewalDate: "Renews in 11 days" },
  { email: "dustinw@flywheelaec.com", firstName: "Dustin", lastName: "Williams", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "", lastPaymentDate: "Joined May 19, 2025", location: "", bio: "Working on ConTech and Digital Delivery Innovation", "last active": "Active 3m ago", renewalDate: "Renews in 11 days" },
  { email: "davidp@brazenconsulting.co", firstName: "David", lastName: "Price", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 16, 2025", location: "Halifax, NS // Music, Marketing, and Code.", bio: "Music, Marketing, and Code.", "last active": "Active 32d ago", renewalDate: "Renews in 9 days" },
  { email: "dev@webzi.ai", firstName: "Netanel", lastName: "Edri", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 18, 2025", location: "CTO, building SaSS Products", bio: "", "last active": "Active 15d ago", renewalDate: "" },
  { email: "willjoemo@gmail.com", firstName: "William", lastName: "Mulcahy", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 18, 2025", location: "Ann Arbor, MI", bio: "Optimistic AI + PM + BI + governance for large academic medical centers.", "last active": "Active 11d ago", renewalDate: "Joined May 18, 2025" },
  { email: "gbatesy@gmail.com", firstName: "Greg", lastName: "Bates", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 15, 2025", location: "Halifax, NS", bio: "Music, Marketing, and Code.", "last active": "Active 28d ago", renewalDate: "Renews in 9 days" },
  { email: "guilherme1237@gmail.com", firstName: "Guilherme", lastName: "Brandão", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "", location: "", bio: "", "last active": "", renewalDate: "Renews in 8 days" },
  { email: "contextsurfer@gmail.com", firstName: "Rento", lastName: "Rinalds", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 14, 2025", location: "", bio: "Digital Technologist / full stack web developer / AI  enthusiast", "last active": "Active 4d ago", renewalDate: "Renews in 6 days" },
  { email: "hunterlapeyre@yahoo.com", firstName: "Hunter", lastName: "Lapeyre", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 14, 2025", location: "", bio: "", "last active": "Active 28d ago", renewalDate: "" },
  { email: "rick@pixelpod.co.uk", firstName: "Rick", lastName: "Williams", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 11, 2025", location: "", bio: "I chew gum and kick ass...and I'm all out of gum", "last active": "Active 4d ago", renewalDate: "Renews in 3 days" },
  { email: "me@iamfiscus.com", firstName: "Jd", lastName: "Fiscus", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 11, 2025", location: "Detroit, MI", bio: "Heya. I'm Jd, a nerdy Detroiter. I've been excited to dive deep into data-centric projects. Some projects I have are educatorlab.org, nerding.io", "last active": "Active 57m ago", renewalDate: "Renews in 3 days" },
  { email: "joe.kim@gmail.com", firstName: "Joseph", lastName: "Kim", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 10, 2025", location: "Father of three.", bio: "", "last active": "Active 12d ago", renewalDate: "Renews in 2 days" },
  { email: "cje.amaya@gmail.com", firstName: "Carlos", lastName: "Amaya", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 9, 2025", location: "Somewhere in the world", bio: "Digital Nomad and Data Professional on a quest for freedom. Forever curious and learning to be a better version of myself.", "last active": "Active 5d ago", renewalDate: "Renews in 1 day" },
  { email: "xamfifa@gmail.com", firstName: "Andrei", lastName: "Michael", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 7, 2025", location: "", bio: "Former IT operator turning into a SWE!", "last active": "Active 6d ago", renewalDate: "Churned Jul 7, 2025" },
  { email: "shane@studiobr.io", firstName: "Shane", lastName: "Griffiths", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 6, 2025", location: "Taunton, UK", bio: "", "last active": "Active 4d ago", renewalDate: "Renews in 29 days" },
  { email: "craig.cocker@gmail.com", firstName: "Craig", lastName: "Cocker", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 5, 2025", location: "", bio: "Tech Professional based in Dubai", "last active": "Active 4d ago", renewalDate: "Renews in 29 days" },
  { email: "mandrew333@gmail.com", firstName: "Matthew", lastName: "Andrew", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 5, 2025", location: "", bio: "I built the systems, scaled the teams, and proved the model. Now, it's a different world. I'm here to find, grow, and extract value anywhere it hides.", "last active": "Active 19h ago", renewalDate: "Renews in 29 days" },
  { email: "jasen@humanig.com", firstName: "Jasen", lastName: "Dickan", tier: "early_bird", status: "active", billingInterval: "", amountCents: "$480/year", lastPaymentDate: "Joined May 5, 2025", location: "New York City", bio: "An AI solopreneur creating 10 digital products in one year. Share in the journey, struggle, learnings, and insights.", "last active": "Active 17d ago", renewalDate: "Renews in 301 days" },
  { email: "beda@mademarketing.ch", firstName: "Beda", lastName: "Binder", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 3, 2025", location: "Zurich", bio: "Experiential Gamification Expert // Ich entwickle digitale Games mit einem analogen Twist, damit Brand Experiences bei Menschen in Erinnerung bleiben", "last active": "Active 6h ago", renewalDate: "Renews in 26 days" },
  { email: "jdsmith2816@gmail.com", firstName: "Jd", lastName: "Smith", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 3, 2025", location: "", bio: "", "last active": "Active 44d ago", renewalDate: "Renews in 26 days" },
  { email: "keith@visualgov.com", firstName: "Keith", lastName: "Kabza", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 2, 2025", location: "", bio: "AI Architect - 25yr software engineering", "last active": "Active 3d ago", renewalDate: "Renews in 25 days" },
  { email: "matt@mattjefferson.com", firstName: "Matt", lastName: "Jefferson", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 1, 2025", location: "", bio: "AI Enthusiast", "last active": "Active 8d ago", renewalDate: "Renews in 25 days" },
  { email: "wmcarsten@gmail.com", firstName: "Wayne", lastName: "Carsten", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined May 1, 2025", location: "", bio: "Spent a lot of time in the tree, now it's time to used my head instead of my back.", "last active": "Active 29d ago", renewalDate: "Renews in 24 days" },
  { email: "jakenicholas.mgmt@gmail.com", firstName: "Jake", lastName: "Nicholas", tier: "early_bird", status: "active", billingInterval: "", amountCents: "Free", lastPaymentDate: "Joined Apr 29, 2025", location: "", bio: "Founder of Markets of Tomorrow", "last active": "Active 33d ago", renewalDate: "Lifetime access" },
  { email: "amanlohia1995@gmail.com", firstName: "Aman", lastName: "Lohia", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Apr 29, 2025", location: "", bio: "Product builder", "last active": "Active 3d ago", renewalDate: "Renews in 21 days" },
  { email: "evandemkiw@gmail.com", firstName: "Evan", lastName: "Demkiw", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Apr 28, 2025", location: "", bio: "CEO of Solid Ventures, Inc.", "last active": "Active 7d ago", renewalDate: "Renews in 20 days" },
  { email: "main@neurov.ai", firstName: "Dmitri", lastName: "Jarkov", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Apr 27, 2025", location: "", bio: "Founder Neurov AI", "last active": "Active 2d ago", renewalDate: "Renews in 19 days" },
  { email: "nnasoody@gmail.com", firstName: "Nima", lastName: "Nasoody", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Apr 26, 2025", location: "", bio: "AI Enthusiast", "last active": "Active 4h ago", renewalDate: "Renews in 19 days" },
  { email: "andy@andydataguy.com", firstName: "Anand", lastName: "Houston", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Apr 26, 2025", location: "USA", bio: "I love building data solutions", "last active": "Active 10d ago", renewalDate: "Renews in 18 days" },
  { email: "jerin.stewart@gmail.com", firstName: "Jerin", lastName: "Stewart", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Apr 25, 2025", location: "", bio: "Product Manager Turned Vibe Coder", "last active": "Active 27d ago", renewalDate: "Renews in 17 days" },
  { email: "brandondmilligan@icloud.com", firstName: "Brandon", lastName: "Milligan", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Apr 23, 2025", location: "", bio: "Transcending", "last active": "Active 25d ago", renewalDate: "Renews in 16 days" },
  { email: "thebigexample@gmail.com", firstName: "Chris", lastName: "Mcmullen", tier: "early_bird", status: "active", billingInterval: "", amountCents: "", lastPaymentDate: "Joined Apr 21, 2025", location: "", bio: "Here to learn", "last active": "Active 5d ago", renewalDate: "Renews in 13 days" },
  { email: "hamilton.lachlan@gmail.com", firstName: "Lachlan", lastName: "Hamilton", tier: "early_bird", status: "active", billingInterval: "", amountCents: "$480/year", lastPaymentDate: "Joined Apr 20, 2025", location: "Tasmania", bio: "", "last active": "Active 33d ago", renewalDate: "Renews in 286 days" },
  { email: "jacobinicky@hotmail.com", firstName: "Nicolas", lastName: "Jacobi", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Apr 19, 2025", location: "", bio: "", "last active": "Active 38m ago", renewalDate: "Renews in 12 days" },
  { email: "nathaniel.j.garcia@gmail.com", firstName: "Nathaniel", lastName: "Garcia", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Apr 17, 2025", location: "", bio: "Software Developer based in Tokyo", "last active": "Active 26d ago", renewalDate: "Renews in 9 days" },
  { email: "danishafzalkhan@gmail.com", firstName: "Danish", lastName: "Khan", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Apr 16, 2025", location: "", bio: "", "last active": "Active 28d ago", renewalDate: "Renews in 8 days" },
  { email: "derek@getfwd.com", firstName: "Derek", lastName: "Victory", tier: "early_bird", status: "active", billingInterval: "monthly", amountCents: "5000", lastPaymentDate: "Joined Apr 16, 2025", location: "", bio: "Serial entrepreneur, hacker, payments expert...", "last active": "Active 5d ago", renewalDate: "Renews in 8 days" },
  { email: "haverondavid@gmail.com", firstName: "David", lastName: "Haveron", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 16, 2025", location: "", bio: "Hello, engineer and tech entusiast at heart!", "last active": "Active 39d ago", renewalDate: "Renews in 8 days" },
  { email: "janos.jakab@gmail.com", firstName: "Janos", lastName: "Jakab", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 15, 2025", location: "", bio: "Hobbist", "last active": "Active 28d ago", renewalDate: "Renews in 7 days" },
  { email: "skfelix1@gmail.com", firstName: "Garrett", lastName: "F", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 14, 2025", location: "Washington", bio: "I code cool tools for skool communities!", "last active": "Active 10m ago", renewalDate: "Renews in 7 days" },
  { email: "subscriptions@gcservicesgroup.com", firstName: "Reg", lastName: "User", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 14, 2025", location: "Asheville, NC", bio: "Several years in tech/fin/healthcare", "last active": "Active 26d ago", renewalDate: "Renews in 6 days" },
  { email: "michael@michaelosborne.tech", firstName: "Michael", lastName: "Osborne", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 14, 2025", location: "", bio: "", "last active": "Active 18h ago", renewalDate: "Renews in 6 days" },
  { email: "samzemro@gmail.com", firstName: "Sam", lastName: "Zemro", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 14, 2025", location: "Wiltshire, UK", bio: "Python Dev / Dad", "last active": "Active 4d ago", renewalDate: "Renews in 6 days" },
  { email: "muttahar127@gmail.com", firstName: "Muttahar", lastName: "Farooq", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 14, 2025", location: "", bio: "PM turned into automations dev freelancer. Now vibe coding for fun.", "last active": "Active 13d ago", renewalDate: "Cancelled (churns in 6 days)" },
  { email: "david@uhostx.com", firstName: "Deividas", lastName: "Paulauskas", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 13, 2025", location: "", bio: "IT consultant always striving for knowledge.", "last active": "Active 2d ago", renewalDate: "Renews in 6 days" },
  { email: "gdconnect@gmail.com", firstName: "Daniel", lastName: "Ngari", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 13, 2025", location: "", bio: "I'm driven by innovation and always excited to experiment with new tech to perfect my projects.", "last active": "Active 4d ago", renewalDate: "Renews in 6 days" },
  { email: "pierre@cyberscaling.com", firstName: "Pierre", lastName: "Cyberscaling", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 13, 2025", location: "", bio: "learning cyborg development before Singularity...", "last active": "Active 44d ago", renewalDate: "Renews in 5 days" },
  { email: "skool.zlazj@passmail.net", firstName: "Konstantin", lastName: "Gee", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 13, 2025", location: "", bio: "Running funnels in GHL since 2020", "last active": "Active 14h ago", renewalDate: "Renews in 5 days" },
  { email: "rathiharivansh@gmail.com", firstName: "Harivansh", lastName: "Rathi", tier: "founding_member", status: "active", billingInterval: "", amountCents: "Free", lastPaymentDate: "Joined Apr 10, 2025", location: "", bio: "I am a college student at the University of Virginia and I have been trying to set up an SMMA for a while.", "last active": "Active 22h ago", renewalDate: "Lifetime access" },
  { email: "robertogcb12@gmail.com", firstName: "Roberto", lastName: "Garcia", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 9, 2025", location: "", bio: "Music Matters", "last active": "Active 1d ago", renewalDate: "Cancelled (churns in 2 days)" },
  { email: "cdragobusiness@gmail.com", firstName: "Chris", lastName: "Drago", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 8, 2025", location: "", bio: "", "last active": "Active 25m ago", renewalDate: "Cancelled (churns in 2 days)" },
  { email: "npbaron97@gmail.com", firstName: "Nicolas", lastName: "Peralta Baron", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 6, 2025", location: "", bio: "No-code dev agency", "last active": "Active 5d ago", renewalDate: "Renews in 29 days" },
  { email: "pb@mintaveinc.com", firstName: "Parikchhit", lastName: "Basnet", tier: "founding_member", status: "active", billingInterval: "monthly", amountCents: "3900", lastPaymentDate: "Joined Apr 4, 2025", location: "Toronto", bio: "Im on one...", "last active": "Active 3d ago", renewalDate: "Renews in 27 days" },
  { email: "aiden@aidenhooper.com", firstName: "Aiden", lastName: "Hooper", tier: "founding_member", status: "active", billingInterval: "yearly", amountCents: "37500", lastPaymentDate: "Joined Apr 1, 2025", location: "", bio: "I'm a IT consultant that works with companies doing a blend of business analyst work and light software dev. I want to get stronger at building.", "last active": "Active 12h ago", renewalDate: "Renews in 268 days" },
  { email: "me@parkerrex.com", firstName: "Parker", lastName: "Rex", tier: "founding_member", status: "active", billingInterval: "", amountCents: "Free", lastPaymentDate: "Joined Feb 2, 2025", location: "West Palm Beach", bio: "Led tech $0-73M/yr (aq 2021). Tried AirBnB for Music. Last 3 years working doubles researching/using AI to max out its leverage in coding/marketing.", "last active": "Active 4m ago", renewalDate: "Lifetime access" }
];

export const importMemberBilling = mutation({
  args: {
    batchSize: v.optional(v.number()),
    startIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 20;
    const startIndex = args.startIndex || 0;
    
    // Get batch of CSV data to process
    const batch = csvData.slice(startIndex, startIndex + batchSize);
    
    if (batch.length === 0) {
      return {
        message: "Import complete",
        processed: startIndex,
        total: csvData.length,
        isComplete: true,
      };
    }
    
    let updated = 0;
    let created = 0;
    let errors: string[] = [];
    
    for (const row of batch) {
      try {
        // Skip if no email
        if (!row.email) {
          errors.push(`Skipped row without email: ${row.firstName} ${row.lastName}`);
          continue;
        }
        
        // Find existing member by email
        const existingMember = await ctx.db
          .query("members")
          .filter((q) => q.eq(q.field("email"), row.email))
          .first();
        
        if (existingMember) {
          // Update existing member
          const updates: Partial<Doc<"members">> = {
            status: "active", // All imported members are active
            tier: mapTier(row.tier, row.status, row.renewalDate),
            subscriptionStatus: mapSubscriptionStatus(row.status, row.renewalDate),
            billingInterval: parseBillingInterval(row.amountCents, row.billingInterval),
            amountCents: parseAmountCents(row.amountCents),
            lastPaymentDate: parseJoinedDate(row.lastPaymentDate),
            lastOnline: parseLastActive(row['last active']),
            updatedAt: Date.now(),
          };
          
          // Only update bio/location if provided in CSV
          if (row.bio) {
            updates.bio = row.bio;
          }
          if (row.location) {
            updates.location = row.location;
          }
          
          // Set subscription end date if applicable
          const renewalDate = parseRenewalDate(row.renewalDate);
          if (renewalDate) {
            updates.subscriptionEndDate = renewalDate;
          }
          
          await ctx.db.patch(existingMember._id, updates);
          updated++;
        } else {
          // Create new member (only Parker Rex)
          if (row.email === "me@parkerrex.com") {
            const memberId = await ctx.db.insert("members", {
              email: row.email,
              firstName: row.firstName,
              lastName: row.lastName,
              status: "active",
              joinedDate: parseJoinedDate(row.lastPaymentDate),
              lastOnline: parseLastActive(row['last active']),
              updatedAt: Date.now(),
              slug: "parker-rex",
              
              // Payment fields
              tier: "member", // Lifetime/Free becomes scholarship
              subscriptionStatus: "none",
              billingInterval: "monthly",
              amountCents: 0,
              stripeCustomerId: "",
              lastPaymentDate: parseJoinedDate(row.lastPaymentDate),
              
              // Profile fields
              bio: row.bio || "",
              location: row.location || "",
            });
            created++;
          } else {
            errors.push(`Member not found: ${row.email}`);
          }
        }
      } catch (error) {
        errors.push(`Error processing ${row.email}: ${error}`);
      }
    }
    
    return {
      message: `Processed batch ${startIndex + 1}-${startIndex + batch.length}`,
      processed: startIndex + batch.length,
      total: csvData.length,
      updated,
      created,
      errors,
      isComplete: startIndex + batch.length >= csvData.length,
      nextIndex: startIndex + batch.length,
    };
  },
});