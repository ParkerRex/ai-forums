"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MemberEditForm from "./member-edit-form";
import { Id } from "@/convex/_generated/dataModel";

interface Member {
  _id: Id<"members">;
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  location?: string;
  linkGithub?: string;
  linkX?: string;
  linkYouTube?: string;
}

interface MemberEditModalProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
}

export default function MemberEditModal({
  member,
  isOpen,
  onClose,
}: MemberEditModalProps) {
  const handleSuccess = () => {
    // Close modal after successful update
    // The form already shows success toast via useMutationError hook
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and social media links.
          </DialogDescription>
        </DialogHeader>

        <MemberEditForm
          member={member}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
} 