#!/usr/bin/env bun

/**
 * Auth Rollback Script
 *
 * This script provides instructions and automated steps to rollback from custom auth
 * to Clerk authentication if needed.
 *
 * What it does:
 * 1. Displays current auth system status
 * 2. Provides step-by-step rollback instructions
 * 3. Optionally executes automated rollback steps
 * 4. Validates rollback completion
 *
 * IMPORTANT:
 * - All custom auth data is preserved (not deleted)
 * - Users who migrated can still use custom auth later
 * - This allows safe rollback with minimal data loss
 *
 * Usage:
 *   bun scripts/rollback-auth.ts [options]
 *
 * Options:
 *   --check             : Check current auth system status
 *   --instructions      : Show rollback instructions only
 *   --execute           : Execute automated rollback steps
 *   --validate          : Validate rollback completion
 *
 * Examples:
 *   bun scripts/rollback-auth.ts --check
 *   bun scripts/rollback-auth.ts --instructions
 *   bun scripts/rollback-auth.ts --execute
 */

import fs from 'fs';
import path from 'path';

interface RollbackStatus {
  currentAuthSystem: 'clerk' | 'custom' | 'unknown';
  customAuthEnabled: boolean;
  clerkEnvVarsPresent: boolean;
  customAuthDataExists: boolean;
  canRollback: boolean;
  warnings: string[];
}

// Check current auth system status
function checkAuthStatus(): RollbackStatus {
  const status: RollbackStatus = {
    currentAuthSystem: 'unknown',
    customAuthEnabled: false,
    clerkEnvVarsPresent: false,
    customAuthDataExists: false,
    canRollback: false,
    warnings: [],
  };

  // Check .env.local for custom auth flag
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');

    // Check custom auth flag
    const customAuthMatch = envContent.match(/NEXT_PUBLIC_USE_CUSTOM_AUTH\s*=\s*(.+)/);
    status.customAuthEnabled = customAuthMatch?.[1]?.trim() === 'true';

    // Check for Clerk env vars
    const hasClerkKey = envContent.includes('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
    const hasClerkSecret = envContent.includes('CLERK_SECRET_KEY');
    status.clerkEnvVarsPresent = hasClerkKey && hasClerkSecret;

    // Check for custom auth env vars
    const hasJwtSecret = envContent.includes('JWT_SECRET');
    status.customAuthDataExists = hasJwtSecret;
  }

  // Determine current auth system
  if (status.customAuthEnabled && status.customAuthDataExists) {
    status.currentAuthSystem = 'custom';
  } else if (!status.customAuthEnabled && status.clerkEnvVarsPresent) {
    status.currentAuthSystem = 'clerk';
  }

  // Determine if rollback is possible
  status.canRollback = status.currentAuthSystem === 'custom' && status.clerkEnvVarsPresent;

  // Add warnings
  if (!status.clerkEnvVarsPresent) {
    status.warnings.push('Clerk environment variables not found - cannot rollback to Clerk');
  }

  if (status.currentAuthSystem === 'clerk') {
    status.warnings.push('Already using Clerk authentication - no rollback needed');
  }

  if (status.currentAuthSystem === 'unknown') {
    status.warnings.push('Cannot determine current auth system');
  }

  return status;
}

// Display auth status
function displayStatus(): void {
  const status = checkAuthStatus();

  console.log('\n' + '='.repeat(60));
  console.log('🔍 AUTHENTICATION SYSTEM STATUS');
  console.log('='.repeat(60));

  console.log('\n📊 Current Status:');
  console.log(`   Auth System:           ${status.currentAuthSystem.toUpperCase()}`);
  console.log(`   Custom Auth Enabled:   ${status.customAuthEnabled ? 'YES' : 'NO'}`);
  console.log(`   Clerk Env Vars:        ${status.clerkEnvVarsPresent ? 'PRESENT' : 'MISSING'}`);
  console.log(`   Custom Auth Data:      ${status.customAuthDataExists ? 'EXISTS' : 'MISSING'}`);

  console.log('\n🔄 Rollback Status:');
  if (status.canRollback) {
    console.log(`   ✅ Rollback possible - Clerk credentials available`);
  } else {
    console.log(`   ❌ Cannot rollback`);
  }

  if (status.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    status.warnings.forEach((warning) => console.log(`   - ${warning}`));
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// Display rollback instructions
function displayInstructions(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📋 ROLLBACK INSTRUCTIONS: Custom Auth → Clerk');
  console.log('='.repeat(60));

  console.log('\n⏱️  ESTIMATED TIME: 30-60 minutes');

  console.log('\n📝 PREREQUISITES:');
  console.log('   ✓ Clerk account and credentials available');
  console.log('   ✓ Access to production environment variables');
  console.log('   ✓ Deployment access (Vercel/etc.)');
  console.log('   ✓ Database backup completed (optional but recommended)');

  console.log('\n🔧 STEP 1: Update Environment Variables');
  console.log('   1. Set NEXT_PUBLIC_USE_CUSTOM_AUTH=false in .env.local');
  console.log('   2. Ensure these Clerk vars are set:');
  console.log('      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  console.log('      - CLERK_SECRET_KEY');
  console.log('   3. Update production env vars (Vercel/etc.):');
  console.log('      vercel env add NEXT_PUBLIC_USE_CUSTOM_AUTH production');
  console.log('      # Set to: false');

  console.log('\n🔧 STEP 2: Restore Clerk Middleware (if modified)');
  console.log('   1. Open middleware.ts');
  console.log('   2. Ensure clerkMiddleware is active');
  console.log('   3. Disable custom JWT validation logic');
  console.log('   4. Restore original route protection');

  console.log('\n🔧 STEP 3: Restore Clerk Providers');
  console.log('   1. Open app/layout.tsx');
  console.log('   2. Restore <ClerkProvider>');
  console.log('   3. Replace custom AuthProvider with ClerkProvider');
  console.log('   4. Update ConvexProvider to use ConvexProviderWithClerk');

  console.log('\n🔧 STEP 4: Deploy Changes');
  console.log('   1. Commit changes: git add . && git commit -m "Rollback to Clerk auth"');
  console.log('   2. Push to main: git push origin main');
  console.log('   3. Wait for deployment to complete');
  console.log('   4. Monitor deployment logs for errors');

  console.log('\n🔧 STEP 5: Validate Rollback');
  console.log('   1. Test sign-in with Clerk credentials');
  console.log('   2. Verify user dashboard loads');
  console.log('   3. Check that protected routes work');
  console.log('   4. Monitor error logs for 1 hour');
  console.log('   5. Run: bun scripts/rollback-auth.ts --validate');

  console.log('\n🔧 STEP 6: Notify Users (if needed)');
  console.log('   1. If users migrated to custom auth, send notification');
  console.log('   2. Explain they should use Clerk sign-in');
  console.log('   3. Provide support contact for issues');

  console.log('\n💾 DATA PRESERVATION:');
  console.log('   ✓ All custom auth data is preserved');
  console.log('   ✓ Sessions table remains intact');
  console.log('   ✓ Password hashes stored (for future migration)');
  console.log('   ✓ Email verifications preserved');
  console.log('   ✓ Can switch back to custom auth later');

  console.log('\n⚠️  IMPORTANT NOTES:');
  console.log('   • Users who migrated will need to use Clerk sign-in');
  console.log('   • Custom auth sessions will be invalid');
  console.log('   • Clerk sessions will work immediately');
  console.log('   • No data is lost during rollback');
  console.log('   • Can re-enable custom auth anytime');

  console.log('\n🆘 ROLLBACK SUPPORT:');
  console.log('   • Documentation: docs/ROLLBACK_PLAN.md');
  console.log('   • Check status: bun scripts/rollback-auth.ts --check');
  console.log('   • Validate: bun scripts/rollback-auth.ts --validate');
  console.log('   • Team contact: [Add your support contact]');

  console.log('\n' + '='.repeat(60) + '\n');
}

// Execute automated rollback
function executeRollback(): void {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 EXECUTING AUTOMATED ROLLBACK');
  console.log('='.repeat(60));

  const status = checkAuthStatus();

  if (!status.canRollback) {
    console.log('\n❌ Cannot proceed with rollback:');
    status.warnings.forEach((warning) => console.log(`   - ${warning}`));
    console.log('\nPlease fix the issues above before proceeding.\n');
    return;
  }

  console.log('\n⚙️  Automated Steps:\n');

  // Step 1: Update .env.local
  console.log('1️⃣  Updating .env.local...');
  const envPath = path.join(process.cwd(), '.env.local');

  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Set custom auth to false
    if (envContent.includes('NEXT_PUBLIC_USE_CUSTOM_AUTH')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_USE_CUSTOM_AUTH\s*=\s*.+/,
        'NEXT_PUBLIC_USE_CUSTOM_AUTH=false'
      );
    } else {
      envContent += '\nNEXT_PUBLIC_USE_CUSTOM_AUTH=false\n';
    }

    // Backup original
    const backupPath = path.join(process.cwd(), '.env.local.backup');
    fs.copyFileSync(envPath, backupPath);
    console.log(`   ✅ Backed up .env.local to .env.local.backup`);

    // Write updated file
    fs.writeFileSync(envPath, envContent);
    console.log('   ✅ Set NEXT_PUBLIC_USE_CUSTOM_AUTH=false');
  }

  console.log('\n2️⃣  Rollback complete! Next steps:\n');
  console.log('   📝 Manual steps required:');
  console.log('      1. Review middleware.ts (restore Clerk middleware)');
  console.log('      2. Review app/layout.tsx (restore ClerkProvider)');
  console.log('      3. Test locally: npm run dev');
  console.log('      4. Deploy to production');
  console.log('      5. Run validation: bun scripts/rollback-auth.ts --validate');

  console.log('\n   💡 Tip: See full instructions:');
  console.log('      bun scripts/rollback-auth.ts --instructions\n');

  console.log('='.repeat(60) + '\n');
}

// Validate rollback
function validateRollback(): void {
  console.log('\n' + '='.repeat(60));
  console.log('✅ VALIDATING ROLLBACK');
  console.log('='.repeat(60));

  const status = checkAuthStatus();

  console.log('\n📊 Validation Results:\n');

  const checks = [
    {
      name: 'Custom auth disabled',
      pass: !status.customAuthEnabled,
      message: status.customAuthEnabled
        ? '❌ Custom auth is still enabled'
        : '✅ Custom auth is disabled',
    },
    {
      name: 'Clerk env vars present',
      pass: status.clerkEnvVarsPresent,
      message: status.clerkEnvVarsPresent
        ? '✅ Clerk credentials found'
        : '❌ Clerk credentials missing',
    },
    {
      name: 'Using Clerk auth',
      pass: status.currentAuthSystem === 'clerk',
      message:
        status.currentAuthSystem === 'clerk'
          ? '✅ Successfully rolled back to Clerk'
          : `❌ Current auth: ${status.currentAuthSystem}`,
    },
  ];

  checks.forEach((check) => {
    console.log(`   ${check.message}`);
  });

  const allPassed = checks.every((check) => check.pass);

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ROLLBACK SUCCESSFUL');
    console.log('\nNext steps:');
    console.log('   1. Test sign-in with Clerk credentials');
    console.log('   2. Verify protected routes work');
    console.log('   3. Monitor error logs');
  } else {
    console.log('⚠️  ROLLBACK INCOMPLETE');
    console.log('\nPlease complete manual steps:');
    console.log('   bun scripts/rollback-auth.ts --instructions');
  }
  console.log('='.repeat(60) + '\n');
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--check')) {
    displayStatus();
  } else if (args.includes('--instructions')) {
    displayInstructions();
  } else if (args.includes('--execute')) {
    executeRollback();
  } else if (args.includes('--validate')) {
    validateRollback();
  } else {
    // Default: show status and instructions
    console.log('\n📖 Auth Rollback Script\n');
    console.log('Usage:');
    console.log('  --check         : Check current auth status');
    console.log('  --instructions  : Show rollback instructions');
    console.log('  --execute       : Execute automated rollback');
    console.log('  --validate      : Validate rollback completion\n');

    displayStatus();

    console.log('💡 Tip: Run with --instructions to see full rollback guide\n');
  }
}

main();
