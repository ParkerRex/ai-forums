import * as fs from 'fs';
import * as path from 'path';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  joinedDate: string;
  // other fields...
}

interface ExportData {
  exportDate: string;
  totalMembers: number;
  members: Member[];
}

// Read the exported members data
const exportPath = path.join(process.cwd(), 'migration-data', 'members-export-2025-07-07T16-56-26-534Z.json');
const exportData: ExportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

// Generate CSV template for manual billing data entry
const csvHeader = 'email,firstName,lastName,bio,location,country,websiteUrl,linkedinUrl,linkGithub,linkX,linkYouTube,skills,tier,status,billingInterval,amountCents,lastPaymentDate,notes\n';

const csvRows = exportData.members.map((member) => {
  // Pre-fill known data and leave billing fields empty for manual entry
  return [
    member.email,
    member.firstName,
    member.lastName,
    member.bio || '', // bio
    member.location || '', // location
    member.country || '', // country
    member.websiteUrl || '', // websiteUrl
    member.linkedinUrl || '', // linkedinUrl
    member.linkGithub || '', // linkGithub
    member.linkX || '', // linkX (Twitter)
    member.linkYouTube || '', // linkYouTube
    (member.skills || []).join(';'), // skills (semicolon-separated)
    '', // tier (free, founding_member, early_bird, member)
    '', // status (active, cancelled, churned)
    '', // billingInterval (monthly, yearly, or empty for free)
    '', // amountCents (e.g., 5000 for $50.00)
    '', // lastPaymentDate (ISO date format)
    '' // notes
  ].map(field => `"${field || ''}"`).join(',');
}).join('\n');

const csvContent = csvHeader + csvRows;

// Write CSV template
const csvPath = path.join(process.cwd(), 'migration-data', 'billing-template.csv');
fs.writeFileSync(csvPath, csvContent, 'utf-8');

console.log(`✅ Generated billing template at: ${csvPath}`);
console.log(`📊 Total members to process: ${exportData.members.length}`);
console.log('\n📝 Instructions:');
console.log('1. Open the CSV file in Excel or Google Sheets');
console.log('2. Fill in or update the following information:');
console.log('   Profile fields:');
console.log('   - bio: Member biography/description');
console.log('   - location: Geographic location');
console.log('   - country: Country');
console.log('   - websiteUrl: Personal website URL');
console.log('   - linkedinUrl: LinkedIn profile URL');
console.log('   - linkGithub: GitHub profile URL');
console.log('   - linkX: X/Twitter profile URL');
console.log('   - linkYouTube: YouTube channel URL');
console.log('   - skills: Technical skills (use semicolons to separate multiple skills)');
console.log('   ');
console.log('   Billing fields:');
console.log('   - tier: free, founding_member, early_bird, or member');
console.log('   - status: active, cancelled, or churned');
console.log('   - billingInterval: monthly, yearly (leave empty for free tier)');
console.log('   - amountCents: amount in cents (e.g., 5000 = $50.00)');
console.log('   - lastPaymentDate: ISO date format (e.g., 2025-01-07T00:00:00Z)');
console.log('3. Save the file when done');
console.log('4. Run npm run billing:transform to generate the final JSON');

// Also create a simpler JSON template for those who prefer JSON
const jsonTemplate = {
  members: exportData.members.map((member) => ({
    email: member.email,
    firstName: member.firstName,
    lastName: member.lastName,
    joinedDate: member.joinedDate,
    // Profile fields
    bio: member.bio || '',
    location: member.location || '',
    country: member.country || '',
    websiteUrl: member.websiteUrl || '',
    linkedinUrl: member.linkedinUrl || '',
    linkGithub: member.linkGithub || '',
    linkX: member.linkX || '',
    linkYouTube: member.linkYouTube || '',
    skills: member.skills || [],
    // Billing fields to be filled manually
    tier: '', // free, founding_member, early_bird, or member
    status: '', // active, cancelled, or churned
    billingInterval: '', // monthly or yearly (empty for free)
    amountCents: 0, // e.g., 5000 for $50.00
    lastPaymentDate: '', // ISO date format
  }))
};

const jsonPath = path.join(process.cwd(), 'migration-data', 'billing-template.json');
fs.writeFileSync(jsonPath, JSON.stringify(jsonTemplate, null, 2), 'utf-8');

console.log(`\n✅ Also generated JSON template at: ${jsonPath}`);