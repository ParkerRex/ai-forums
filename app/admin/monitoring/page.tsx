"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, RefreshCw, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function MonitoringPage() {
  const webhookHealth = useQuery(api.stripe.monitoring.getWebhookHealth);
  const recentFailures = useQuery(api.stripe.monitoring.getRecentFailures, { limit: 10 });

  const getHealthIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-chart-2" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-chart-4" />;
      case "critical":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return null;
    }
  };

  const getHealthBadgeVariant = (status: string) => {
    switch (status) {
      case "healthy":
        return "outline" as const;
      case "warning":
        return "secondary" as const;
      case "critical":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  if (!webhookHealth) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Webhook Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor Stripe webhook processing and system health
        </p>
      </div>

      {/* Health Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>System Health</CardTitle>
              {getHealthIcon(webhookHealth.status)}
            </div>
            <Badge variant={getHealthBadgeVariant(webhookHealth.status)}>
              {webhookHealth.status.toUpperCase()}
            </Badge>
          </div>
          <CardDescription>
            Last checked: {format(webhookHealth.lastChecked, "PPp")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webhookHealth.issues.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">Issues detected:</p>
              <ul className="list-disc list-inside space-y-1">
                {webhookHealth.issues.map((issue: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              All systems operating normally
            </p>
          )}
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webhookHealth.metrics.totalEvents.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            {webhookHealth.metrics.failureRate < 0.05 ? (
              <TrendingUp className="h-4 w-4 text-chart-2" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((1 - webhookHealth.metrics.failureRate) * 100).toFixed(1)}%
            </div>
            <Progress
              value={(1 - webhookHealth.metrics.failureRate) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webhookHealth.metrics.avgProcessingTime.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              {webhookHealth.metrics.avgProcessingTime < 1000 ? (
                <span className="text-chart-2">Excellent</span>
              ) : webhookHealth.metrics.avgProcessingTime < 3000 ? (
                <span className="text-chart-4">Good</span>
              ) : (
                <span className="text-destructive">Slow</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duplicate Rate</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(webhookHealth.metrics.duplicateRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {webhookHealth.metrics.duplicateRate < 0.01 ? (
                <span className="text-chart-2">Normal</span>
              ) : (
                <span className="text-chart-4">Elevated</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Failures */}
      {recentFailures && recentFailures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Failures</CardTitle>
            <CardDescription>
              Latest webhook processing failures requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentFailures.map((failure: {
                eventId: string;
                type: string;
                error: string | undefined;
                createdAt: number;
                age: number;
              }) => (
                <div
                  key={failure.eventId}
                  className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{failure.type}</p>
                    <p className="text-sm text-destructive">{failure.error}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(failure.createdAt, "PPp")} ({Math.round(failure.age / 1000 / 60)} minutes ago)
                    </p>
                  </div>
                  <Badge variant="destructive">Failed</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Event Type Performance</CardTitle>
          <CardDescription>
            Success rates by webhook event type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(webhookHealth.metrics.eventTypeMetrics || {}).map(
              ([eventType, metrics]) => {
                const metricsData = metrics as { total: number; processed: number; failed: number };
                const successRate = metricsData.total > 0
                  ? (metricsData.processed / metricsData.total) * 100
                  : 0;
                
                return (
                  <div key={eventType} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{eventType}</span>
                      <span className="text-sm text-muted-foreground">
                        {metricsData.processed}/{metricsData.total}
                      </span>
                    </div>
                    <Progress value={successRate} />
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}