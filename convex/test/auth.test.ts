/**
 * @fileoverview Authentication Helper Function Test Suite
 * 
 * This test suite validates the getAuthenticatedMember helper function which is critical
 * for user authentication and member management throughout the application. Tests cover:
 * - New user registration flow
 * - Existing user authentication
 * - Legacy member migration (adding externalId)
 * - Error handling for unauthenticated requests
 * - Edge cases like missing name fields
 * - Function idempotency guarantees
 * 
 * The getAuthenticatedMember function handles the complexity of Clerk integration,
 * member creation, and legacy data migration in a single unified interface.
 * 
 * @module convex/test/auth.test
 */

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";
import { getAuthenticatedMember } from "../auth";

/**
 * Test: New user registration and member creation
 * 
 * Validates that when a completely new user (not in database) authenticates,
 * the getAuthenticatedMember function automatically creates a new member record
 * with all required fields populated from the Clerk identity.
 * 
 * @test New User Registration Flow
 * @expects Member created with correct data from Clerk identity
 */
test("getAuthenticatedMember creates member for new user", async () => {
  // Initialize test environment with database schema
  const t = convexTest(schema);
  
  // Set up authentication identity for a completely new user
  // This simulates a user signing up for the first time
  const asNewUser = t.withIdentity({ 
    email: 'newuser@example.com',
    subject: 'clerk-user-123', // Clerk's unique identifier
    given_name: 'John', // First name from Clerk
    family_name: 'Doe' // Last name from Clerk
  });

  // Call the authentication helper - should create new member
  const member = await asNewUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx); // Should create and return new member
  });

  // Verify all member fields were populated correctly from Clerk identity
  expect(member.firstName).toBe('John'); // From given_name
  expect(member.lastName).toBe('Doe'); // From family_name
  expect(member.email).toBe('newuser@example.com'); // From email
  expect(member.externalId).toBe('clerk-user-123'); // From subject
  expect(member.status).toBe('active'); // Default status for new users
  expect(member.slug).toBe('john-doe'); // Auto-generated from name
  expect(member.joinedDate).toBeDefined(); // Should be set to current time
  expect(member.lastOnline).toBeDefined(); // Should be set to current time
  expect(member.updatedAt).toBeDefined(); // Should be set to current time
  expect(member.tier).toBeUndefined(); // New members have no tier
  expect(member.subscriptionStatus).toBe('none'); // Added required subscription status
  expect(member.stripeCustomerId).toMatch(/^cus_temp_.*_\d+$/); // Dynamic temp Stripe customer ID
});

/**
 * Test: Existing user authentication and lastOnline update
 * 
 * Validates that when an existing user authenticates, the function returns
 * their existing member record and updates the lastOnline timestamp.
 * This is the most common authentication scenario.
 * 
 * @test Existing User Authentication
 * @expects Existing member returned with updated lastOnline timestamp
 */
test("getAuthenticatedMember returns existing member and updates lastOnline", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Pre-create an existing member in the database
  // This simulates a user who has already signed up
  const existingMemberId = await t.run(async (ctx) => {
    return await ctx.db.insert('members', {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      externalId: 'clerk-user-456', // Already has Clerk integration
      status: 'active', // Upgraded from free status
      joinedDate: Date.now() - 86400000, // 1 day ago
      slug: 'jane-smith',
      updatedAt: Date.now() - 86400000, // 1 day ago
      lastOnline: Date.now() - 86400000, // 1 day ago (stale)
      tier: 'member', // Added required payment tier
      subscriptionStatus: 'active', // Added required subscription status
      stripeCustomerId: 'cus_test', // Dummy Stripe customer ID for tests
    });
  });

  // Set up authentication identity for the existing user
  const asExistingUser = t.withIdentity({ 
    email: 'jane@example.com',
    subject: 'clerk-user-456', // Matches existing member's externalId
    given_name: 'Jane',
    family_name: 'Smith'
  });

  // Capture time before authentication for timestamp validation
  const beforeTime = Date.now();
  
  // Call authentication helper - should return existing member
  const member = await asExistingUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx); // Should find and update existing member
  });

  // Verify the function returned the existing member record
  expect(member._id).toBe(existingMemberId); // Same database ID
  expect(member.firstName).toBe('Jane'); // Unchanged
  expect(member.lastName).toBe('Smith'); // Unchanged
  expect(member.email).toBe('jane@example.com'); // Unchanged
  expect(member.externalId).toBe('clerk-user-456'); // Unchanged
  
  // Verify activity timestamps were updated to reflect current login
  expect(member.lastOnline).toBeGreaterThanOrEqual(beforeTime); // Updated to current time
  expect(member.updatedAt).toBeGreaterThanOrEqual(beforeTime); // Updated to current time
  expect(member.tier).toBe('member'); // Added required payment tier
  expect(member.subscriptionStatus).toBe('active'); // Added required subscription status
  expect(member.stripeCustomerId).toBe('cus_test'); // Existing member keeps original ID
});

/**
 * Test: Legacy member migration and externalId patching
 * 
 * Validates the migration path for members who existed before Clerk integration.
 * These members have no externalId field and need to be patched when they
 * authenticate for the first time after the migration.
 * 
 * @test Legacy Data Migration
 * @expects Legacy member updated with externalId from Clerk
 */
test("getAuthenticatedMember patches legacy member with externalId", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Create a legacy member (pre-Clerk integration) without externalId
  // This simulates members from before Clerk was implemented
  const legacyMemberId = await t.run(async (ctx) => {
    return await ctx.db.insert('members', {
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob@example.com',
      // No externalId - this is a legacy member from pre-Clerk era
      status: 'active',
      joinedDate: Date.now() - 86400000, // Joined before Clerk integration
      slug: 'bob-wilson',
      updatedAt: Date.now() - 86400000,
      lastOnline: Date.now() - 86400000,
      tier: 'member', // Added required payment tier
      subscriptionStatus: 'active', // Added required subscription status
      stripeCustomerId: 'cus_test', // Dummy Stripe customer ID for tests
    });
  });

  // Set up Clerk authentication for the legacy user
  // This is their first login since Clerk was implemented
  const asLegacyUser = t.withIdentity({ 
    email: 'bob@example.com', // Matches existing member by email
    subject: 'clerk-user-789', // New Clerk ID to be added to member
    given_name: 'Bob',
    family_name: 'Wilson'
  });

  // Capture time for timestamp validation
  const beforeTime = Date.now();
  
  // Call authentication helper - should find by email and patch externalId
  const member = await asLegacyUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx); // Should migrate legacy member
  });

  // Verify the legacy member was found and successfully migrated
  expect(member._id).toBe(legacyMemberId); // Same database record
  expect(member.firstName).toBe('Bob'); // Unchanged
  expect(member.lastName).toBe('Wilson'); // Unchanged
  expect(member.email).toBe('bob@example.com'); // Unchanged
  expect(member.externalId).toBe('clerk-user-789'); // Now patched with Clerk ID
  
  // Verify activity timestamps were updated after migration
  expect(member.lastOnline).toBeGreaterThanOrEqual(beforeTime); // Updated
  expect(member.updatedAt).toBeGreaterThanOrEqual(beforeTime); // Updated
  expect(member.tier).toBe('member'); // Added required payment tier
  expect(member.subscriptionStatus).toBe('active'); // Added required subscription status
  expect(member.stripeCustomerId).toBe('cus_test'); // Existing member keeps original ID
});

/**
 * Test: Error handling for unauthenticated requests
 * 
 * Validates that the function properly handles and rejects requests
 * that don't have authentication context. This is a critical security
 * boundary that prevents unauthorized access.
 * 
 * @test Authentication Required Error
 * @expects ConvexError with "Authentication required" message
 */
test("getAuthenticatedMember throws error when no identity", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Attempt to call helper without any authentication context
  // This simulates an unauthenticated API request
  // Should throw authentication error immediately
  await expect(async () => {
    await t.run(async (ctx) => {
      return await getAuthenticatedMember(ctx); // No identity context
    });
  }).rejects.toThrow("Authentication required"); // Expected security error
});

/**
 * Test: Graceful handling of incomplete identity data
 * 
 * Validates that the function handles edge cases where Clerk identity
 * is missing optional fields like given_name or family_name. The function
 * should provide sensible defaults to prevent errors.
 * 
 * @test Incomplete Identity Data Handling
 * @expects Member created with fallback values for missing fields
 */
test("getAuthenticatedMember handles missing name gracefully", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Set up Clerk identity with minimal required fields only
  // This simulates edge cases in identity provider data
  const asMinimalUser = t.withIdentity({ 
    email: 'minimal@example.com',
    subject: 'clerk-user-minimal',
    // No given_name or family_name - edge case scenario
  });

  // Call helper with incomplete identity - should handle gracefully
  const member = await asMinimalUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx); // Should create member with defaults
  });

  // Verify member was created with sensible fallback values
  expect(member.firstName).toBe('User'); // Default fallback name
  expect(member.lastName).toBe(''); // Empty when not provided
  expect(member.email).toBe('minimal@example.com'); // From identity
  expect(member.externalId).toBe('clerk-user-minimal'); // From subject
  expect(member.slug).toBe('minimal'); // Derived from email prefix
  expect(member.tier).toBeUndefined(); // New members have no tier
  expect(member.subscriptionStatus).toBe('none'); // Added required subscription status
  expect(member.stripeCustomerId).toMatch(/^cus_temp_.*_\d+$/); // Dynamic temp Stripe customer ID
});

/**
 * Test: Internal mutation helper functionality
 * 
 * Validates that the underlying ensureMember mutation works correctly
 * and returns valid member data. This tests the internal implementation
 * that getAuthenticatedMember relies on.
 * 
 * @test Internal Mutation Helper
 * @expects Valid member ID and data structure returned
 */
test("ensureMember internal mutation returns member ID", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Set up standard test identity for internal mutation testing
  const asUser = t.withIdentity({ 
    email: 'test@example.com',
    subject: 'clerk-user-test',
    given_name: 'Test',
    family_name: 'User'
  });

  // Test the authentication helper that uses ensureMember internally
  const member = await asUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx); // Uses ensureMember internally
  });

  // Verify the internal mutation returned valid member data
  expect(member._id).toBeDefined(); // Valid database ID
  expect(typeof member._id).toBe('string'); // Convex ID format
  expect(member.email).toBe('test@example.com'); // Correct email
  expect(member.externalId).toBe('clerk-user-test'); // Correct Clerk ID
  expect(member.tier).toBeUndefined(); // New members have no tier
  expect(member.subscriptionStatus).toBe('none'); // Added required subscription status
  expect(member.stripeCustomerId).toMatch(/^cus_temp_.*_\d+$/); // Dynamic temp Stripe customer ID
});

/**
 * Test: Function idempotency guarantee
 * 
 * Validates that calling getAuthenticatedMember multiple times with the same
 * identity returns the same member record and doesn't create duplicates.
 * This is critical for preventing data corruption in concurrent scenarios.
 * 
 * @test Idempotency Guarantee
 * @expects Same member returned on multiple calls, no duplicates created
 */
test("getAuthenticatedMember is idempotent", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Set up test identity for idempotency testing
  const asUser = t.withIdentity({ 
    email: 'idempotent@example.com',
    subject: 'clerk-user-idempotent',
    given_name: 'Idempotent',
    family_name: 'User'
  });

  // Call the authentication helper multiple times with same identity
  const member1 = await asUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx); // First call - should create member
  });
  
  const member2 = await asUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx); // Second call - should return same member
  });

  // Verify both calls returned the exact same member record
  expect(member1._id).toBe(member2._id); // Same database ID
  
  // Verify no duplicate members were created in the database
  const allMembers = await t.run(async (ctx) => {
    return await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), "idempotent@example.com"))
      .collect(); // Query all members with this email
  });
  
  expect(allMembers).toHaveLength(1); // Only one member should exist
}); // End of authentication test suite