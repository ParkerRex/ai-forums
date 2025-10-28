#!/usr/bin/env bun

/**
 * Migration Planning Script
 *
 * This script analyzes all Clerk users in the database and creates a migration plan.
 *
 * What it does:
 * 1. Queries all members with externalId (Clerk users)
 * 2. Counts total users to migrate
 * 3. Estimates batches (1000 per batch for rate limiting)
 * 4. Generates CSV report with: memberId, email, clerkId, migrationStatus
 * 5. Outputs summary statistics
 *
 * Usage:
 *   bun scripts/plan-migration.ts
 *
 * Output:
 *   - migration-data/migration-plan.csv: Full list of users to migrate
 *   - migration-data/migration-summary.json: Summary statistics
 *   - Console: Summary report
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import fs from 'fs';
import path from 'path';

// Initialize Convex client
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error('❌ Error: NEXT_PUBLIC_CONVEX_URL not set');
  console.error('Please set NEXT_PUBLIC_CONVEX_URL in your .env.local file');
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

interface MemberToMigrate {
  _id: string;
  email: string;
  externalId: string;
  firstName: string;
  lastName: string;
  emailVerified?: boolean;
  status: 'active' | 'cancelled' | 'churned' | 'duplicate';
}

interface MigrationPlan {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  batches: number;
  batchSize: number;
  estimatedTimeHours: number;
  usersToMigrate: Array<{
    memberId: string;
    email: string;
    clerkId: string;
    firstName: string;
    lastName: string;
    status: string;
    emailVerified: boolean;
    migrationStatus: 'pending' | 'skipped';
  }>;
}

async function planMigration(): Promise<MigrationPlan> {
  console.log('🔍 Analyzing Clerk users in database...\n');

  // Query all members with externalId (Clerk users)
  // Note: This assumes there's a query to get all members
  // We'll use a simple approach since we don't have the exact query structure
  const allMembers = await client.query(api.members.getAllMembers as any).catch((error: Error) => {
    console.error('❌ Error querying members:', error.message);
    console.error('\nNote: This script requires a query to fetch all members.');
    console.error('You may need to create a query in convex/members.ts:');
    console.error('  export const getAllMembers = query({\n    args: {},\n    handler: async (ctx) => {\n      return await ctx.db.query("members").collect();\n    },\n  });');
    process.exit(1);
  });

  // Filter members with externalId (Clerk users)
  const clerkUsers = allMembers.filter((member: any) => member.externalId);

  console.log(`📊 Found ${clerkUsers.length} Clerk users`);

  if (clerkUsers.length === 0) {
    console.log('\n✅ No Clerk users found - migration not needed');
    return {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      verifiedUsers: 0,
      unverifiedUsers: 0,
      batches: 0,
      batchSize: 1000,
      estimatedTimeHours: 0,
      usersToMigrate: [],
    };
  }

  // Analyze users
  const usersToMigrate = clerkUsers.map((member: MemberToMigrate) => {
    const isActive = member.status === 'active';
    const emailVerified = member.emailVerified ?? true; // Assume verified if not set

    return {
      memberId: member._id,
      email: member.email,
      clerkId: member.externalId,
      firstName: member.firstName,
      lastName: member.lastName,
      status: member.status,
      emailVerified,
      migrationStatus: isActive ? ('pending' as const) : ('skipped' as const),
    };
  });

  // Calculate statistics
  const activeUsers = usersToMigrate.filter((u) => u.status === 'active').length;
  const inactiveUsers = usersToMigrate.length - activeUsers;
  const verifiedUsers = usersToMigrate.filter((u) => u.emailVerified).length;
  const unverifiedUsers = usersToMigrate.length - verifiedUsers;

  const batchSize = 1000;
  const batches = Math.ceil(activeUsers / batchSize);

  // Estimate time: 1000 emails per hour (Resend rate limit)
  // Add 20% buffer for processing time
  const estimatedTimeHours = Math.ceil((activeUsers / 1000) * 1.2);

  return {
    totalUsers: clerkUsers.length,
    activeUsers,
    inactiveUsers,
    verifiedUsers,
    unverifiedUsers,
    batches,
    batchSize,
    estimatedTimeHours,
    usersToMigrate,
  };
}

function generateCSV(plan: MigrationPlan): string {
  const header = 'memberId,email,clerkId,firstName,lastName,status,emailVerified,migrationStatus\n';

  const rows = plan.usersToMigrate
    .map(
      (user) =>
        `${user.memberId},"${user.email}","${user.clerkId}","${user.firstName}","${user.lastName}",${user.status},${user.emailVerified},${user.migrationStatus}`
    )
    .join('\n');

  return header + rows;
}

function saveMigrationPlan(plan: MigrationPlan): void {
  // Create migration-data directory
  const dataDir = path.join(process.cwd(), 'migration-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Save CSV
  const csvPath = path.join(dataDir, 'migration-plan.csv');
  const csv = generateCSV(plan);
  fs.writeFileSync(csvPath, csv);
  console.log(`\n✅ CSV report saved: ${csvPath}`);

  // Save JSON summary
  const summaryPath = path.join(dataDir, 'migration-summary.json');
  const summary = {
    generatedAt: new Date().toISOString(),
    totalUsers: plan.totalUsers,
    activeUsers: plan.activeUsers,
    inactiveUsers: plan.inactiveUsers,
    verifiedUsers: plan.verifiedUsers,
    unverifiedUsers: plan.unverifiedUsers,
    batches: plan.batches,
    batchSize: plan.batchSize,
    estimatedTimeHours: plan.estimatedTimeHours,
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`✅ Summary saved: ${summaryPath}`);
}

function printSummary(plan: MigrationPlan): void {
  console.log('\n' + '='.repeat(60));
  console.log('📋 MIGRATION PLAN SUMMARY');
  console.log('='.repeat(60));

  console.log('\n📊 USER STATISTICS:');
  console.log(`   Total Clerk users:     ${plan.totalUsers.toLocaleString()}`);
  console.log(`   Active users:          ${plan.activeUsers.toLocaleString()} (will migrate)`);
  console.log(`   Inactive users:        ${plan.inactiveUsers.toLocaleString()} (will skip)`);
  console.log(`   Email verified:        ${plan.verifiedUsers.toLocaleString()}`);
  console.log(`   Email unverified:      ${plan.unverifiedUsers.toLocaleString()}`);

  console.log('\n🚀 MIGRATION PLAN:');
  console.log(`   Number of batches:     ${plan.batches}`);
  console.log(`   Batch size:            ${plan.batchSize.toLocaleString()} emails`);
  console.log(`   Estimated time:        ${plan.estimatedTimeHours} hours`);
  console.log(`   Rate limit:            1,000 emails/hour (Resend)`);

  console.log('\n📅 RECOMMENDED SCHEDULE:');
  if (plan.batches === 0) {
    console.log('   No migration needed');
  } else if (plan.batches === 1) {
    console.log('   Day 1: Send all migration emails (single batch)');
  } else if (plan.batches <= 5) {
    console.log('   Day 1: Send all batches (within rate limit)');
  } else {
    console.log(`   Day 1: Send first ${Math.min(5, plan.batches)} batches`);
    if (plan.batches > 5) {
      console.log(`   Day 2: Send remaining ${plan.batches - 5} batches`);
    }
  }
  console.log('   Day 3: Send reminder emails to unmigrated users');
  console.log('   Day 5: Send second reminder');
  console.log('   Day 6: Send final reminder (24h deadline)');
  console.log('   Day 7: Flip feature flag, force migration on login');

  console.log('\n⚠️  IMPORTANT NOTES:');
  console.log('   • Inactive users will NOT receive migration emails');
  console.log('   • Users must complete migration within 7 days');
  console.log('   • Unmigrated users will be forced to reset password on next login');
  console.log('   • Monitor migration dashboard daily');
  console.log('   • Have support team ready for tickets');

  console.log('\n📁 OUTPUT FILES:');
  console.log('   migration-data/migration-plan.csv     - Full user list');
  console.log('   migration-data/migration-summary.json - Summary stats');

  console.log('\n🔜 NEXT STEPS:');
  console.log('   1. Review the CSV file: cat migration-data/migration-plan.csv');
  console.log('   2. Test migration script on staging');
  console.log('   3. Run: bun scripts/execute-migration.ts --dry-run');
  console.log('   4. When ready: bun scripts/execute-migration.ts');

  console.log('\n' + '='.repeat(60) + '\n');
}

// Main execution
async function main() {
  try {
    const plan = await planMigration();
    saveMigrationPlan(plan);
    printSummary(plan);

    console.log('✅ Migration planning complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration planning failed:', error);
    process.exit(1);
  }
}

main();
