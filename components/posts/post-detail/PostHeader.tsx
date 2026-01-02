"use client";

import { Edit } from "lucide-react";
import Link from "next/link";
import { MemberHoverCardWrapper } from "@/components/members/member-hover-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memberProfileUrl } from "@/lib/utils";
import { PostActionsMenu } from "./PostActionsMenu";
import type { Post } from "./types";
import { getTimeAgo } from "./utils";

interface PostHeaderProps {
  post: Post;
  isAdmin: boolean;
  isMemberPost: boolean;
  isEditing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewHistory?: () => void;
}

export function PostHeader({
  post,
  isAdmin,
  isMemberPost,
  isEditing,
  onEdit,
  onDelete,
  onViewHistory,
}: PostHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-grow">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
          <MemberHoverCardWrapper
            member={
              post.member
                ? {
                    id: post.member.id,
                    firstName: post.member.firstName,
                    lastName: post.member.lastName,
                    slug: post.member.slug ?? undefined,
                    username: post.member.username ?? undefined,
                    avatarUrl: post.member.avatarUrl,
                  }
                : null
            }
          >
            <Link
              href={
                post.member
                  ? memberProfileUrl({
                      slug: post.member!.slug!,
                      id: post.member!.id,
                    })
                  : "#"
              }
              className="text-foreground font-semibold hover:underline"
              data-testid="member-link"
            >
              {post.member ? `${post.member.firstName} ${post.member.lastName}` : "unknown"}
            </Link>
          </MemberHoverCardWrapper>
          <span className="text-gray-400 dark:text-gray-600">•</span>
          <span>{getTimeAgo(post.createdAt)}</span>
          {post.editedAt && <span className="italic">(edited)</span>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-foreground text-xl font-bold leading-tight sm:text-2xl">
            {post.title}
          </h1>
          {isMemberPost && !isEditing && (
            <Button variant="outline" size="sm" onClick={onEdit} className="ml-2">
              <Edit className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
        {post.isPinned && (
          <Badge variant="secondary" className="mt-3">
            Pinned
          </Badge>
        )}
      </div>
      {!isEditing && (
        <PostActionsMenu
          post={post}
          isAdmin={isAdmin}
          isMemberPost={isMemberPost}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewHistory={onViewHistory}
        />
      )}
    </div>
  );
}
