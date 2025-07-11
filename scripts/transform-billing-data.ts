import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

interface BillingMember {
  email: string;
  tier: string;
  status: string;
  billingInterval: string | null;
  amountCents: number;
  lastPaymentDate: string | null;
  joinedDate: string;
  // Profile fields
  bio?: string;
  location?: string;
  country?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  linkGithub?: string;
  linkX?: string;
  linkYouTube?: string;
  skills?: string[];
}

// Function to transform CSV data
function transformFromCSV(): BillingMember[] | null {
  const csvPath = path.join(process.cwd(), 'migration-data', 'billing-template.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ billing-template.csv not found. Please run generate-billing-template first.');
    return null;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  return records
    .filter((record) => record.tier && record.tier !== '') // Only include members with billing data
    .map((record): BillingMember => ({
      email: record.email,
      tier: record.tier,
      status: record.status || 'active',
      billingInterval: record.billingInterval || null,
      amountCents: parseInt(record.amountCents) || 0,
      lastPaymentDate: record.lastPaymentDate || null,
      joinedDate: record.joinedDate || new Date().toISOString(),
      // Profile fields
      bio: record.bio || undefined,
      location: record.location || undefined,
      country: record.country || undefined,
      websiteUrl: record.websiteUrl || undefined,
      linkedinUrl: record.linkedinUrl || undefined,
      linkGithub: record.linkGithub || undefined,
      linkX: record.linkX || undefined,
      linkYouTube: record.linkYouTube || undefined,
      skills: record.skills ? record.skills.split(';').map((s: string) => s.trim()).filter((s: string) => s) : undefined,
    }));
}

// Function to transform JSON data
function transformFromJSON(): BillingMember[] | null {
  const jsonPath = path.join(process.cwd(), 'migration-data', 'billing-template.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ billing-template.json not found. Please run generate-billing-template first.');
    return null;
  }

  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  
  return jsonData.members
    .filter((member) => member.tier && member.tier !== '') // Only include members with billing data
    .map((member): BillingMember => ({
      email: member.email,
      tier: member.tier,
      status: member.status || 'active',
      billingInterval: member.billingInterval || null,
      amountCents: member.amountCents || 0,
      lastPaymentDate: member.lastPaymentDate || null,
      joinedDate: member.joinedDate || new Date().toISOString(),
      // Profile fields
      bio: member.bio || undefined,
      location: member.location || undefined,
      country: member.country || undefined,
      websiteUrl: member.websiteUrl || undefined,
      linkedinUrl: member.linkedinUrl || undefined,
      linkGithub: member.linkGithub || undefined,
      linkX: member.linkX || undefined,
      linkYouTube: member.linkYouTube || undefined,
      skills: member.skills && member.skills.length > 0 ? member.skills : undefined,
    }));
}

// Main transformation logic
async function main() {
  console.log('🔄 Transforming billing data...\n');

  // Try CSV first, then JSON
  let transformedData = transformFromCSV();
  
  if (!transformedData) {
    console.log('📋 CSV not found, trying JSON template...');
    transformedData = transformFromJSON();
  }

  if (!transformedData) {
    console.error('❌ No billing template found. Please run generate-billing-template first.');
    process.exit(1);
  }

  // Validate and summarize the data
  const summary = {
    total: transformedData.length,
    byTier: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    byInterval: {} as Record<string, number>,
  };

  transformedData.forEach((member) => {
    // Count by tier
    summary.byTier[member.tier] = (summary.byTier[member.tier] || 0) + 1;
    
    // Count by status
    summary.byStatus[member.status] = (summary.byStatus[member.status] || 0) + 1;
    
    // Count by billing interval
    if (member.billingInterval) {
      summary.byInterval[member.billingInterval] = (summary.byInterval[member.billingInterval] || 0) + 1;
    }
  });

  console.log('📊 Data Summary:');
  console.log(`Total members with billing data: ${summary.total}`);
  console.log('\nBy Tier:');
  Object.entries(summary.byTier).forEach(([tier, count]) => {
    console.log(`  ${tier}: ${count}`);
  });
  console.log('\nBy Status:');
  Object.entries(summary.byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  console.log('\nBy Billing Interval:');
  Object.entries(summary.byInterval).forEach(([interval, count]) => {
    console.log(`  ${interval}: ${count}`);
  });

  // Write the transformed data
  const outputPath = path.join(process.cwd(), 'migration-data', 'members-billing-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(transformedData, null, 2), 'utf-8');

  console.log(`\n✅ Transformed data saved to: ${outputPath}`);
  console.log('📌 This file is ready to be used for the Convex migration script.');
  console.log('\n📝 The output includes:');
  console.log('   - Billing information (tier, status, amounts)');
  console.log('   - Profile information (bio, location, social links, skills)');
}

// Run the transformation
main().catch(console.error);