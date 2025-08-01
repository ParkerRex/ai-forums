"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../components/ui/avatar";
import Link from "next/link";
import { memberProfileUrl } from "@/lib/slug-utils";
import { Id } from "@/web/convex/_generated/dataModel";

export function OnlineUsers() {
  const onlineMembers = useQuery(api.members.getOnlineMembers);

  if (!onlineMembers || onlineMembers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        Online Now ({onlineMembers.length})
      </h3>
      <div className="space-y-1">
        {onlineMembers.map(
          (member: {
            _id: Id<"members">;
            firstName: string;
            lastName: string;
            avatarUrl?: string;
            fullName: string;
            initials: string;
            slug: string;
          }) => {
            const memberUrl = memberProfileUrl({
              slug: member.slug,
              _id: member._id,
            });

            return (
              <Link
                key={member._id}
                href={memberUrl}
                className="flex items-center space-x-2 py-1 text-xs text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={member.avatarUrl || ""}
                    alt={member.fullName}
                  />
                  <AvatarFallback className="text-[10px]">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{member.fullName}</span>
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-green-500"></div>
              </Link>
            );
          },
        )}
      </div>
    </div>
  );
}
