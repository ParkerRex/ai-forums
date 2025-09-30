"use client";

import { useQuery } from "convex/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y" | "all">("30d");

  const metrics = useQuery(api.admin.metrics.getPaymentMetrics, { timeRange });
  const mrrHistory = useQuery(api.admin.metrics.getMRRHistory, { months: 12 });
  const churnAnalysis = useQuery(api.admin.metrics.getChurnAnalysis);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (!metrics || !mrrHistory || !churnAnalysis) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-8 w-1/4 rounded"></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-muted h-32 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentMRR = mrrHistory[mrrHistory.length - 1]?.mrr || 0;
  const previousMRR = mrrHistory[mrrHistory.length - 2]?.mrr || 0;
  const mrrGrowth = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Revenue, membership, and growth metrics</p>
        </div>
        <Select
          value={timeRange}
          onValueChange={(value) => setTimeRange(value as "7d" | "30d" | "90d" | "1y" | "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentMRR)}</div>
            <p className="text-muted-foreground mt-1 flex items-center text-xs">
              {mrrGrowth >= 0 ? (
                <>
                  <ArrowUpRight className="text-chart-2 mr-1 h-3 w-3" />
                  <span className="text-chart-2">{formatPercent(Math.abs(mrrGrowth))}</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="text-destructive mr-1 h-3 w-3" />
                  <span className="text-destructive">{formatPercent(Math.abs(mrrGrowth))}</span>
                </>
              )}
              <span className="ml-1">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.revenue.net)}</div>
            <p className="text-muted-foreground text-xs">
              {formatCurrency(metrics.revenue.gross)} gross
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.members.paid}</div>
            <p className="text-muted-foreground text-xs">+{metrics.members.new} new this period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(churnAnalysis.summary.monthlyChurnRate)}
            </div>
            <p className="text-muted-foreground text-xs">
              {churnAnalysis.summary.churnedMembers} total churned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="churn">Churn</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          {/* MRR Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Recurring Revenue</CardTitle>
              <CardDescription>MRR growth over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mrrHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Tier</CardTitle>
                <CardDescription>Revenue contribution by membership tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.tiers).map(([tier, data]) => (
                    <div key={tier} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {tier.replace(/_/g, " ")}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {formatCurrency(data.totalRevenue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                          <div
                            className="h-full"
                            style={{
                              width: `${(data.totalRevenue / metrics.revenue.gross) * 100}%`,
                              backgroundColor:
                                tier === "founding_member"
                                  ? "hsl(var(--chart-5))"
                                  : tier === "early_bird"
                                    ? "hsl(var(--chart-1))"
                                    : "hsl(var(--chart-2))",
                            }}
                          />
                        </div>
                        <span className="text-muted-foreground text-xs">{data.count} members</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing Intervals</CardTitle>
                <CardDescription>Monthly vs Yearly subscription split</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Monthly",
                            value: metrics.members.billingBreakdown.monthly,
                          },
                          {
                            name: "Yearly",
                            value: metrics.members.billingBreakdown.yearly,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--chart-1))" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Member Distribution</CardTitle>
              <CardDescription>Breakdown of member types and tiers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Total Members</p>
                    <p className="text-2xl font-bold">{metrics.members.total}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Paid Members</p>
                    <p className="text-chart-2 text-2xl font-bold">{metrics.members.paid}</p>
                  </div>
                  {/* Note: No free tier - platform operates with zero free users */}
                  {/* Scholarships handled via Stripe coupons with early_bird tier */}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="churn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Churn Analysis</CardTitle>
              <CardDescription>Member retention and churn metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Monthly Retention Rate</p>
                    <p className="text-chart-2 text-2xl font-bold">
                      {formatPercent(churnAnalysis.retentionRate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Average Member Lifetime</p>
                    <p className="text-2xl font-bold">
                      {churnAnalysis.recentChurns.avgLifetimeMonths} months
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="mb-2 text-sm font-medium">Churn by Tier</p>
                  {Object.entries(churnAnalysis.churnByTier).map(([tier, data]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{tier.replace(/_/g, " ")}</span>
                      <Badge variant="secondary">{data.count as number}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Breakdown by card brand</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(metrics.paymentMethods).map(([brand, data]) => (
                  <div key={brand} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{brand}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground text-sm">
                        {data.count as number} payments
                      </span>
                      <span className="text-sm font-medium">{formatCurrency(data.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
