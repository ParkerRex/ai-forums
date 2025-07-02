"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Link2, Flag } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CommentActionsMenuProps {
  commentId: Id<"comments">;
  authorId: Id<"members">;
  postSlug: string;
  categoryName: string;
  onEditClick: () => void;
  isAdmin?: boolean;
}

export function CommentActionsMenu({
  commentId,
  authorId,
  postSlug,
  categoryName,
  onEditClick,
  isAdmin = false,
}: CommentActionsMenuProps) {
  const { user } = useUser();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const deleteComment = useMutation(api.comments.deleteComment);

  const isOwnComment = user?.publicMetadata?.memberId === authorId;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${categoryName}/${postSlug}#comment-${commentId}`;
    navigator.clipboard.writeText(url);
    toast.success("Comment link copied to clipboard");
  };

  const handleDelete = async () => {
    try {
      await deleteComment({ commentId });
      toast.success("Comment deleted successfully");
      setShowDeleteDialog(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete comment");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(isOwnComment || isAdmin) && (
            <>
              <DropdownMenuItem onClick={onEditClick}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleCopyLink}>
            <Link2 className="mr-2 h-4 w-4" />
            Copy link
          </DropdownMenuItem>
          {!isOwnComment && (
            <DropdownMenuItem
              onClick={() => setShowReportDialog(true)}
              className="text-red-600"
            >
              <Flag className="mr-2 h-4 w-4" />
              Report
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The comment will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showReportDialog && (
        <CommentReportDialog
          commentId={commentId}
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
        />
      )}
    </>
  );
}

interface CommentReportDialogProps {
  commentId: Id<"comments">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CommentReportDialog({
  commentId,
  open,
  onOpenChange,
}: CommentReportDialogProps) {
  const [reason, setReason] = useState<
    "spam" | "inappropriate" | "harassment" | "other"
  >("spam");
  const [reasonText, setReasonText] = useState("");
  const reportComment = useMutation(api.comments.reportComment);

  const handleReport = async () => {
    try {
      await reportComment({
        commentId,
        reason,
        reasonText: reason === "other" ? reasonText : undefined,
      });
      toast.success("Comment reported successfully");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to report comment");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report comment</AlertDialogTitle>
          <AlertDialogDescription>
            Why are you reporting this comment?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            {[
              { value: "spam", label: "Spam" },
              { value: "inappropriate", label: "Inappropriate content" },
              { value: "harassment", label: "Harassment" },
              { value: "other", label: "Other" },
            ].map((option) => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="reason"
                  value={option.value}
                  checked={reason === option.value}
                  onChange={(e) => setReason(e.target.value as typeof reason)}
                  className="h-4 w-4"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {reason === "other" && (
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Please describe the issue..."
              className="w-full min-h-[80px] p-2 border rounded-md"
              required
            />
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReport}
            disabled={reason === "other" && !reasonText.trim()}
          >
            Report
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
