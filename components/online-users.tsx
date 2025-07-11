"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import Link from "next/link";
import { memberProfileUrl } from "@/lib/slug-utils";
import { Id } from "@/convex/_generated/dataModel";

export function OnlineUsers() {
  const onlineMembers = useQuery(api.members.getOnlineMembers);

  if (!onlineMembers || onlineMembers.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center">
          <Users className="w-4 h-4 mr-1.5" />
          Online Now ({onlineMembers.length})
        </h3>
      </div>
      <div className="text-xs space-y-1">
        {onlineMembers.map((member: {
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
            _id: member._id 
          });
          
          return (
            <div key={member._id} className="group">
              <Link 
                href={memberUrl} 
                className="flex items-center space-x-2 hover:text-blue-600 transition-colors"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={member.avatarUrl || ""}
                    alt={member.fullName}
                  />
                  <AvatarFallback className="text-[10px]">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex-1 leading-tight truncate">{member.fullName}</span>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    <span className="text-[10px]">[Member]</span>
                    <span className="ml-2">Online</span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
