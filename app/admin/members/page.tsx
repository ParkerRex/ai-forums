"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  Filter,
  Gift,
  Mail,
  MoreVertical,
  Search,
  Shield,
  User,
  UserCheck,
  UserX,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { MemberDetailsModal } from "@/components/admin/member-details-modal";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import type { MembershipStats, MemberWithStatus } from "@/types/admin";

type SortField = "name" | "email" | "joinedAt" | "lastActiveAt" | "tier" | "status" | "revenue";
type SortOrder = "asc" | "desc";

// Note: No free tier - platform operates with zero free users
// Scholarships handled via Stripe coupons with early_bird tier
const tierConfig = {
  founding_member: {
    label: "Founding",
    color: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    price: "$39",
  },
  early_bird: {
    label: "Early Bird",
    color: "bg-chart-1/10 text-chart-1 border-chart-1/20",
    price: "$50",
  },
  member: {
    label: "Member",
    color: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    price: "$99",
  },
};

const statusConfig = {
  active: {
    label: "Active",
    color: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    icon: UserCheck,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    icon: Calendar,
  },
  churned: {
    label: "Churned",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: UserX,
  },
};

export default function AdminMembersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled" | "churned">(
    "all",
  );
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("joinedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedMemberId, setSelectedMemberId] = useState<Id<"members"> | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<Id<"members">>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const members = useQuery(api.admin.members.getAllMembersForAdmin, {
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  }) as MemberWithStatus[] | undefined;

  const stats = useQuery(api.admin.members.getMembershipStats) as MembershipStats | undefined;
  // Note: Scholarships now handled via Stripe coupons, not mutations
  const updateRole = useMutation(api.admin.members.updateMemberRole);

  // Client-side filtering and sorting
  const filteredAndSortedMembers = useMemo(() => {
    if (!members) return [];

    let filtered = [...members];

    // Apply tier filter
    if (tierFilter !== "all") {
      filtered = filtered.filter((m) => m.tier === tierFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | number | undefined, bVal: string | number | undefined;

      switch (sortField) {
        case "name":
          aVal = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
          bVal = `${b.firstName || ""} ${b.lastName || ""}`.toLowerCase();
          break;
        case "email":
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case "joinedAt":
          aVal = a.joinedDate || 0;
          bVal = b.joinedDate || 0;
          break;
        case "lastActiveAt":
          aVal = 0; // No lastActive field in schema
          bVal = 0;
          break;
        case "tier":
          aVal = a.tier || "free";
          bVal = b.tier || "free";
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "revenue":
          aVal = a.amountCents || 0;
          bVal = b.amountCents || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [members, tierFilter, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedMembers.length / itemsPerPage);
  const paginatedMembers = filteredAndSortedMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const toggleMemberSelection = (memberId: Id<"members">) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedMembers.size === paginatedMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(paginatedMembers.map((m) => m._id)));
    }
  };

  const exportMembers = () => {
    const data = filteredAndSortedMembers.map((m) => ({
      name: `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.email,
      email: m.email,
      tier: m.tier,
      status: m.status,
      billing: m.billingInterval,
      joined: m.joinedDate ? format(new Date(m.joinedDate), "yyyy-MM-dd") : "",
      lastActive: "", // No lastActive field in schema
    }));

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  if (!members || !stats) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="bg-muted mb-2 h-8 w-32 animate-pulse rounded" />
              <div className="bg-muted h-5 w-64 animate-pulse rounded" />
            </div>
            <div className="bg-muted h-10 w-24 animate-pulse rounded" />
          </div>
        </div>

        {/* Stats Cards skeleton */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border-border rounded-none border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="bg-muted mb-2 h-4 w-24 animate-pulse rounded" />
                  <div className="bg-muted h-8 w-16 animate-pulse rounded" />
                </div>
                <div className="bg-muted h-12 w-12 animate-pulse rounded-none" />
              </div>
            </div>
          ))}
        </div>

        {/* Search and filters skeleton */}
        <div className="bg-card mb-6 rounded-none shadow-sm">
          <div className="border-b p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="bg-muted h-10 flex-1 animate-pulse rounded" />
              <div className="flex gap-2">
                <div className="bg-muted h-10 w-32 animate-pulse rounded" />
                <div className="bg-muted h-10 w-32 animate-pulse rounded" />
              </div>
            </div>
          </div>

          {/* Table skeleton */}
          <div className="overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-muted/50">
                <tr>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <th key={i} className="px-6 py-3">
                      <div className="bg-muted h-4 animate-pulse rounded" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card divide-border divide-y">
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="bg-muted mr-3 h-10 w-10 animate-pulse rounded-full" />
                        <div className="flex-1">
                          <div className="bg-muted mb-1 h-4 w-32 animate-pulse rounded" />
                          <div className="bg-muted h-3 w-24 animate-pulse rounded" />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="whitespace-nowrap px-6 py-4">
                        <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Members</h1>
            <p className="text-muted-foreground mt-1">Manage member accounts and subscriptions</p>
          </div>
          <Button onClick={exportMembers} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="bg-card border-border rounded-none border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Total Members</p>
              <p className="text-foreground mt-1 text-2xl font-bold">{stats.totalMembers}</p>
            </div>
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-none">
              <User className="text-muted-foreground h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border-border rounded-none border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Active Subscribers</p>
              <p className="text-chart-2 mt-1 text-2xl font-bold">{stats.statusStats.active}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {((stats.statusStats.active / stats.totalMembers) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="bg-chart-2/10 flex h-12 w-12 items-center justify-center rounded-none">
              <CreditCard className="text-chart-2 h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border-border rounded-none border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Monthly Revenue</p>
              <p className="text-foreground mt-1 text-2xl font-bold">
                {stats.revenue.formattedMrr}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">Recurring monthly</p>
            </div>
            <div className="bg-chart-1/10 flex h-12 w-12 items-center justify-center rounded-none">
              <DollarSign className="text-chart-1 h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-card border-border rounded-none border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Churn Rate</p>
              <p className="text-destructive mt-1 text-2xl font-bold">
                {((stats.statusStats.churned / stats.totalMembers) * 100).toFixed(1)}%
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {stats.statusStats.churned} churned
              </p>
            </div>
            <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-none">
              <UserX className="text-destructive h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-card border-border mb-6 rounded-none border p-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "all" | "active" | "cancelled" | "churned")
              }
            >
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="churned">Churned</SelectItem>
              </SelectContent>
            </Select>

            {/* Tier Filter */}
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="scholarship">Scholarship</SelectItem>
                <SelectItem value="founding_member">Founding</SelectItem>
                <SelectItem value="early_bird">Early Bird</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active filters */}
        {(statusFilter !== "all" || tierFilter !== "all" || search) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Active filters:</span>
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Status: {statusFilter}
              </Badge>
            )}
            {tierFilter !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Tier: {tierConfig[tierFilter as keyof typeof tierConfig]?.label}
              </Badge>
            )}
            {search && (
              <Badge variant="secondary" className="text-xs">
                Search: {search}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setTierFilter("all");
                setSearch("");
              }}
              className="text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedMembers.size > 0 && (
        <div className="bg-primary/5 border-primary/20 mb-4 flex items-center justify-between rounded-none border p-3">
          <span className="text-primary text-sm">
            {selectedMembers.size} member{selectedMembers.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Gift className="mr-1 h-4 w-4" />
              Grant Scholarship
            </Button>
            <Button size="sm" variant="outline">
              <Mail className="mr-1 h-4 w-4" />
              Send Email
            </Button>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-card border-border overflow-hidden rounded-none border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedMembers.size === paginatedMembers.length && paginatedMembers.length > 0
                  }
                  onCheckedChange={toggleAllSelection}
                />
              </TableHead>
              <TableHead
                className="hover:bg-muted cursor-pointer"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1 font-medium">
                  Member
                  <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead
                className="hover:bg-muted cursor-pointer"
                onClick={() => handleSort("tier")}
              >
                <div className="flex items-center gap-1 font-medium">
                  Subscription
                  <SortIcon field="tier" />
                </div>
              </TableHead>
              <TableHead
                className="hover:bg-muted cursor-pointer"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1 font-medium">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead
                className="hover:bg-muted cursor-pointer"
                onClick={() => handleSort("joinedAt")}
              >
                <div className="flex items-center gap-1 font-medium">
                  Joined
                  <SortIcon field="joinedAt" />
                </div>
              </TableHead>
              <TableHead
                className="hover:bg-muted cursor-pointer"
                onClick={() => handleSort("revenue")}
              >
                <div className="flex items-center gap-1 font-medium">
                  Revenue
                  <SortIcon field="revenue" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMembers.map((member) => {
              const fullName =
                member.firstName && member.lastName
                  ? `${member.firstName} ${member.lastName}`
                  : member.email.split("@")[0];
              const initials =
                `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`.toUpperCase() ||
                member.email[0].toUpperCase();
              const tierInfo = member.tier
                ? tierConfig[member.tier as keyof typeof tierConfig]
                : null;
              const statusInfo = statusConfig[member.status as keyof typeof statusConfig];

              return (
                <TableRow key={member._id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedMembers.has(member._id)}
                      onCheckedChange={() => toggleMemberSelection(member._id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-muted text-muted-foreground flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium">
                        {member.avatarUrl ? (
                          <Image
                            src={member.avatarUrl}
                            alt={fullName}
                            width={40}
                            height={40}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-foreground truncate font-medium">{fullName}</div>
                        <div className="text-muted-foreground truncate text-sm">{member.email}</div>
                        {member.role === "admin" && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {tierInfo && (
                        <Badge variant="outline" className={cn("text-xs", tierInfo.color)}>
                          {tierInfo.label}
                        </Badge>
                      )}
                      {member.billingInterval && (
                        <div className="text-muted-foreground text-xs">
                          {tierInfo?.price}/{member.billingInterval === "monthly" ? "mo" : "yr"}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", statusInfo.color)}>
                      <statusInfo.icon className="mr-1 h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                    {member.status === "cancelled" && member.subscriptionEndDate && (
                      <div className="text-muted-foreground mt-1 text-xs">
                        Ends {format(new Date(member.subscriptionEndDate), "MMM d")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {member.joinedDate
                        ? format(new Date(member.joinedDate), "MMM d, yyyy")
                        : "Unknown"}
                    </div>
                    {/* No lastActive field in schema */}
                  </TableCell>
                  <TableCell>
                    {member.amountCents ? (
                      <div className="text-sm font-medium">
                        ${(member.amountCents / 100).toFixed(0)}/
                        {member.billingInterval === "monthly" ? "mo" : "yr"}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMemberId(member._id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {/* Note: Scholarships now handled via Stripe coupons, not tier-based */}
                          <DropdownMenuItem className="text-sm">
                            <Mail className="mr-2 h-4 w-4" />
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
                              <Shield className="mr-2 h-4 w-4" />
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
                              className="text-destructive text-sm"
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Remove Admin
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-border flex items-center justify-between border-t px-4 py-3">
            <div className="text-muted-foreground text-sm">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredAndSortedMembers.length)} of{" "}
              {filteredAndSortedMembers.length} members
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      {selectedMemberId && (
        <MemberDetailsModal memberId={selectedMemberId} onClose={() => setSelectedMemberId(null)} />
      )}
    </div>
  );
}
