"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import {
  Mail,
  Shield,
  Gift,
  UserX,
  Eye,
  MoreVertical,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { tierConfig, memberStatusConfig } from "@/lib/admin-config";
import { 
  getMemberDisplayName, 
  getMemberInitials, 
  getMemberStatus,
  shouldShowBilling,
  formatTierPrice 
} from "@/lib/admin-utils";
import { formatCentsAsCurrency } from "@/lib/format";

interface MemberCardProps {
  member: {
    _id: Id<"members">;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    role?: "user" | "admin";
    tier?: "free" | "scholarship" | "founding_member" | "early_bird" | "member";
    billingInterval?: "monthly" | "yearly";
    status?: "active" | "cancelled" | "churned" | "free" | "duplicate";
    subscriptionStatus?: "active" | "cancelled" | "past_due" | "expired";
    subscriptionEndDate?: number;
    joinedDate?: number;
    amountCents?: number;
    bio?: string;
  };
  isSelected?: boolean;
  onSelect?: (memberId: Id<"members">) => void;
  onViewDetails?: (memberId: Id<"members">) => void;
  variant?: "card" | "list";
}

export function MemberCard({
  member,
  isSelected = false,
  onSelect,
  onViewDetails,
  variant = "card",
}: MemberCardProps) {
  const grantScholarship = useMutation(
    api.admin.grantScholarship.grantScholarshipStatus
  );
  const revokeScholarship = useMutation(
    api.admin.grantScholarship.revokeScholarshipStatus
  );
  const updateRole = useMutation(api.admin.members.updateMemberRole);

  const fullName = getMemberDisplayName(member);
  const initials = getMemberInitials(member);
  const status = getMemberStatus(member);
  
  const tierInfo = member.tier
    ? tierConfig[member.tier as keyof typeof tierConfig]
    : null;
  
  const statusInfo = memberStatusConfig[status as keyof typeof memberStatusConfig];

  if (variant === "list") {
    // Simplified list view for use in tables
    return (
      <div className="flex items-center gap-4 p-4 border-b hover:bg-gray-50">
        {onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(member._id)}
          />
        )}
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatarUrl} alt={fullName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{fullName}</div>
          <div className="text-sm text-gray-500 truncate">{member.email}</div>
        </div>
        <div className="flex items-center gap-2">
          {tierInfo && (
            <Badge variant="outline" className={cn("text-xs", tierInfo.color)}>
              {tierInfo.label}
            </Badge>
          )}
          <Badge variant="outline" className={cn("text-xs", statusInfo.color)}>
            <statusInfo.icon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails?.(member._id)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Full card view
  return (
    <Card className="relative hover:shadow-md transition-shadow">
      {onSelect && (
        <div className="absolute top-4 left-4 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(member._id)}
          />
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
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {member.tier !== "scholarship" && (
                <DropdownMenuItem
                  onClick={() => grantScholarship({ memberId: member._id })}
                  className="text-sm"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Grant Scholarship
                </DropdownMenuItem>
              )}
              {member.tier === "scholarship" && (
                <DropdownMenuItem
                  onClick={() => revokeScholarship({ memberId: member._id })}
                  className="text-sm"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Revoke Scholarship
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-sm">
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {member.role !== "admin" && (
                <DropdownMenuItem
                  onClick={() =>
                    updateRole({
                      memberId: member._id,
                      role: "admin",
                    })
                  }
                  className="text-sm"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Make Admin
                </DropdownMenuItem>
              )}
              {member.role === "admin" && (
                <DropdownMenuItem
                  onClick={() =>
                    updateRole({
                      memberId: member._id,
                      role: "user",
                    })
                  }
                  className="text-sm text-red-600"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Remove Admin
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {member.bio && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{member.bio}</p>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Membership</span>
            <div className="flex items-center gap-2">
              {tierInfo && (
                <Badge
                  variant="outline"
                  className={cn("text-xs", tierInfo.color)}
                >
                  {tierInfo.label}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn("text-xs", statusInfo.color)}
              >
                <statusInfo.icon className="w-3 h-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          {shouldShowBilling(member) && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Billing</span>
                <span className="text-sm font-medium">
                  {formatTierPrice(member.tier!, member.billingInterval!, member.amountCents)}
                </span>
              </div>
            )}

          {member.status === "cancelled" && member.subscriptionEndDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Ends</span>
              <span className="text-sm font-medium">
                {format(new Date(member.subscriptionEndDate), "MMM d, yyyy")}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Joined</span>
            <span className="text-sm">
              {member.joinedDate
                ? format(new Date(member.joinedDate), "MMM d, yyyy")
                : "Unknown"}
            </span>
          </div>

          {member.amountCents &&
            member.tier !== "free" &&
            member.tier !== "scholarship" && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  <DollarSign className="w-3 h-3 inline mr-1" />
                  Revenue
                </span>
                <span className="text-sm font-medium">
                  ${(member.amountCents / 100).toFixed(0)}/
                  {member.billingInterval === "monthly" ? "mo" : "yr"}
                </span>
              </div>
            )}
        </div>
      </CardContent>

      <CardFooter className="bg-gray-50">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onViewDetails?.(member._id)}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}