"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, User, FileText, Eye } from "lucide-react";
import { RenderTipTapContent } from "@/lib/render-post-content";

interface PostHistoryModalProps {
  postId: Id<"posts">;
  isOpen: boolean;
  onClose: () => void;
}

interface PostVersion {
  _id: Id<"post_versions">;
  postId: Id<"posts">;
  version: number;
  title: string;
  content: string;
  editorId: Id<"members">;
  editedAt: number;
  editor: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  } | null;
}

// Helper function to format time ago
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return `${months}mo ago`;
}

// Simple diff component showing character-level changes
function SimpleDiff({ oldText, newText }: { oldText: string; newText: string }) {
  // For now, just show side-by-side comparison
  // In a real implementation, you might use a library like diff-match-patch
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Previous Version</h4>
        <div className="bg-muted/50 p-3 rounded text-sm">
          <pre className="whitespace-pre-wrap font-sans">{oldText}</pre>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Current Version</h4>
        <div className="bg-muted/50 p-3 rounded text-sm">
          <pre className="whitespace-pre-wrap font-sans">{newText}</pre>
        </div>
      </div>
    </div>
  );
}

export function PostHistoryModal({ postId, isOpen, onClose }: PostHistoryModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<PostVersion | null>(null);
  const [viewMode, setViewMode] = useState<"rendered" | "diff">("rendered");

  // Fetch post history
  const history = useQuery(api.postVersions.getPostHistory, { postId });
  const currentPost = useQuery(api.posts.getPostById, { postId });

  // Loading state
  if (history === undefined || currentPost === undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Post History</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state
  if (!currentPost) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Post History</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Post not found.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If no history exists, show message
  if (!history || history.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Post History</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No edit history available for this post.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]" data-testid="post-history-modal">
        <DialogHeader>
          <DialogTitle data-testid="history-modal-title">Post History</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
          {/* Version List */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-medium mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Edit History ({history.length} versions)
            </h3>
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {/* Current version */}
                <Card 
                  className={`cursor-pointer transition-colors ${
                    selectedVersion === null ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedVersion(null)}
                  data-testid="history-version-card"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="default">Current</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(currentPost.editedAt || currentPost.createdAt)}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium line-clamp-2 mb-2">
                      {currentPost.title}
                    </h4>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <User className="h-3 w-3 mr-1" />
                      {(currentPost.member || currentPost.author)?.firstName} {(currentPost.member || currentPost.author)?.lastName}
                    </div>
                  </CardContent>
                </Card>

                {/* Historical versions */}
                {history.map((version) => (
                  <Card 
                    key={version._id}
                    className={`cursor-pointer transition-colors ${
                      selectedVersion?._id === version._id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedVersion(version)}
                    data-testid="history-version-card"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">v{version.version}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(version.editedAt)}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium line-clamp-2 mb-2">
                        {version.title}
                      </h4>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <User className="h-3 w-3 mr-1" />
                        {version.editor?.firstName} {version.editor?.lastName}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Content View */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                {selectedVersion ? `Version ${selectedVersion.version}` : 'Current Version'}
              </h3>
              
              {selectedVersion && (
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "rendered" | "diff")}>
                  <TabsList className="grid w-full grid-cols-2 max-w-[200px]">
                    <TabsTrigger value="rendered">Rendered</TabsTrigger>
                    <TabsTrigger value="diff">Diff</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>

            <ScrollArea className="h-full">
              {selectedVersion ? (
                viewMode === "rendered" ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{selectedVersion.title}</CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={selectedVersion.editor?.avatarUrl} />
                          <AvatarFallback>
                            {selectedVersion.editor?.firstName?.[0]}{selectedVersion.editor?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        Edited by {selectedVersion.editor?.firstName} {selectedVersion.editor?.lastName}
                        <Separator orientation="vertical" className="mx-2 h-4" />
                        {new Date(selectedVersion.editedAt).toLocaleString()}
                      </div>
                    </CardHeader>
                    <CardContent data-testid="version-content">
                      <RenderTipTapContent htmlContent={selectedVersion.content} />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Content Changes</CardTitle>
                    </CardHeader>
                    <CardContent data-testid="diff-view">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Title</h4>
                          <SimpleDiff 
                            oldText={selectedVersion.title} 
                            newText={currentPost.title} 
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Content</h4>
                          <SimpleDiff 
                            oldText={selectedVersion.content} 
                            newText={currentPost.content} 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{currentPost.title}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Avatar className="h-6 w-6 mr-2">
                                        <AvatarImage src={(currentPost.member || currentPost.author)?.avatarUrl} />
                <AvatarFallback>
                  {(currentPost.member || currentPost.author)?.firstName?.[0]}{(currentPost.member || currentPost.author)?.lastName?.[0]}
                </AvatarFallback>
                      </Avatar>
                                              {currentPost.editedAt ? 'Last edited' : 'Created'} by {(currentPost.member || currentPost.author)?.firstName} {(currentPost.member || currentPost.author)?.lastName}
                      <Separator orientation="vertical" className="mx-2 h-4" />
                      {new Date(currentPost.editedAt || currentPost.createdAt).toLocaleString()}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <RenderTipTapContent htmlContent={currentPost.content} />
                  </CardContent>
                </Card>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 