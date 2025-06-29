"use client";


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, Clock, Star } from "lucide-react";

interface DraftsModalProps {
  children: React.ReactNode;
}

export function DraftsModal({ children }: DraftsModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Drafts</span>
          </DialogTitle>
          <DialogDescription>
            Save and manage your draft posts
          </DialogDescription>
        </DialogHeader>

        <div className="py-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-green-600" />
          </div>

          <h3 className="text-lg font-semibold text-foreground mb-2">
            Drafts Coming Soon
          </h3>

          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            We&apos;re working on a draft system that will let you save your work and come back to it later.
          </p>

          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-center space-x-2">
              <Star className="w-4 h-4" />
              <span>Auto-save as you type</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Star className="w-4 h-4" />
              <span>Organize drafts by category</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Star className="w-4 h-4" />
              <span>Schedule posts for later</span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground opacity-70">
            For now, your work is automatically saved in your browser while you write.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DraftsModal; 