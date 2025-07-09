import * as fs from 'fs';
import * as path from 'path';

interface BillingMember {
  email: string;
  firstName: string;
  lastName: string;
  tier: string;
  status: string;
  billingInterval: string | null;
  amountCents: number;
  lastPaymentDate: string | null;
  subscriptionEndDate: string | null;
  joinedDate: string;
  bio?: string;
  location?: string;
  id?: string;
}

function validateBillingData() {
  console.log('🔍 Validating billing data...\n');
  
  const dataPath = path.join(process.cwd(), 'migration-data', 'members-billing-final.json');
  const members: BillingMember[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  const issues: string[] = [];
  const stats = {
    total: members.length,
    withId: 0,
    withoutId: 0,
    activeWithValidPayment: 0,
    activeWithoutPayment: 0,
    churnedWithPayment: 0,
    tiers: new Set<string>(),
    statuses: new Set<string>(),
  };
  
  // Validate each member
  members.forEach((member, index) => {
    // Check for ID
    if (member.id) {
      stats.withId++;
    } else {
      stats.withoutId++;
      if (member.status === 'active') {
        issues.push(`Member ${member.email} is active but has no ID`);
      }
    }
    
    // Validate payment data consistency
    if (member.status === 'active' || member.status === 'cancelled') {
      // Skip payment validation for scholarship members
      if (member.tier === 'scholarship') {
        if (member.amountCents !== 0) {
          issues.push(`Scholarship member ${member.email} should have amountCents: 0`);
        }
        if (member.lastPaymentDate) {
          issues.push(`Scholarship member ${member.email} should not have lastPaymentDate`);
        }
      } else {
        // Validate paying members
        if (!member.lastPaymentDate) {
          issues.push(`Member ${member.email} is ${member.status} but has no lastPaymentDate`);
          stats.activeWithoutPayment++;
        } else {
          stats.activeWithValidPayment++;
        }
        
        if (member.amountCents <= 0) {
          issues.push(`Member ${member.email} is ${member.status} but has amountCents: ${member.amountCents}`);
        }
        
        if (!member.billingInterval) {
          issues.push(`Member ${member.email} is ${member.status} but has no billingInterval`);
        }
      }
    }
    
    if (member.status === 'churned' && member.lastPaymentDate) {
      stats.churnedWithPayment++;
    }
    
    // Track tiers and statuses
    stats.tiers.add(member.tier);
    stats.statuses.add(member.status);
    
    // Validate dates
    if (member.lastPaymentDate) {
      const paymentDate = new Date(member.lastPaymentDate);
      const joinDate = new Date(member.joinedDate);
      
      if (paymentDate < joinDate) {
        issues.push(`Member ${member.email} has lastPaymentDate before joinedDate`);
      }
    }
  });
  
  // Display results
  console.log('📊 Validation Summary:');
  console.log(`Total members: ${stats.total}`);
  console.log(`  With ID: ${stats.withId}`);
  console.log(`  Without ID: ${stats.withoutId}`);
  console.log(`  Active with valid payment: ${stats.activeWithValidPayment}`);
  console.log(`  Active without payment: ${stats.activeWithoutPayment}`);
  console.log(`  Churned with payment history: ${stats.churnedWithPayment}`);
  console.log(`\nTiers found: ${Array.from(stats.tiers).join(', ')}`);
  console.log(`Statuses found: ${Array.from(stats.statuses).join(', ')}`);
  
  if (issues.length > 0) {
    console.log('\n⚠️  Issues found:');
    issues.slice(0, 10).forEach(issue => console.log(`  - ${issue}`));
    if (issues.length > 10) {
      console.log(`  ... and ${issues.length - 10} more issues`);
    }
  } else {
    console.log('\n✅ No validation issues found!');
  }
  
  // Check for specific members
  console.log('\n🔍 Spot checks:');
  const spotCheckEmails = [
    'aemaes@gmail.com',
    'me@parkerrex.com',
    'guilherme1237@gmail.com'
  ];
  
  spotCheckEmails.forEach(email => {
    const member = members.find(m => m.email === email);
    if (member) {
      console.log(`\n${email}:`);
      console.log(`  Status: ${member.status}`);
      console.log(`  Tier: ${member.tier}`);
      console.log(`  Amount: $${member.amountCents / 100}`);
      console.log(`  Last payment: ${member.lastPaymentDate || 'N/A'}`);
      console.log(`  Has ID: ${member.id ? 'Yes' : 'No'}`);
    } else {
      console.log(`\n${email}: NOT FOUND`);
    }
  });
  
  console.log('\n✅ Validation complete!');
}

validateBillingData();