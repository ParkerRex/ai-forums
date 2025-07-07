/**
 * @fileoverview Admin Dashboard Test Suite
 * 
 * This test suite validates the admin dashboard functionality including:
 * - Access control for admin-only endpoints
 * - Comment report management and resolution
 * - Admin privilege validation
 * - Report lifecycle testing
 * 
 * The tests ensure that only users with admin role can access admin endpoints
 * and perform administrative actions like viewing and resolving comment reports.
 * 
 * @module convex/test/admin.test
 */

import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

/**
 * Test suite for Admin Dashboard functionality
 * 
 * Validates access control, report management, and administrative privileges
 * across the admin dashboard endpoints.
 */
describe("Admin Dashboard", () => {
  /**
   * Test: Admin access control for reported comments endpoint
   * 
   * Validates that regular users cannot access the getReportedComments endpoint
   * and that proper authorization is enforced at the API level.
   * 
   * @test Access Control
   * @expects Error with "Admin access required" message
   */
  test("getReportedComments requires admin access", async () => {
    // Initialize test environment with schema
    const t = convexTest(schema);

    // Create a regular user (non-admin) for testing access restrictions
    const userId = await t.run(async (ctx) => {
      // Insert a regular user with 'user' role (not admin)
      return await ctx.db.insert("members", {
        firstName: "Regular",
        lastName: "User",
        email: "user@example.com",
        status: "active",
        joinedDate: Date.now(),
        slug: "regular-user",
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        tier: "free", // Added required payment tier
        subscriptionStatus: "none", // Added required subscription status
        stripeCustomerId: "cus_test", // Dummy Stripe customer ID for tests
        externalId: `user_regular_${Date.now()}`,
        role: "user", // Explicitly set as regular user role
      });
    });

    // Attempt to access admin endpoint with regular user credentials
    // This should fail with an authorization error
    await expect(
      t.withIdentity({ 
        subject: `user_regular_${userId}`,
        email: "user@example.com"
      }).query(api.admin.getReportedComments, {})
    ).rejects.toThrow("Admin access required"); // Verify proper error message
  });

  /**
   * Test: Admin can view and resolve comment reports
   * 
   * Validates the complete report management workflow:
   * 1. Admin can retrieve reported comments
   * 2. Admin can resolve reports with appropriate actions
   * 3. Report status updates correctly after resolution
   * 
   * This test creates a full comment report scenario with admin resolution.
   * 
   * @test Report Management Workflow
   * @expects Successful report retrieval and resolution
   */
  test("admin can view and resolve reports", async () => {
    // Initialize test environment
    const t = convexTest(schema);

    // Create an admin user for testing administrative functions
    const adminId = await t.run(async (ctx) => {
      // Insert admin user with 'admin' role for privileged operations
      return await ctx.db.insert("members", {
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        status: "active",
        joinedDate: Date.now(),
        slug: "admin-user",
        updatedAt: Date.now(),
        lastOnline: Date.now(),
        tier: "free", // Added required payment tier
        subscriptionStatus: "none", // Added required subscription status
        stripeCustomerId: "cus_test", // Dummy Stripe customer ID for tests
        externalId: `user_admin_${Date.now()}`,
        role: "admin", // Critical: admin role for privileged access
      });
    });

    // Create a test category for organizing posts
    const categoryId = await t.run(async (ctx) => {
      // Insert category with admin as creator
      return await ctx.db.insert("categories", {
        name: "test-category",
        displayName: "Test Category",
        description: "Test category description",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        postCount: 0,
        status: "active",
        creatorId: adminId, // Admin creates the category
      });
    });

    // Create a test post that will contain the reported comment
    const postId = await t.run(async (ctx) => {
      // Insert post with standard properties for comment attachment
      return await ctx.db.insert("posts", {
        title: "Test Post",
        content: "Test content",
        slug: "test-post",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: adminId,
        categoryId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        commentCount: 0, // Will increment when comment is added
        viewCount: 0,
        type: "text", // Text-based post type
      });
    });

    // Create a comment that will be reported for testing
    const commentId = await t.run(async (ctx) => {
      // Insert comment with standard properties that will be reported
      return await ctx.db.insert("comments", {
        content: "Test comment",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        memberId: adminId,
        postId,
        status: "active",
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        depth: 0, // Top-level comment (not a reply)
        childCount: 0, // No nested replies
      });
    });

    // Create a comment report to test the admin resolution workflow
    const reportId = await t.run(async (ctx) => {
      // Insert comment report with 'pending' status for resolution testing
      return await ctx.db.insert("commentReports", {
        commentId,
        reporterId: adminId, // Admin reporting (for simplicity in testing)
        reason: "spam", // Common report reason
        status: "pending", // Initial status before admin resolution
        createdAt: Date.now(),
      });
    });

    // Test admin access to reported comments endpoint
    const reports = await t.withIdentity({ 
      subject: `user_admin_${adminId}`,
      email: "admin@example.com"
    }).query(api.admin.getReportedComments, {}); // Admin should have access

    // Verify admin can retrieve the reported comment
    expect(reports).toHaveLength(1);
    expect(reports[0]._id).toBe(reportId);

    // Test admin resolution of the report with delete action
    await t.withIdentity({ 
      subject: `user_admin_${adminId}`,
      email: "admin@example.com"
    }).mutation(api.admin.resolveReport, {
      reportId,
      action: "resolve", // Resolution action
      deleteComment: true, // Also delete the reported comment
    });

    // Verify the report status was updated after resolution
    const updatedReports = await t.withIdentity({ 
      subject: `user_admin_${adminId}`,
      email: "admin@example.com"
    }).query(api.admin.getReportedComments, {});

    // Confirm the report status changed from 'pending' to 'resolved'
    expect(updatedReports[0].status).toBe("resolved");
  }); // End of admin resolution test
}); // End of Admin Dashboard test suite
