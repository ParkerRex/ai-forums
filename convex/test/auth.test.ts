import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";
import { getAuthenticatedMember } from "../auth";

test("getAuthenticatedMember creates member for new user", async () => {
  const t = convexTest(schema);
  
  // Set up authentication with a new user
  const asNewUser = t.withIdentity({ 
    email: 'newuser@example.com',
    subject: 'clerk-user-123',
    given_name: 'John',
    family_name: 'Doe'
  });

  // Call the helper function
  const member = await asNewUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx);
  });

  // Verify member was created with correct data
  expect(member.firstName).toBe('John');
  expect(member.lastName).toBe('Doe');
  expect(member.email).toBe('newuser@example.com');
  expect(member.externalId).toBe('clerk-user-123');
  expect(member.status).toBe('free');
  expect(member.slug).toBe('john-doe');
  expect(member.joinedDate).toBeDefined();
  expect(member.lastOnline).toBeDefined();
  expect(member.updatedAt).toBeDefined();
});

test("getAuthenticatedMember returns existing member and updates lastOnline", async () => {
  const t = convexTest(schema);
  
  // Create an existing member with externalId
  const existingMemberId = await t.run(async (ctx) => {
    return await ctx.db.insert('members', {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      externalId: 'clerk-user-456',
      status: 'active',
      joinedDate: Date.now() - 86400000, // 1 day ago
      slug: 'jane-smith',
      updatedAt: Date.now() - 86400000,
      lastOnline: Date.now() - 86400000,
    });
  });

  const asExistingUser = t.withIdentity({ 
    email: 'jane@example.com',
    subject: 'clerk-user-456',
    given_name: 'Jane',
    family_name: 'Smith'
  });

  const beforeTime = Date.now();
  
  // Call the helper function
  const member = await asExistingUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx);
  });

  // Verify it's the same member
  expect(member._id).toBe(existingMemberId);
  expect(member.firstName).toBe('Jane');
  expect(member.lastName).toBe('Smith');
  expect(member.email).toBe('jane@example.com');
  expect(member.externalId).toBe('clerk-user-456');
  
  // Verify lastOnline was updated
  expect(member.lastOnline).toBeGreaterThanOrEqual(beforeTime);
  expect(member.updatedAt).toBeGreaterThanOrEqual(beforeTime);
});

test("getAuthenticatedMember patches legacy member with externalId", async () => {
  const t = convexTest(schema);
  
  // Create a legacy member without externalId
  const legacyMemberId = await t.run(async (ctx) => {
    return await ctx.db.insert('members', {
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob@example.com',
      // No externalId - this is a legacy member
      status: 'active',
      joinedDate: Date.now() - 86400000,
      slug: 'bob-wilson',
      updatedAt: Date.now() - 86400000,
      lastOnline: Date.now() - 86400000,
    });
  });

  const asLegacyUser = t.withIdentity({ 
    email: 'bob@example.com',
    subject: 'clerk-user-789',
    given_name: 'Bob',
    family_name: 'Wilson'
  });

  const beforeTime = Date.now();
  
  // Call the helper function
  const member = await asLegacyUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx);
  });

  // Verify it's the same member but now has externalId
  expect(member._id).toBe(legacyMemberId);
  expect(member.firstName).toBe('Bob');
  expect(member.lastName).toBe('Wilson');
  expect(member.email).toBe('bob@example.com');
  expect(member.externalId).toBe('clerk-user-789'); // Should be patched
  
  // Verify timestamps were updated
  expect(member.lastOnline).toBeGreaterThanOrEqual(beforeTime);
  expect(member.updatedAt).toBeGreaterThanOrEqual(beforeTime);
});

test("getAuthenticatedMember throws error when no identity", async () => {
  const t = convexTest(schema);
  
  // Call without authentication
  await expect(async () => {
    await t.run(async (ctx) => {
      return await getAuthenticatedMember(ctx);
    });
  }).rejects.toThrow("Authentication required");
});

test("getAuthenticatedMember handles missing name gracefully", async () => {
  const t = convexTest(schema);
  
  // Set up authentication with minimal identity data
  const asMinimalUser = t.withIdentity({ 
    email: 'minimal@example.com',
    subject: 'clerk-user-minimal',
    // No given_name or family_name
  });

  // Call the helper function
  const member = await asMinimalUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx);
  });

  // Verify member was created with fallback values
  expect(member.firstName).toBe('User');
  expect(member.lastName).toBe('');
  expect(member.email).toBe('minimal@example.com');
  expect(member.externalId).toBe('clerk-user-minimal');
  expect(member.slug).toBe('minimal'); // Should derive from email
});

test("ensureMember internal mutation returns member ID", async () => {
  const t = convexTest(schema);
  
  const asUser = t.withIdentity({ 
    email: 'test@example.com',
    subject: 'clerk-user-test',
    given_name: 'Test',
    family_name: 'User'
  });

  // Test the helper function which ensureMember uses
  const member = await asUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx);
  });

  // Verify we got a valid member
  expect(member._id).toBeDefined();
  expect(typeof member._id).toBe('string');
  expect(member.email).toBe('test@example.com');
  expect(member.externalId).toBe('clerk-user-test');
});

test("getAuthenticatedMember is idempotent", async () => {
  const t = convexTest(schema);
  
  const asUser = t.withIdentity({ 
    email: 'idempotent@example.com',
    subject: 'clerk-user-idempotent',
    given_name: 'Idempotent',
    family_name: 'User'
  });

  // Call getAuthenticatedMember twice
  const member1 = await asUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx);
  });
  
  const member2 = await asUser.run(async (ctx) => {
    return await getAuthenticatedMember(ctx);
  });

  // Should return the same member ID both times
  expect(member1._id).toBe(member2._id);
  
  // Verify only one member was created
  const allMembers = await t.run(async (ctx) => {
    return await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), "idempotent@example.com"))
      .collect();
  });
  
  expect(allMembers).toHaveLength(1);
}); 