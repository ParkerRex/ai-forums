"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, Check, Edit2 } from "lucide-react";

interface PreviewGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (preview: string) => void;
  title: string;
  isGenerating: boolean;
  generatedPreview: string | null;
  error?: string | null;
}

export function PreviewGenerationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  isGenerating,
  generatedPreview,
  error,
}: PreviewGenerationDialogProps) {
  const [editedPreview, setEditedPreview] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  // Update edited preview when generated preview changes
  useEffect(() => {
    if (generatedPreview) {
      setEditedPreview(generatedPreview);
    }
  }, [generatedPreview]);

  const handleConfirm = () => {
    const finalPreview = isEditing ? editedPreview : generatedPreview || "";
    onConfirm(finalPreview);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedPreview(generatedPreview || "");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedPreview(generatedPreview || "");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {isGenerating ? "Generating Magic Preview" : "Preview Your Post"}
          </DialogTitle>
          <DialogDescription>
            {isGenerating
              ? "Creating an engaging preview for your post..."
              : "Here's how your post will appear to non-members:"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <p className="text-sm text-muted-foreground animate-pulse">
                Analyzing your content...
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {generatedPreview && !isGenerating && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Post Title</h4>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">{title}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Preview Text</h4>
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEdit}
                      className="h-7 text-xs"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedPreview}
                      onChange={(e) => setEditedPreview(e.target.value)}
                      placeholder="Edit your preview..."
                      className="min-h-[80px] resize-none"
                      rows={3}
                      maxLength={280}
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {editedPreview.length}/280 characters
                      </span>
                      <div className="space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-6 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(false)}
                          className="h-6 text-xs"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {editedPreview || generatedPreview}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {(editedPreview || generatedPreview).length}/280
                      characters
                    </p>
                  </div>
                )}
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  This preview will be shown to non-members and in post
                  listings. It helps readers understand what your post is about.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isGenerating || !generatedPreview}
            className="bg-green-700 hover:bg-green-800"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Looks Good, Publish
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
