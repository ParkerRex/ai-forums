"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Member {
  _id: string;
  name?: string;
  email: string;
  bio?: string;
  profileImage?: string;
  postCount?: number;
  joinedAt?: number;
}

interface MembersDisplayProps {
  members: Member[];
  view?: "grid" | "list";
  isLoading?: boolean;
}

export default function MembersDisplay({
  members,
  view = "grid",
}: MembersDisplayProps) {
  if (view === "list") {
    return (
      <div className="space-y-4">
        {members.map((member) => (
          <Link
            key={member._id}
            href={`/members/${member.name?.toLowerCase().replace(/\s+/g, "-") || member.email}`}
          >
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={member.profileImage}
                    alt={member.name || member.email}
                  />
                  <AvatarFallback>
                    {(member.name || member.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {member.name || member.email}
                  </h3>
                  {member.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {member.bio}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2">
                    <span className="text-sm text-muted-foreground">
                      {member.postCount || 0} posts
                    </span>
                    {member.joinedAt && (
                      <span className="text-sm text-muted-foreground">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {members.map((member) => (
        <Link
          key={member._id}
          href={`/members/${member.name?.toLowerCase().replace(/\s+/g, "-") || member.email}`}
        >
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={member.profileImage}
                    alt={member.name || member.email}
                  />
                  <AvatarFallback>
                    {(member.name || member.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">
                    {member.name || member.email}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {member.postCount || 0} posts
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {member.bio && (
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {member.bio}
                </p>
              </CardContent>
            )}
          </Card>
        </Link>
      ))}
    </div>
  );
}
