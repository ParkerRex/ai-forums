"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import Link from "next/link";
import { memberProfileUrl } from "@/lib/slug-utils";

export function OnlineUsers() {
  const onlineMembers = useQuery(api.members.getOnlineMembers);

  if (!onlineMembers || onlineMembers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Online Now ({onlineMembers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
          {onlineMembers.map((member) => {
            const memberUrl = memberProfileUrl({ 
              slug: member.slug, 
              _id: member._id 
            });
            
            return (
              <Link 
                key={member._id} 
                href={memberUrl} 
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <Avatar className="h-[46px] w-[46px] border-2 border-background shadow-sm">
                  <AvatarImage
                    src={member.avatarUrl || ""}
                    alt={member.fullName}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {member.fullName}
                  </p>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs text-muted-foreground">Online</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
