/**
 * @fileoverview Stripe Webhook Monitoring and Alerting System
 * 
 * This module provides comprehensive monitoring for Stripe webhook events,
 * tracking success rates, failures, and processing times. It enables
 * proactive detection of integration issues and provides metrics for
 * operational monitoring.
 * 
 * Key features:
 * - Webhook event success/failure tracking
 * - Processing time monitoring
 * - Duplicate event detection
 * - Error categorization and alerting
 * - Daily summary reports
 * - Real-time alerts for critical failures
 * 
 * @module stripe/monitoring
 */

import { v } from "convex/values";
import { query, internalMutation, internalQuery, QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { api } from "../_generated/api";

/**
 * Webhook monitoring configuration
 */
const MONITORING_CONFIG = {
  // Alert thresholds
  FAILURE_RATE_THRESHOLD: 0.1, // Alert if >10% of webhooks fail
  PROCESSING_TIME_THRESHOLD: 5000, // Alert if processing takes >5 seconds
  DUPLICATE_RATE_THRESHOLD: 0.05, // Alert if >5% are duplicates
  
  // Time windows
  MONITORING_WINDOW: 24 * 60 * 60 * 1000, // 24 hours
  ALERT_COOLDOWN: 60 * 60 * 1000, // 1 hour between alerts
  
  // Event types to monitor closely
  CRITICAL_EVENTS: [
    "customer.subscription.created",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
  ],
};

/**
 * Track webhook event processing
 */
export const trackWebhookEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    processed: v.boolean(),
    processingTime: v.optional(v.number()),
    error: v.optional(v.string()),
    isDuplicate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Record the event
    await ctx.db.insert("stripeWebhookEvents", {
      stripeEventId: args.eventId,
      type: args.eventType,
      processed: args.processed,
      error: args.error,
      createdAt: now,
      processedAt: args.processed ? now : undefined,
    });
    
    // Check if we need to send alerts
    if (!args.processed && args.error) {
      await checkForAlerts(ctx, args.eventType, args.error);
    }
  },
});

/**
 * Helper function to calculate webhook metrics
 */
async function calculateMetrics(ctx: QueryCtx) {
  const cutoffTime = Date.now() - MONITORING_CONFIG.MONITORING_WINDOW;
    
    // Get all events in the monitoring window
    const events = await ctx.db
      .query("stripeWebhookEvents")
      .withIndex("by_createdAt")
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();
    
    // Calculate metrics
    const totalEvents = events.length;
    const processedEvents = events.filter((e) => e.processed).length;
    const failedEvents = events.filter((e) => !e.processed && e.error).length;
    const duplicateEvents = events.filter((e) => e.error?.includes("duplicate")).length;
    
    // Calculate processing times for successful events
    const processingTimes = events
      .filter((e) => e.processed && e.processedAt)
      .map((e) => (e.processedAt! - e.createdAt));
    
    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum: number, time: number) => sum + time, 0) / processingTimes.length
      : 0;
    
    const maxProcessingTime = processingTimes.length > 0
      ? Math.max(...processingTimes)
      : 0;
    
    // Group by event type
    const eventTypeMetrics = events.reduce((acc: Record<string, {total: number; processed: number; failed: number; avgTime: number; errors: string[]}>, event) => {
      if (!acc[event.type]) {
        acc[event.type] = {
          total: 0,
          processed: 0,
          failed: 0,
          avgTime: 0,
          errors: [],
        };
      }
      
      acc[event.type].total++;
      if (event.processed) {
        acc[event.type].processed++;
      } else if (event.error) {
        acc[event.type].failed++;
      }
      
      return acc;
    }, {} as Record<string, {total: number; processed: number; failed: number; avgTime: number; errors: string[]}>);
    
    // Calculate failure rate
    const failureRate = totalEvents > 0 ? failedEvents / totalEvents : 0;
    const duplicateRate = totalEvents > 0 ? duplicateEvents / totalEvents : 0;
    
    return {
      totalEvents,
      processedEvents,
      failedEvents,
      duplicateEvents,
      failureRate,
      duplicateRate,
      avgProcessingTime,
      maxProcessingTime,
      eventTypeMetrics,
      monitoringWindow: MONITORING_CONFIG.MONITORING_WINDOW,
    };
}

/**
 * Get webhook processing metrics for the monitoring window
 */
export const getWebhookMetrics = internalQuery({
  handler: async (ctx) => {
    return await calculateMetrics(ctx);
  },
});

/**
 * Get recent webhook failures for investigation
 */
export const getRecentFailures = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    const failures = await ctx.db
      .query("stripeWebhookEvents")
      .withIndex("by_processed", (q) => q.eq("processed", false))
      .order("desc")
      .take(limit);
    
    return failures.map(event => ({
      eventId: event.stripeEventId,
      type: event.type,
      error: event.error,
      createdAt: event.createdAt,
      age: Date.now() - event.createdAt,
    }));
  },
});

/**
 * Get webhook processing health status
 */
export const getWebhookHealth = query({
  handler: async (ctx) => {
    const metrics = await calculateMetrics(ctx);
    
    // Determine health status
    let status: "healthy" | "warning" | "critical" = "healthy";
    const issues: string[] = [];
    
    if (metrics.failureRate > MONITORING_CONFIG.FAILURE_RATE_THRESHOLD) {
      status = "critical";
      issues.push(`High failure rate: ${(metrics.failureRate * 100).toFixed(1)}%`);
    }
    
    if (metrics.avgProcessingTime > MONITORING_CONFIG.PROCESSING_TIME_THRESHOLD) {
      status = status === "critical" ? "critical" : "warning";
      issues.push(`Slow processing: ${metrics.avgProcessingTime.toFixed(0)}ms avg`);
    }
    
    if (metrics.duplicateRate > MONITORING_CONFIG.DUPLICATE_RATE_THRESHOLD) {
      status = status === "critical" ? "critical" : "warning";
      issues.push(`High duplicate rate: ${(metrics.duplicateRate * 100).toFixed(1)}%`);
    }
    
    // Check for critical event failures
    const criticalFailures = Object.entries(metrics.eventTypeMetrics)
      .filter(([eventType, stats]) => 
        MONITORING_CONFIG.CRITICAL_EVENTS.includes(eventType) && 
        stats.failed > 0
      );
    
    if (criticalFailures.length > 0) {
      status = "critical";
      issues.push(`Critical event failures: ${criticalFailures.map(([type]) => type).join(", ")}`);
    }
    
    return {
      status,
      issues,
      metrics: {
        totalEvents: metrics.totalEvents,
        failureRate: metrics.failureRate,
        avgProcessingTime: metrics.avgProcessingTime,
        duplicateRate: metrics.duplicateRate,
        eventTypeMetrics: metrics.eventTypeMetrics,
      },
      lastChecked: Date.now(),
    };
  },
});

/**
 * Check if we need to send alerts based on current metrics
 */
async function checkForAlerts(ctx: MutationCtx, eventType: string, error: string) {
  // Get recent metrics
  const metrics = await calculateMetrics(ctx);
  
  // Check if we should send an alert
  const shouldAlert = 
    metrics.failureRate > MONITORING_CONFIG.FAILURE_RATE_THRESHOLD ||
    MONITORING_CONFIG.CRITICAL_EVENTS.includes(eventType);
  
  if (shouldAlert) {
    // In a real implementation, this would send alerts via email, Slack, etc.
    console.error(`[WEBHOOK ALERT] Failed to process ${eventType}: ${error}`);
    console.error(`[WEBHOOK ALERT] Current failure rate: ${(metrics.failureRate * 100).toFixed(1)}%`);
    
    // Log alert for audit trail
    // Note: System-level webhook alerts are logged to console only.
    // For a production system, consider creating a separate alerts table
    // or sending to an external monitoring service like Sentry/DataDog
  }
}

/**
 * Generate daily webhook monitoring report
 */
export const generateDailyReport = internalQuery({
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    // Get today's metrics
    const todayMetrics = await calculateMetrics(ctx);
    
    // Get last week's events for comparison
    const lastWeekEvents = await ctx.db
      .query("stripeWebhookEvents")
      .withIndex("by_createdAt")
      .filter((q) => q.gte(q.field("createdAt"), oneWeekAgo))
      .collect();
    
    // Calculate week-over-week trends
    const dailyAverages = calculateDailyAverages(lastWeekEvents);
    
    // Identify top errors
    const errorCounts = lastWeekEvents
      .filter(e => e.error)
      .reduce((acc, e) => {
        const errorType = e.error || "Unknown";
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));
    
    return {
      date: new Date().toISOString().split('T')[0],
      summary: {
        totalEvents: todayMetrics.totalEvents,
        successRate: ((todayMetrics.processedEvents / todayMetrics.totalEvents) * 100).toFixed(1),
        avgProcessingTime: todayMetrics.avgProcessingTime.toFixed(0),
        failureRate: (todayMetrics.failureRate * 100).toFixed(1),
      },
      trends: {
        dailyAverages,
        weeklyTotal: lastWeekEvents.length,
      },
      topErrors,
      criticalEvents: Object.entries(todayMetrics.eventTypeMetrics)
        .filter(([type]) => MONITORING_CONFIG.CRITICAL_EVENTS.includes(type))
        .map(([type, metrics]) => ({
          type,
          total: metrics.total,
          failed: metrics.failed,
          successRate: ((metrics.processed / metrics.total) * 100).toFixed(1),
        })),
    };
  },
});

/**
 * Calculate daily averages from events
 */
function calculateDailyAverages(events: Doc<"stripeWebhookEvents">[]) {
  const dailyData: Record<string, { total: number; processed: number; failed: number }> = {};
  
  events.forEach(event => {
    const date = new Date(event.createdAt).toISOString().split('T')[0];
    
    if (!dailyData[date]) {
      dailyData[date] = { total: 0, processed: 0, failed: 0 };
    }
    
    dailyData[date].total++;
    if (event.processed) {
      dailyData[date].processed++;
    } else if (event.error) {
      dailyData[date].failed++;
    }
  });
  
  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    total: data.total,
    successRate: ((data.processed / data.total) * 100).toFixed(1),
    failureRate: ((data.failed / data.total) * 100).toFixed(1),
  }));
}

/**
 * Clean up old webhook events (retention policy)
 */
export const cleanupOldWebhookEvents = internalMutation({
  args: {
    retentionDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const retentionDays = args.retentionDays || 90; // Default 90 days retention
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    
    // Get old events
    const oldEvents = await ctx.db
      .query("stripeWebhookEvents")
      .withIndex("by_createdAt")
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
      .collect();
    
    // Delete in batches
    let deleted = 0;
    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
      deleted++;
    }
    
    console.log(`[WEBHOOK CLEANUP] Deleted ${deleted} events older than ${retentionDays} days`);
    
    return { deleted, retentionDays };
  },
});