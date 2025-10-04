/**
 * @fileoverview Authentication Monitoring & Metrics
 *
 * This module provides real-time monitoring and metrics for the authentication system.
 * Used for tracking sign-up/sign-in success rates, email delivery, performance, and issues.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get authentication metrics for monitoring dashboard
 *
 * Returns real-time metrics for sign-up, sign-in, email delivery, and security events.
 */
export const getAuthMetrics = query({
  args: {
    timeRange: v.optional(
      v.union(
        v.literal("1h"),
        v.literal("24h"),
        v.literal("7d"),
        v.literal("30d")
      )
    ),
  },
  returns: v.object({
    timeRange: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    signUpMetrics: v.object({
      total: v.number(),
      verified: v.number(),
      unverified: v.number(),
      successRate: v.number(),
    }),
    signInMetrics: v.object({
      attempts: v.number(),
      successful: v.number(),
      failed: v.number(),
      locked: v.number(),
      successRate: v.number(),
    }),
    emailMetrics: v.object({
      verificationsSent: v.number(),
      verificationsCompleted: v.number(),
      passwordResetsSent: v.number(),
      passwordResetsCompleted: v.number(),
      deliveryRate: v.number(),
    }),
    securityMetrics: v.object({
      rateLimitHits: v.number(),
      accountLockouts: v.number(),
      failedAttempts: v.number(),
      suspiciousActivity: v.number(),
    }),
    performanceMetrics: v.object({
      avgSignUpTime: v.number(),
      avgSignInTime: v.number(),
      p95SignInTime: v.number(),
      activeSessions: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const timeRange = args.timeRange || "24h";

    // Calculate time range
    const timeRanges: Record<string, number> = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };

    const startTime = now - timeRanges[timeRange];
    const endTime = now;

    // Sign-up metrics
    const recentMembers = await ctx.db
      .query("members")
      .filter((q) => q.gte(q.field("_creationTime"), startTime))
      .collect();

    const verifiedMembers = recentMembers.filter((m) => m.emailVerified);
    const signUpTotal = recentMembers.length;
    const signUpVerified = verifiedMembers.length;

    // Sign-in metrics (estimate from sessions created)
    const recentSessions = await ctx.db
      .query("sessions")
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    const signInAttempts = recentSessions.length; // Each session = successful sign-in

    // Failed attempts (from members with failed login attempts)
    const membersWithFailures = await ctx.db
      .query("members")
      .filter((q) => q.gt(q.field("failedLoginAttempts"), 0))
      .collect();

    const totalFailedAttempts = membersWithFailures.reduce(
      (sum, m) => sum + (m.failedLoginAttempts || 0),
      0
    );

    // Locked accounts
    const lockedAccounts = await ctx.db
      .query("members")
      .filter((q) => q.gt(q.field("lockedUntil"), now))
      .collect();

    // Email metrics
    const emailVerifications = await ctx.db
      .query("email_verifications")
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    const completedVerifications = emailVerifications.filter((e) => e.verifiedAt);

    const passwordResets = await ctx.db
      .query("password_resets")
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    const completedResets = passwordResets.filter((r) => r.usedAt);

    // Rate limiting metrics
    const rateLimits = await ctx.db
      .query("rate_limits")
      .filter((q) => q.gte(q.field("firstAttemptAt"), startTime))
      .collect();

    // Count rate limit violations (using common threshold of 5 attempts)
    const DEFAULT_MAX_ATTEMPTS = 5;
    const rateLimitHits = rateLimits.filter(
      (r) => r.attempts >= DEFAULT_MAX_ATTEMPTS
    ).length;

    // Performance metrics (estimate - would need actual timing data in production)
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expiresAt")
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    // Calculate rates
    const signUpSuccessRate =
      signUpTotal > 0 ? (signUpVerified / signUpTotal) * 100 : 0;

    const signInSuccessRate =
      signInAttempts + totalFailedAttempts > 0
        ? (signInAttempts / (signInAttempts + totalFailedAttempts)) * 100
        : 0;

    const emailDeliveryRate =
      emailVerifications.length > 0
        ? (completedVerifications.length / emailVerifications.length) * 100
        : 0;

    return {
      timeRange,
      startTime,
      endTime,
      signUpMetrics: {
        total: signUpTotal,
        verified: signUpVerified,
        unverified: signUpTotal - signUpVerified,
        successRate: Math.round(signUpSuccessRate * 100) / 100,
      },
      signInMetrics: {
        attempts: signInAttempts + totalFailedAttempts,
        successful: signInAttempts,
        failed: totalFailedAttempts,
        locked: lockedAccounts.length,
        successRate: Math.round(signInSuccessRate * 100) / 100,
      },
      emailMetrics: {
        verificationsSent: emailVerifications.length,
        verificationsCompleted: completedVerifications.length,
        passwordResetsSent: passwordResets.length,
        passwordResetsCompleted: completedResets.length,
        deliveryRate: Math.round(emailDeliveryRate * 100) / 100,
      },
      securityMetrics: {
        rateLimitHits,
        accountLockouts: lockedAccounts.length,
        failedAttempts: totalFailedAttempts,
        suspiciousActivity: rateLimitHits + lockedAccounts.length,
      },
      performanceMetrics: {
        avgSignUpTime: 0, // Would need timing instrumentation
        avgSignInTime: 0, // Would need timing instrumentation
        p95SignInTime: 0, // Would need timing instrumentation
        activeSessions: activeSessions.length,
      },
    };
  },
});

/**
 * Get recent authentication events for audit log
 */
export const getAuthEvents = query({
  args: {
    limit: v.optional(v.number()),
    eventType: v.optional(
      v.union(
        v.literal("signup"),
        v.literal("signin"),
        v.literal("signout"),
        v.literal("verify_email"),
        v.literal("reset_password"),
        v.literal("rate_limit"),
        v.literal("lockout")
      )
    ),
  },
  returns: v.array(
    v.object({
      timestamp: v.number(),
      eventType: v.string(),
      memberId: v.optional(v.id("members")),
      email: v.optional(v.string()),
      success: v.boolean(),
      details: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    const events: any[] = [];

    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;

    // Get recent sessions (sign-ins)
    if (!args.eventType || args.eventType === "signin") {
      const sessions = await ctx.db
        .query("sessions")
        .filter((q) => q.gte(q.field("createdAt"), last24h))
        .order("desc")
        .take(limit);

      for (const session of sessions) {
        const member = await ctx.db.get(session.memberId);
        events.push({
          timestamp: session.createdAt,
          eventType: "signin",
          memberId: session.memberId,
          email: member?.email,
          success: true,
          details: "User signed in successfully",
        });
      }
    }

    // Get recent verifications
    if (!args.eventType || args.eventType === "verify_email") {
      const verifications = await ctx.db
        .query("email_verifications")
        .filter((q) => q.gte(q.field("createdAt"), last24h))
        .order("desc")
        .take(limit);

      for (const verification of verifications) {
        events.push({
          timestamp: verification.createdAt,
          eventType: "verify_email",
          memberId: verification.memberId,
          email: verification.email,
          success: !!verification.verifiedAt,
          details: verification.verifiedAt
            ? "Email verified"
            : "Verification pending",
        });
      }
    }

    // Get recent password resets
    if (!args.eventType || args.eventType === "reset_password") {
      const resets = await ctx.db
        .query("password_resets")
        .filter((q) => q.gte(q.field("createdAt"), last24h))
        .order("desc")
        .take(limit);

      for (const reset of resets) {
        const member = await ctx.db.get(reset.memberId);
        events.push({
          timestamp: reset.createdAt,
          eventType: "reset_password",
          memberId: reset.memberId,
          email: member?.email,
          success: !!reset.usedAt,
          details: reset.usedAt ? "Password reset" : "Reset pending",
        });
      }
    }

    // Get rate limit hits
    if (!args.eventType || args.eventType === "rate_limit") {
      const rateLimits = await ctx.db
        .query("rate_limits")
        .filter((q) => q.gte(q.field("firstAttemptAt"), last24h))
        .order("desc")
        .take(limit);

      for (const rateLimit of rateLimits) {
        if (rateLimit.attempts >= rateLimit.maxAttempts) {
          events.push({
            timestamp: rateLimit.firstAttemptAt,
            eventType: "rate_limit",
            email: rateLimit.key.split(":")[1], // Extract email from key
            success: false,
            details: `Rate limit exceeded: ${rateLimit.attempts} attempts`,
          });
        }
      }
    }

    // Get locked accounts
    if (!args.eventType || args.eventType === "lockout") {
      const lockedMembers = await ctx.db
        .query("members")
        .filter((q) => q.gt(q.field("lockedUntil"), now))
        .collect();

      for (const member of lockedMembers) {
        if (member.lockedUntil && member.lockedUntil > last24h) {
          events.push({
            timestamp: member.lockedUntil - 60 * 60 * 1000, // Estimate lockout time
            eventType: "lockout",
            memberId: member._id,
            email: member.email,
            success: false,
            details: `Account locked until ${new Date(member.lockedUntil).toISOString()}`,
          });
        }
      }
    }

    // Sort by timestamp descending and limit
    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  },
});

/**
 * Get system health status
 */
export const getSystemHealth = query({
  args: {},
  returns: v.object({
    status: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("critical")
    ),
    checks: v.array(
      v.object({
        name: v.string(),
        status: v.union(
          v.literal("pass"),
          v.literal("warn"),
          v.literal("fail")
        ),
        message: v.string(),
        value: v.optional(v.number()),
        threshold: v.optional(v.number()),
      })
    ),
    timestamp: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const checks: any[] = [];

    // Check 1: Sign-in success rate
    const recentSessions = await ctx.db
      .query("sessions")
      .filter((q) => q.gte(q.field("createdAt"), last24h))
      .collect();

    const membersWithFailures = await ctx.db
      .query("members")
      .filter((q) => q.gt(q.field("failedLoginAttempts"), 0))
      .collect();

    const totalAttempts =
      recentSessions.length +
      membersWithFailures.reduce((sum, m) => sum + (m.failedLoginAttempts || 0), 0);
    const successRate =
      totalAttempts > 0 ? (recentSessions.length / totalAttempts) * 100 : 100;

    checks.push({
      name: "Sign-in Success Rate",
      status: successRate >= 95 ? "pass" : successRate >= 90 ? "warn" : "fail",
      message:
        successRate >= 95
          ? "Healthy"
          : successRate >= 90
            ? "Below target"
            : "Critical",
      value: Math.round(successRate),
      threshold: 95,
    });

    // Check 2: Email delivery rate
    const emailVerifications = await ctx.db
      .query("email_verifications")
      .filter((q) => q.gte(q.field("createdAt"), last24h))
      .collect();

    const completedVerifications = emailVerifications.filter((e) => e.verifiedAt);
    const emailDeliveryRate =
      emailVerifications.length > 0
        ? (completedVerifications.length / emailVerifications.length) * 100
        : 100;

    checks.push({
      name: "Email Delivery Rate",
      status:
        emailDeliveryRate >= 98 ? "pass" : emailDeliveryRate >= 95 ? "warn" : "fail",
      message:
        emailDeliveryRate >= 98
          ? "Healthy"
          : emailDeliveryRate >= 95
            ? "Below target"
            : "Critical",
      value: Math.round(emailDeliveryRate),
      threshold: 98,
    });

    // Check 3: Account lockouts
    const lockedAccounts = await ctx.db
      .query("members")
      .filter((q) => q.gt(q.field("lockedUntil"), now))
      .collect();

    checks.push({
      name: "Account Lockouts",
      status: lockedAccounts.length < 10 ? "pass" : lockedAccounts.length < 50 ? "warn" : "fail",
      message:
        lockedAccounts.length < 10
          ? "Normal"
          : lockedAccounts.length < 50
            ? "Elevated"
            : "Critical",
      value: lockedAccounts.length,
      threshold: 10,
    });

    // Check 4: Active sessions
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expiresAt")
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    checks.push({
      name: "Active Sessions",
      status: "pass",
      message: `${activeSessions.length} active`,
      value: activeSessions.length,
    });

    // Check 5: Rate limit hits
    const rateLimits = await ctx.db
      .query("rate_limits")
      .filter((q) => q.gte(q.field("firstAttemptAt"), last24h))
      .collect();

    // Count rate limit violations (using common threshold of 5 attempts)
    const DEFAULT_MAX_ATTEMPTS = 5;
    const rateLimitHits = rateLimits.filter(
      (r) => r.attempts >= DEFAULT_MAX_ATTEMPTS
    ).length;

    checks.push({
      name: "Rate Limit Hits",
      status: rateLimitHits < 50 ? "pass" : rateLimitHits < 200 ? "warn" : "fail",
      message:
        rateLimitHits < 50 ? "Normal" : rateLimitHits < 200 ? "Elevated" : "Critical",
      value: rateLimitHits,
      threshold: 50,
    });

    // Determine overall status
    const hasFailure = checks.some((c) => c.status === "fail");
    const hasWarning = checks.some((c) => c.status === "warn");

    const status: "healthy" | "degraded" | "critical" = hasFailure ? "critical" : hasWarning ? "degraded" : "healthy";

    return {
      status,
      checks,
      timestamp: now,
    };
  },
});
