/**
 * @file Admin interface for managing reported comments
 *
 * This page provides administrators with a comprehensive dashboard to review and manage
 * user-reported comments. It includes filtering, status management, and moderation actions.
 *
 * Key features:
 * - Real-time display of reported comments with full context
 * - Filter by report status (pending, resolved, dismissed)
 * - Moderation actions: delete comment, dismiss report, resolve report
 * - Context links to view comments in their original posts
 * - Error handling and loading states
 *
 * Business logic:
 * - Only admin users can access this page (enforced by admin check)
 * - Reports start as "pending" and can be moved to "resolved" or "dismissed"
 * - Resolving a report can optionally delete the associated comment
 * - Dismissing a report marks it as reviewed but takes no action on the comment
 *
 * @author AI Assistant
 * @version 1.0.0
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageErrorBoundary } from "@/components/error-boundary";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  useReportedComments,
  useResolveReport,
  type EnrichedReport,
} from "@/hooks/use-admin";

/**
 * Represents the possible states of a comment report
 *
 * - pending: Report is waiting for admin review
 * - resolved: Report has been handled and comment may have been deleted
 * - dismissed: Report was reviewed but no action was taken
 * - undefined: Used for "all" filter option to show reports of any status
 */
type ReportStatus = "pending" | "resolved" | "dismissed" | undefined;

/**
 * Main content component for the reported comments admin page
 *
 * This component handles the core functionality of displaying and managing reported comments.
 * It includes admin authorization, data fetching, filtering, and moderation actions.
 *
 * The component uses React Query for data synchronization, ensuring that multiple
 * admin users can work simultaneously without conflicts.
 *
 * @returns JSX element containing the reported comments interface or access denied message
 *
 * @example
 * // This component is typically wrapped in an error boundary
 * <PageErrorBoundary>
 *   <ReportedCommentsContent />
 * </PageErrorBoundary>
 */
function ReportedCommentsContent() {
  // State for filtering reports by status (pending, resolved, dismissed, or all)
  // Starts as undefined to show all reports by default
  const [statusFilter, setStatusFilter] = useState<ReportStatus>(undefined);

  const { toast } = useToast();

  // Check if current user has admin privileges
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  // Fetch reported comments using the admin hook
  const { data: reports, isLoading: isReportsLoading } = useReportedComments(
    statusFilter,
    50,
  );

  // Resolve report mutation using the admin hook
  const resolveReportMutation = useResolveReport();

  // Early return if user is not an admin
  // This prevents unauthorized access to sensitive moderation tools
  if (isAuthLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="py-12 text-center">
          <h1 className="text-foreground mb-4 text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  /**
   * Handles resolving a comment report with optional comment deletion
   *
   * When resolving a report, admins can choose to:
   * 1. Resolve without action (comment stays, report marked as resolved)
   * 2. Resolve with deletion (comment is deleted, report marked as resolved)
   *
   * @param reportId - The ID of the report to resolve
   * @param deleteComment - Whether to delete the associated comment (default: false)
   */
  const handleResolve = async (reportId: string, deleteComment: boolean = false) => {
    try {
      await resolveReportMutation.mutateAsync({
        reportId,
        action: "resolve",
        deleteComment,
      });
      toast({
        title: deleteComment ? "Report resolved and comment deleted" : "Report resolved",
      });
    } catch {
      toast({
        title: "Error resolving report",
        variant: "destructive",
      });
    }
  };

  /**
   * Handles dismissing a comment report without taking action
   *
   * Dismissing a report indicates that an admin reviewed it but decided
   * no action was necessary. The comment remains unchanged, but the report
   * is marked as dismissed to remove it from the pending queue.
   *
   * @param reportId - The ID of the report to dismiss
   */
  const handleDismiss = async (reportId: string) => {
    try {
      await resolveReportMutation.mutateAsync({
        reportId,
        action: "dismiss",
      });
      toast({
        title: "Report dismissed",
      });
    } catch {
      toast({
        title: "Error dismissing report",
        variant: "destructive",
      });
    }
  };

  /**
   * Renders a status badge with appropriate styling based on report status
   *
   * Uses semantic colors to help admins quickly identify report states:
   * - Pending: Red (destructive) to indicate urgent attention needed
   * - Resolved: Default styling to indicate completed action
   * - Dismissed: Secondary styling to indicate reviewed but no action taken
   *
   * @param status - The current status of the report
   * @returns JSX Badge component with appropriate styling
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        // Red badge to draw attention to reports that need review
        return <Badge variant="destructive">Pending</Badge>;
      case "resolved":
        // Default styling for completed reports
        return <Badge variant="default">Resolved</Badge>;
      case "dismissed":
        // Secondary styling for reviewed but dismissed reports
        return <Badge variant="secondary">Dismissed</Badge>;
      default:
        // Fallback for unknown statuses (should not occur in normal operation)
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  /**
   * Renders a reason badge with color-coded styling based on report reason
   *
   * Uses intuitive color coding to help admins quickly categorize reports:
   * - Spam: Red (high severity, clear violation)
   * - Inappropriate: Orange (medium severity, content review needed)
   * - Harassment: Purple (high severity, user safety concern)
   * - Other: Muted (custom reason, requires individual assessment)
   *
   * @param reason - The reason why the comment was reported
   * @returns JSX Badge component with color-coded styling
   */
  const getReasonBadge = (reason: string) => {
    // Color mapping for different report reasons
    // Uses subtle background colors with darker text for accessibility
    const colors = {
      spam: "bg-red-100 text-red-800", // Red for spam (clear violation)
      inappropriate: "bg-orange-100 text-orange-800", // Orange for inappropriate content
      harassment: "bg-purple-100 text-purple-800", // Purple for harassment (safety concern)
      other: "bg-muted text-muted-foreground", // Muted for custom reasons
    };

    return (
      <Badge className={colors[reason as keyof typeof colors] || colors.other}>{reason}</Badge>
    );
  };

  return (
    <div className="container mx-auto max-w-7xl p-6">
      {/* Page header with title and description */}
      <div className="mb-6">
        <h1 className="text-foreground mb-2 text-3xl font-bold">Reported Comments</h1>
        <p className="text-muted-foreground">
          Review and manage reported comments from the community.
        </p>
      </div>

      {/* Status filter dropdown */}
      {/* Allows admins to filter reports by status to focus on specific types */}
      <div className="mb-6">
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) =>
            // Convert "all" back to undefined for the API query
            // This allows showing all reports when no specific status is selected
            setStatusFilter(value === "all" ? undefined : (value as ReportStatus))
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reports</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading state with skeleton placeholders */}
      {/* Shows while reports are being fetched from the database */}
      {isReportsLoading || reports === undefined ? (
        <div className="space-y-4">
          {/* Create 5 skeleton cards to indicate loading */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-none border p-4">
              <div className="animate-pulse space-y-3">
                {/* Skeleton elements mimic the structure of actual report cards */}
                <div className="flex items-center space-x-3">
                  <div className="bg-muted h-4 w-24 rounded"></div>
                  <div className="bg-muted h-4 w-32 rounded"></div>
                </div>
                <div className="bg-muted h-4 w-full rounded"></div>
                <div className="bg-muted h-4 w-3/4 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        /* Empty state when no reports match the current filter */
        /* Shows different messages based on whether a filter is applied */
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {statusFilter ? `No ${statusFilter} reports found.` : "No reports found."}
          </p>
        </div>
      ) : (
        /* Main reports table */
        /* Uses a responsive table layout to display all report information */
        <div className="rounded-none border">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Column headers organized by importance for admin review */}
                <TableHead>Reported</TableHead> {/* When the report was created */}
                <TableHead>Comment</TableHead> {/* The actual reported content */}
                <TableHead>Author</TableHead> {/* Who wrote the comment */}
                <TableHead>Reporter</TableHead> {/* Who reported it */}
                <TableHead>Reason</TableHead> {/* Why it was reported */}
                <TableHead>Status</TableHead> {/* Current processing status */}
                <TableHead>Actions</TableHead> {/* Available admin actions */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report: EnrichedReport) => (
                <TableRow key={report._id}>
                  {/* Timestamp column - shows when the report was created */}
                  <TableCell>
                    {formatDistanceToNow(new Date(report.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>

                  {/* Comment content column - shows the reported comment with context link */}
                  <TableCell className="max-w-xs">
                    {report.comment ? (
                      <div className="space-y-1">
                        {/* Truncated comment content for table display */}
                        <p className="truncate text-sm">{report.comment.content}</p>
                        {/* Link to view comment in original context */}
                        {/* Uses URL fragments to jump directly to the comment */}
                        {report.post && (
                          <Link
                            href={`/${report.post.categoryName ?? "general"}/${report.post.slug}#comment-${report.comment?._id}`}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            View in context <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    ) : (
                      /* Show when comment has been deleted */
                      <span className="text-muted-foreground text-sm">Comment deleted</span>
                    )}
                  </TableCell>
                  {/* Comment author column - shows who wrote the reported comment */}
                  <TableCell>
                    {report.comment?.author ? (
                      <span className="text-sm">
                        {report.comment.author.firstName} {report.comment.author.lastName}
                      </span>
                    ) : (
                      /* Show when author information is not available */
                      <span className="text-muted-foreground text-sm">Unknown</span>
                    )}
                  </TableCell>

                  {/* Reporter column - shows who reported the comment */}
                  <TableCell>
                    {report.reporter ? (
                      <span className="text-sm">
                        {report.reporter.firstName} {report.reporter.lastName}
                      </span>
                    ) : (
                      /* Show when reporter information is not available */
                      <span className="text-muted-foreground text-sm">Unknown</span>
                    )}
                  </TableCell>

                  {/* Reason column - shows why the comment was reported */}
                  <TableCell>
                    {/* Color-coded badge for the main reason */}
                    {getReasonBadge(report.reason)}
                    {/* Additional text explanation if provided by reporter */}
                    {report.reasonText && (
                      <p className="text-muted-foreground mt-1 text-xs">{report.reasonText}</p>
                    )}
                  </TableCell>

                  {/* Status column - current processing status */}
                  <TableCell>{getStatusBadge(report.status)}</TableCell>

                  {/* Actions column - available moderation actions */}
                  <TableCell>
                    {/* Only show action buttons for pending reports */}
                    {/* Resolved/dismissed reports don't need further action */}
                    {report.status === "pending" && (
                      <div className="flex items-center gap-2">
                        {/* Delete button - resolves report and removes comment */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleResolve(report._id, true)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>

                        {/* Dismiss button - marks report as reviewed but takes no action */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDismiss(report._id)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/**
 * Main page component for the reported comments admin interface
 *
 * This component serves as the entry point for the reported comments page and provides
 * error boundary protection for the entire interface. It wraps the main content component
 * to catch and handle any errors that might occur during rendering or data fetching.
 *
 * The error boundary is essential for admin interfaces as it prevents crashes from
 * disrupting critical moderation workflows. If an error occurs, users see a friendly
 * error message instead of a blank screen.
 *
 * Route: /admin/reported-comments
 * Access: Admin users only (enforced within ReportedCommentsContent)
 *
 * @returns JSX element with error boundary protection around the main content
 */
export default function ReportedCommentsPage() {
  return (
    // Error boundary provides graceful error handling for the entire page
    // The context helps identify which part of the app had issues in error logs
    <PageErrorBoundary context="loading reported comments">
      <ReportedCommentsContent />
    </PageErrorBoundary>
  );
}
