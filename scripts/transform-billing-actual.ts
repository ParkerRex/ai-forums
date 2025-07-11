import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

interface BillingRecord {
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
  lastActive: string;
  renewalDate: string;
}

interface TransformedMember {
  email: string;
  firstName: string;
  lastName: string;
  tier: string;
  status: 'active' | 'cancelled' | 'churned';
  billingInterval: 'monthly' | 'yearly' | null;
  amountCents: number;
  lastPaymentDate: string | null;
  subscriptionEndDate: string | null;
  joinedDate: string;
  bio?: string;
  location?: string;
  id?: string;
}

// Parse amount like "$50/month" to cents
function parseAmountToCents(amount: string): number {
  if (!amount || amount.trim() === '') return 5000; // Default for early_bird
  
  const match = amount.match(/\$(\d+)/);
  if (match) {
    return parseInt(match[1]) * 100; // Convert dollars to cents
  }
  return 5000; // Default
}

// Parse date from "Joined Jun 19, 2025" format
function parseJoinedDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const match = dateStr.match(/Joined\s+(\w+)\s+(\d+),\s+(\d+)/);
  if (match) {
    const monthStr = match[1];
    const day = parseInt(match[2]);
    const year = parseInt(match[3]);
    
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    if (months[monthStr] !== undefined) {
      return new Date(year, months[monthStr], day);
    }
  }
  return null;
}

// Calculate last payment date based on join date and current date
function calculateLastPaymentDate(joinDate: Date): Date {
  const today = new Date('2025-07-07'); // Current date from context
  const dayOfMonth = joinDate.getDate();
  
  // Create a date for this month with the same day
  const thisMonthPayment = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
  
  // If this month's payment date hasn't occurred yet, last payment was previous month
  if (thisMonthPayment > today) {
    thisMonthPayment.setMonth(thisMonthPayment.getMonth() - 1);
  }
  
  return thisMonthPayment;
}

// Parse renewal date and calculate subscription end date
function parseRenewalInfo(renewalStr: string, lastPaymentDate: Date): { 
  status: 'active' | 'cancelled' | 'churned',
  subscriptionEndDate: string | null 
} {
  if (!renewalStr) {
    return { status: 'active', subscriptionEndDate: null };
  }
  
  // Handle "Renews in X days"
  const renewMatch = renewalStr.match(/Renews in (\d+) days?/);
  if (renewMatch) {
    const daysUntilRenewal = parseInt(renewMatch[1]);
    const endDate = new Date('2025-07-07');
    endDate.setDate(endDate.getDate() + daysUntilRenewal);
    return { 
      status: 'active', 
      subscriptionEndDate: endDate.toISOString() 
    };
  }
  
  // Handle "Cancelled (churns in X days)"
  const cancelMatch = renewalStr.match(/Cancelled \(churns in (\d+) days?\)/);
  if (cancelMatch) {
    const daysUntilChurn = parseInt(cancelMatch[1]);
    const endDate = new Date('2025-07-07');
    endDate.setDate(endDate.getDate() + daysUntilChurn);
    return { 
      status: 'cancelled', 
      subscriptionEndDate: endDate.toISOString() 
    };
  }
  
  // Handle "Churned [Date]"
  const churnedMatch = renewalStr.match(/Churned (\w+) (\d+), (\d+)/);
  if (churnedMatch) {
    return { 
      status: 'churned', 
      subscriptionEndDate: new Date().toISOString() 
    };
  }
  
  // Default to active if we can't parse
  return { status: 'active', subscriptionEndDate: null };
}

async function main() {
  console.log('🔄 Transforming billing-actual.csv...\n');
  
  // Read the billing CSV
  const csvPath = path.join(process.cwd(), 'migration-data', 'billing-actual.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records: BillingRecord[] = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });
  
  console.log(`📊 Found ${records.length} billing records\n`);
  
  // Read the original member export to get IDs
  const memberExportPath = path.join(process.cwd(), 'migration-data', 'members-export-2025-07-07T16-56-26-534Z.json');
  const memberExport = JSON.parse(fs.readFileSync(memberExportPath, 'utf-8'));
  const membersByEmail = new Map(memberExport.members.map((m) => [m.email, m]));
  
  // Transform billing records
  const transformedMembers: TransformedMember[] = [];
  const activeMemberEmails = new Set<string>();
  
  for (const record of records) {
    activeMemberEmails.add(record.email);
    
    // Parse joined date
    let joinDate = parseJoinedDate(record.lastPaymentDate);
    
    // Special case for Guilherme
    if (record.email === 'guilherme1237@gmail.com') {
      joinDate = new Date('2025-05-15');
    }
    
    if (!joinDate) {
      console.warn(`⚠️  Could not parse join date for ${record.email}: ${record.lastPaymentDate}`);
      continue;
    }
    
    // Calculate last payment date
    const lastPaymentDate = calculateLastPaymentDate(joinDate);
    
    // Parse renewal info
    const { status, subscriptionEndDate } = parseRenewalInfo(record.renewalDate, lastPaymentDate);
    
    // Get original member data
    const originalMember = membersByEmail.get(record.email);
    
    const transformed: TransformedMember = {
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      tier: record.tier || 'early_bird',
      status: status,
      billingInterval: 'monthly', // All are monthly in the current data
      amountCents: parseAmountToCents(record.amountCents),
      lastPaymentDate: lastPaymentDate.toISOString(),
      subscriptionEndDate: subscriptionEndDate,
      joinedDate: joinDate.toISOString(),
      bio: record.bio || undefined,
      location: record.location || undefined,
      id: originalMember?.id,
    };
    
    transformedMembers.push(transformed);
  }
  
  // Identify churned members (those not in billing-actual.csv)
  const churnedMembers: TransformedMember[] = [];
  for (const member of memberExport.members) {
    if (!activeMemberEmails.has(member.email) && member.email) {
      churnedMembers.push({
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        tier: 'free',
        status: 'churned',
        billingInterval: null,
        amountCents: 0,
        lastPaymentDate: null,
        subscriptionEndDate: new Date().toISOString(),
        joinedDate: member.joinedDate,
        bio: member.bio || undefined,
        location: member.location || undefined,
        id: member.id,
      });
    }
  }
  
  // Combine all members
  const allMembers = [...transformedMembers, ...churnedMembers];
  
  // Define scholarship members
  const scholarshipEmails = [
    'me@parkerrex.com',           // Parker Rex
    '',                           // Bazel Shaw (no email in the members list)
    'rathiharivansh@gmail.com',   // Hari (Harivansh Rathi)
    'cdragobusiness@gmail.com',   // Chris Drago
    'jakenicholas.mgmt@gmail.com' // Jake Nicholas
  ];
  
  // Update scholarship members
  allMembers.forEach(member => {
    if (scholarshipEmails.includes(member.email) || 
        (member.firstName === 'Bazel' && member.lastName === 'Shaw')) {
      member.tier = 'scholarship';
      member.status = 'active';
      member.amountCents = 0;
      member.billingInterval = null;
      member.lastPaymentDate = null;
      member.subscriptionEndDate = null;
    }
  });
  
  // Summary statistics
  const summary = {
    total: allMembers.length,
    active: allMembers.filter(m => m.status === 'active').length,
    cancelled: allMembers.filter(m => m.status === 'cancelled').length,
    churned: allMembers.filter(m => m.status === 'churned').length,
    scholarship: allMembers.filter(m => m.tier === 'scholarship').length,
    byTier: {} as Record<string, number>,
  };
  
  allMembers.forEach(member => {
    summary.byTier[member.tier] = (summary.byTier[member.tier] || 0) + 1;
  });
  
  console.log('📊 Transformation Summary:');
  console.log(`Total members: ${summary.total}`);
  console.log(`  Active: ${summary.active}`);
  console.log(`  Cancelled: ${summary.cancelled}`);
  console.log(`  Churned: ${summary.churned}`);
  console.log(`  Scholarship: ${summary.scholarship}`);
  console.log('\nBy Tier:');
  Object.entries(summary.byTier).forEach(([tier, count]) => {
    console.log(`  ${tier}: ${count}`);
  });
  
  // Write the output
  const outputPath = path.join(process.cwd(), 'migration-data', 'members-billing-final.json');
  fs.writeFileSync(outputPath, JSON.stringify(allMembers, null, 2), 'utf-8');
  
  console.log(`\n✅ Final billing data saved to: ${outputPath}`);
  console.log('📌 This file is ready for the Convex migration!');
  
  // Also create a summary report
  const reportPath = path.join(process.cwd(), 'migration-data', 'billing-migration-report.json');
  const scholarshipMembers = allMembers.filter(m => m.tier === 'scholarship');
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    sampleActiveMembers: transformedMembers.slice(0, 5),
    sampleScholarshipMembers: scholarshipMembers,
    sampleChurnedMembers: churnedMembers.slice(0, 5),
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  
  console.log(`📄 Migration report saved to: ${reportPath}`);
}

main().catch(console.error);