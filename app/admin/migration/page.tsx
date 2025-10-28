"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";

export default function MigrationDashboardPage() {
  const migrationStatus = useQuery(api.migration.getMigrationStatus);
  const pendingMigrations = useQuery(api.migration.getPendingMigrations, { limit: 50 });
  const migrationStats = useQuery(api.migration.getMigrationStats);

  const isLoading = migrationStatus === undefined || pendingMigrations === undefined || migrationStats === undefined;

  // Auto-refresh every 10 seconds
  // In a real implementation, you'd use setInterval or a library like SWR

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { total, migrated, pending, percentageMigrated, lastUpdated } = migrationStatus;
  const lastUpdatedTime = new Date(lastUpdated).toLocaleTimeString();

  // Determine status color
  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 80) return <Badge className="bg-green-600">On Track</Badge>;
    if (percentage >= 50) return <Badge className="bg-yellow-600">In Progress</Badge>;
    return <Badge variant="destructive">Needs Attention</Badge>;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Migration Dashboard</h1>
          <p className="text-muted-foreground">
            Clerk to Custom Auth Migration Progress
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Last updated</p>
          <p className="text-sm font-medium">{lastUpdatedTime}</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Clerk users requiring migration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Migrated</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{migrated.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Users with password set
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Users awaiting migration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(percentageMigrated)}`}>
              {percentageMigrated.toFixed(1)}%
            </div>
            <div className="mt-2">
              {getStatusBadge(percentageMigrated)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Progress</CardTitle>
          <CardDescription>
            Overall completion status of the migration process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={percentageMigrated} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{migrated} migrated</span>
            <span>{pending} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Migration Statistics */}
      {migrationStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Verification Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Verified</span>
                <Badge variant="outline">{migrationStats.byVerification.verified}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Unverified</span>
                <Badge variant="outline">{migrationStats.byVerification.unverified}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Last 7 days</span>
                <Badge variant="outline">{migrationStats.byActivity.activeLastWeek}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Last 30 days</span>
                <Badge variant="outline">{migrationStats.byActivity.activeLastMonth}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Inactive</span>
                <Badge variant="outline">{migrationStats.byActivity.inactive}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Token Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Token Sent</span>
                <Badge variant="outline">{migrationStats.byTokenStatus.tokenSent}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">No Token</span>
                <Badge variant="outline">{migrationStats.byTokenStatus.noToken}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Expired</span>
                <Badge variant="outline">{migrationStats.byTokenStatus.tokenExpired}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {percentageMigrated < 50 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Low Migration Rate</AlertTitle>
          <AlertDescription>
            Less than 50% of users have migrated. Consider sending reminder emails or
            extending the migration deadline.
          </AlertDescription>
        </Alert>
      )}

      {migrationStats && migrationStats.byTokenStatus.tokenExpired > 10 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Expired Tokens Detected</AlertTitle>
          <AlertDescription>
            {migrationStats.byTokenStatus.tokenExpired} users have expired migration tokens.
            Consider re-sending migration emails to these users.
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Migrations</CardTitle>
          <CardDescription>
            Users who have not completed migration (showing up to 50)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Token Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingMigrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No pending migrations
                  </TableCell>
                </TableRow>
              ) : (
                pendingMigrations.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.firstName} {user.lastName}</TableCell>
                    <TableCell>
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {user.hasMigrationToken ? (
                        <Badge className="bg-green-600">Sent</Badge>
                      ) : (
                        <Badge variant="secondary">Not Sent</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Monitor migration progress on this dashboard</li>
            <li>Send reminder emails to users with expired tokens (Day 3, Day 5)</li>
            <li>Reach out to inactive users via support channels</li>
            <li>Wait for 80%+ migration rate before flipping feature flag</li>
            <li>Once ready, set NEXT_PUBLIC_USE_CUSTOM_AUTH=true</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
