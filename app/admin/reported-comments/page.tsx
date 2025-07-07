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

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Trash2, X } from "lucide-react";
import { PageErrorBoundary } from "@/components/error-boundary";
import { useMutationError } from "@/hooks/use-mutation-error";
import Link from "next/link";

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
 * The component uses Convex for real-time data synchronization, ensuring that multiple
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

  // Custom hook for standardized error handling across mutations
  // Provides consistent error messages and retry functionality
  const { handleMutationError, handleMutationSuccess } = useMutationError();

  // Check if current user has admin privileges
  // This query will return false for non-admin users, blocking access to the page
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);

  // Fetch reported comments based on current filter settings
  // Limited to 50 reports per query to prevent performance issues
  // The query automatically re-runs when statusFilter changes
  const reports = useQuery(api.admin.getReportedComments, {
    status: statusFilter,
    limit: 50,
  });

  // Mutation for resolving or dismissing reports
  // This can optionally delete the associated comment when resolving
  const resolveReport = useMutation(api.admin.resolveReport);

  // Early return if user is not an admin
  // This prevents unauthorized access to sensitive moderation tools
  // The isAdmin query returns false for non-admin users and undefined while loading
  if (isAdmin === false) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            You need admin privileges to access this page.
          </p>
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
   * This function uses optimistic UI updates and provides retry functionality
   * on failure to ensure reliable moderation actions.
   *
   * @param reportId - The ID of the report to resolve
   * @param deleteComment - Whether to delete the associated comment (default: false)
   *
   * @example
   * // Resolve report without deleting comment
   * handleResolve("report123")
   *
   * // Resolve report and delete the comment
   * handleResolve("report123", true)
   */
  const handleResolve = async (
    reportId: string,
    deleteComment: boolean = false,
  ) => {
    try {
      // Call the Convex mutation to resolve the report
      // The reportId is cast to the correct Convex ID type for type safety
      await resolveReport({
        reportId: reportId as Id<"commentReports">,
        action: "resolve",
        deleteComment,
      });

      // Show success message based on whether comment was deleted
      // This provides clear feedback to the admin about what action was taken
      handleMutationSuccess(
        deleteComment
          ? "Report resolved and comment deleted"
          : "Report resolved",
      );
    } catch (error) {
      // Handle errors with retry functionality
      // The error handler will show a toast with retry button
      handleMutationError(error, () => handleResolve(reportId, deleteComment), {
        context: "resolving report",
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
   * This is useful for false reports, spam reports, or cases where the
   * reported content doesn't violate community guidelines.
   *
   * @param reportId - The ID of the report to dismiss
   *
   * @example
   * // Dismiss a report without taking action on the comment
   * handleDismiss("report123")
   */
  const handleDismiss = async (reportId: string) => {
    try {
      // Call the Convex mutation to dismiss the report
      // This changes the report status to "dismissed" without affecting the comment
      await resolveReport({
        reportId: reportId as Id<"commentReports">,
        action: "dismiss",
      });

      // Show success confirmation to the admin
      handleMutationSuccess("Report dismissed");
    } catch (error) {
      // Handle errors with retry functionality
      // Provides consistent error handling across all admin actions
      handleMutationError(error, () => handleDismiss(reportId), {
        context: "dismissing report",
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
   *
   * @example
   * // Renders a red badge for pending reports
   * getStatusBadge("pending")
   *
   * // Renders a gray badge for dismissed reports
   * getStatusBadge("dismissed")
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
   *
   * @example
   * // Renders a red badge for spam reports
   * getReasonBadge("spam")
   *
   * // Renders a muted badge for custom reasons
   * getReasonBadge("other")
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
      <Badge className={colors[reason as keyof typeof colors] || colors.other}>
        {reason}
      </Badge>
    );
  };

  return (
    <div className="container max-w-7xl mx-auto p-6">
      {/* Page header with title and description */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Reported Comments
        </h1>
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
            setStatusFilter(
              value === "all" ? undefined : (value as ReportStatus),
            )
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
      {reports === undefined ? (
        <div className="space-y-4">
          {/* Create 5 skeleton cards to indicate loading */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="animate-pulse space-y-3">
                {/* Skeleton elements mimic the structure of actual report cards */}
                <div className="flex items-center space-x-3">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                </div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        /* Empty state when no reports match the current filter */
        /* Shows different messages based on whether a filter is applied */
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {statusFilter
              ? `No ${statusFilter} reports found.`
              : "No reports found."}
          </p>
        </div>
      ) : (
        /* Main reports table */
        /* Uses a responsive table layout to display all report information */
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Column headers organized by importance for admin review */}
                <TableHead>Reported</TableHead>{" "}
                {/* When the report was created */}
                <TableHead>Comment</TableHead>{" "}
                {/* The actual reported content */}
                <TableHead>Author</TableHead> {/* Who wrote the comment */}
                <TableHead>Reporter</TableHead> {/* Who reported it */}
                <TableHead>Reason</TableHead> {/* Why it was reported */}
                <TableHead>Status</TableHead> {/* Current processing status */}
                <TableHead>Actions</TableHead> {/* Available admin actions */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
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
                        <p className="text-sm truncate">
                          {report.comment.content}
                        </p>
                        {/* Link to view comment in original context */}
                        {/* Uses URL fragments to jump directly to the comment */}
                        {report.post && (
                          <Link
                            href={`/${report.post.categoryName ?? "general"}/${report.post.slug}#comment-${report.comment._id}`}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            View in context <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    ) : (
                      /* Show when comment has been deleted */
                      <span className="text-muted-foreground text-sm">
                        Comment deleted
                      </span>
                    )}
                  </TableCell>
                  {/* Comment author column - shows who wrote the reported comment */}
                  <TableCell>
                    {report.comment?.author ? (
                      <span className="text-sm">
                        {report.comment.author.firstName}{" "}
                        {report.comment.author.lastName}
                      </span>
                    ) : (
                      /* Show when author information is not available */
                      <span className="text-muted-foreground text-sm">
                        Unknown
                      </span>
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
                      <span className="text-muted-foreground text-sm">
                        Unknown
                      </span>
                    )}
                  </TableCell>

                  {/* Reason column - shows why the comment was reported */}
                  <TableCell>
                    {/* Color-coded badge for the main reason */}
                    {getReasonBadge(report.reason)}
                    {/* Additional text explanation if provided by reporter */}
                    {report.reasonText && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.reasonText}
                      </p>
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
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>

                        {/* Dismiss button - marks report as reviewed but takes no action */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDismiss(report._id)}
                        >
                          <X className="w-4 h-4 mr-1" />
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
 *
 * @example
 * // This component is automatically rendered when navigating to /admin/reported-comments
 * // Next.js handles the routing based on the file path
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
