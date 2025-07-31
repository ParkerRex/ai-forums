"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/web/components/ui/dialog";
import { FileText, Clock, Star } from "lucide-react";

interface DraftsModalProps {
  children: React.ReactNode;
}

export function DraftsModal({ children }: DraftsModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Drafts</span>
          </DialogTitle>
          <DialogDescription>
            Save and manage your draft posts
          </DialogDescription>
        </DialogHeader>

        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Clock className="h-8 w-8 text-green-600" />
          </div>

          <h3 className="text-foreground mb-2 text-lg font-semibold">
            Drafts Coming Soon
          </h3>

          <p className="text-muted-foreground mx-auto mb-6 max-w-sm">
            We&apos;re working on a draft system that will let you save your
            work and come back to it later.
          </p>

          <div className="text-muted-foreground space-y-3 text-sm">
            <div className="flex items-center justify-center space-x-2">
              <Star className="h-4 w-4" />
              <span>Auto-save as you type</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Star className="h-4 w-4" />
              <span>Organize drafts by category</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Star className="h-4 w-4" />
              <span>Schedule posts for later</span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground text-xs opacity-70">
            For now, your work is automatically saved in your browser while you
            write.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DraftsModal;
