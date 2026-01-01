"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOnlineMembers } from "@/hooks/use-members";
import { memberProfileUrl } from "@/lib/slug-utils";

export function OnlineUsers() {
  const { data: onlineMembers } = useOnlineMembers();

  if (!onlineMembers || onlineMembers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        Online Now ({onlineMembers.length})
      </h3>
      <div className="space-y-1">
        {onlineMembers.map((member) => {
          const fullName = `${member.firstName} ${member.lastName}`.trim();
          const initials = `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`;
          const memberUrl = memberProfileUrl({
            slug: member.slug,
            id: member.id,
          });

          return (
            <Link
              key={member.id}
              href={memberUrl}
              className="flex items-center space-x-2 text-xs py-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.avatarUrl || ""} alt={fullName} />
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="truncate">{fullName}</span>
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full ml-auto"></div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
