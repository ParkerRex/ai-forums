"use client";

import { format } from "date-fns";
import { Eye, Mail, MoreVertical, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateMemberRole } from "@/hooks/use-admin";
import { tierConfig } from "@/lib/admin-config";
import { getMemberDisplayName, getMemberInitials } from "@/lib/admin-utils";
import { cn } from "@/lib/utils";

interface MemberCardProps {
  member: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    role?: "user" | "admin";
    tier?: "founding_member" | "early_bird" | "member";
    status?: "active" | "churned";
    joinedDate?: number;
    bio?: string;
  };
  isSelected?: boolean;
  onSelect?: (memberId: string) => void;
  onViewDetails?: (memberId: string) => void;
  variant?: "card" | "list";
}

export function MemberCard({
  member,
  isSelected = false,
  onSelect,
  onViewDetails,
  variant = "card",
}: MemberCardProps) {
  const updateRoleMutation = useUpdateMemberRole();

  const memberId = member.id;
  const fullName = getMemberDisplayName(member);
  const initials = getMemberInitials(member);

  const tierInfo = member.tier ? tierConfig[member.tier as keyof typeof tierConfig] : null;

  const handleUpdateRole = (role: "admin" | "user") => {
    updateRoleMutation.mutate({ memberId, role });
  };

  if (variant === "list") {
    // Simplified list view for use in tables
    return (
      <div className="flex items-center gap-4 border-b p-4 hover:bg-gray-50">
        {onSelect && <Checkbox checked={isSelected} onCheckedChange={() => onSelect(memberId)} />}
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatarUrl} alt={fullName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-gray-900">{fullName}</div>
          <div className="truncate text-sm text-gray-500">{member.email}</div>
        </div>
        <div className="flex items-center gap-2">
          {tierInfo && (
            <Badge variant="outline" className={cn("text-xs", tierInfo.color)}>
              {tierInfo.label}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => onViewDetails?.(memberId)}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Full card view
  return (
    <Card className="relative transition-shadow hover:shadow-md">
      {onSelect && (
        <div className="absolute left-4 top-4 z-10">
          <Checkbox checked={isSelected} onCheckedChange={() => onSelect(memberId)} />
        </div>
      )}

      <CardHeader className={cn(onSelect && "pl-12")}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={member.avatarUrl} alt={fullName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{fullName}</CardTitle>
              <CardDescription>{member.email}</CardDescription>
              {member.role === "admin" && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  <Shield className="mr-1 h-3 w-3" />
                  Admin
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-sm">
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {member.role !== "admin" && (
                <DropdownMenuItem onClick={() => handleUpdateRole("admin")} className="text-sm">
                  <Shield className="mr-2 h-4 w-4" />
                  Make Admin
                </DropdownMenuItem>
              )}
              {member.role === "admin" && (
                <DropdownMenuItem
                  onClick={() => handleUpdateRole("user")}
                  className="text-sm text-red-600"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Remove Admin
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {member.bio && <p className="mb-4 line-clamp-2 text-sm text-gray-600">{member.bio}</p>}

        <div className="space-y-3">
          {tierInfo && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Membership</span>
              <Badge variant="outline" className={cn("text-xs", tierInfo.color)}>
                {tierInfo.label}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Joined</span>
            <span className="text-sm">
              {member.joinedDate ? format(new Date(member.joinedDate), "MMM d, yyyy") : "Unknown"}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-gray-50">
        <Button variant="outline" className="w-full" onClick={() => onViewDetails?.(memberId)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
