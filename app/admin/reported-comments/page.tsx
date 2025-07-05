"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { toast } from "sonner";
import { PageErrorBoundary } from "@/components/error-boundary";
import { useMutationError } from "@/hooks/use-mutation-error";
import Link from "next/link";

type ReportStatus = "pending" | "resolved" | "dismissed" | undefined;

function ReportedCommentsContent() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus>(undefined);
  const { handleMutationError, handleMutationSuccess } = useMutationError();

  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);
  const reports = useQuery(api.admin.getReportedComments, {
    status: statusFilter,
    limit: 50,
  });

  const resolveReport = useMutation(api.admin.resolveReport);

  if (isAdmin === false) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  const handleResolve = async (reportId: string, deleteComment: boolean = false) => {
    try {
      await resolveReport({
        reportId: reportId as any,
        action: "resolve",
        deleteComment,
      });
      handleMutationSuccess(
        deleteComment ? "Report resolved and comment deleted" : "Report resolved"
      );
    } catch (error) {
      handleMutationError(error, () => handleResolve(reportId, deleteComment), {
        context: "resolving report",
      });
    }
  };

  const handleDismiss = async (reportId: string) => {
    try {
      await resolveReport({
        reportId: reportId as any,
        action: "dismiss",
      });
      handleMutationSuccess("Report dismissed");
    } catch (error) {
      handleMutationError(error, () => handleDismiss(reportId), {
        context: "dismissing report",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="destructive">Pending</Badge>;
      case "resolved":
        return <Badge variant="default">Resolved</Badge>;
      case "dismissed":
        return <Badge variant="secondary">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReasonBadge = (reason: string) => {
    const colors = {
      spam: "bg-red-100 text-red-800",
      inappropriate: "bg-orange-100 text-orange-800",
      harassment: "bg-purple-100 text-purple-800",
      other: "bg-gray-100 text-gray-800",
    };
    
    return (
      <Badge className={colors[reason as keyof typeof colors] || colors.other}>
        {reason}
      </Badge>
    );
  };

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Reported Comments
        </h1>
        <p className="text-muted-foreground">
          Review and manage reported comments from the community.
        </p>
      </div>

      <div className="mb-6">
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) => 
            setStatusFilter(value === "all" ? undefined : value as ReportStatus)
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

      {reports === undefined ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="animate-pulse space-y-3">
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
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {statusFilter ? `No ${statusFilter} reports found.` : "No reports found."}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reported</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report._id}>
                  <TableCell>
                    {formatDistanceToNow(new Date(report.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {report.comment ? (
                      <div className="space-y-1">
                        <p className="text-sm truncate">
                          {report.comment.content}
                        </p>
                        {report.post && (
                          <Link
                            href={`/${report.post.categoryName || 'general'}/${report.post.slug}#comment-${report.comment._id}`}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            View in context <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Comment deleted
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {report.comment?.author ? (
                      <span className="text-sm">
                        {report.comment.author.firstName} {report.comment.author.lastName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {report.reporter ? (
                      <span className="text-sm">
                        {report.reporter.firstName} {report.reporter.lastName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getReasonBadge(report.reason)}
                    {report.reasonText && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.reasonText}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell>
                    {report.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleResolve(report._id, true)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
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

export default function ReportedCommentsPage() {
  return (
    <PageErrorBoundary context="loading reported comments">
      <ReportedCommentsContent />
    </PageErrorBoundary>
  );
}
