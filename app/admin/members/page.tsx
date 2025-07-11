"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { MemberWithStatus, MembershipStats } from "@/types/admin";
import { format } from "date-fns";
import Image from "next/image";
import {
  Search,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  User,
  Mail,
  Calendar,
  CreditCard,
  Shield,
  DollarSign,
  Download,
  Filter,
  Eye,
  UserCheck,
  UserX,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberDetailsModal } from "@/components/admin/member-details-modal";

type SortField =
  | "name"
  | "email"
  | "joinedAt"
  | "lastActiveAt"
  | "tier"
  | "status"
  | "revenue";
type SortOrder = "asc" | "desc";

const tierConfig = {
  free: {
    label: "Free",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    price: "$0",
  },
  scholarship: {
    label: "Scholarship",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    price: "$0",
  },
  founding_member: {
    label: "Founding",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    price: "$39",
  },
  early_bird: {
    label: "Early Bird",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    price: "$50",
  },
  member: {
    label: "Member",
    color: "bg-green-100 text-green-700 border-green-200",
    price: "$99",
  },
};

const statusConfig = {
  active: {
    label: "Active",
    color: "bg-green-50 text-green-700 border-green-200",
    icon: UserCheck,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: Calendar,
  },
  churned: {
    label: "Churned",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: UserX,
  },
};

export default function AdminMembersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "cancelled" | "churned"
  >("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("joinedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedMemberId, setSelectedMemberId] =
    useState<Id<"members"> | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<Id<"members">>>(
    new Set(),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const members = useQuery(api.admin.members.getAllMembersForAdmin, {
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  }) as MemberWithStatus[] | undefined;

  const stats = useQuery(api.admin.members.getMembershipStats) as
    | MembershipStats
    | undefined;
  const grantScholarship = useMutation(
    api.admin.grantScholarship.grantScholarshipStatus,
  );
  const revokeScholarship = useMutation(
    api.admin.grantScholarship.revokeScholarshipStatus,
  );
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
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (!members || !stats) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 bg-gray-200 rounded w-32 animate-pulse mb-2" />
              <div className="h-5 bg-gray-200 rounded w-64 animate-pulse" />
            </div>
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse" />
          </div>
        </div>

        {/* Stats Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mb-2" />
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Search and filters skeleton */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-4 border-b">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
                <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Table skeleton */}
          <div className="overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <th key={i} className="px-6 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse mr-3" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse mb-1" />
                          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
            <p className="text-gray-600 mt-1">
              Manage member accounts and subscriptions
            </p>
          </div>
          <Button onClick={exportMembers} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalMembers}
              </p>
            </div>
            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Active Subscribers
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {stats.statusStats.active}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(
                  (stats.statusStats.active / stats.totalMembers) *
                  100
                ).toFixed(1)}
                % of total
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Monthly Revenue
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.revenue.formattedMrr}
              </p>
              <p className="text-xs text-gray-500 mt-1">Recurring monthly</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Churn Rate</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {(
                  (stats.statusStats.churned / stats.totalMembers) *
                  100
                ).toFixed(1)}
                %
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.statusStats.churned} churned
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
              onValueChange={(value) => setStatusFilter(value as "all" | "active" | "cancelled" | "churned")}
            >
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
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
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-gray-500">Active filters:</span>
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedMembers.size} member{selectedMembers.size > 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Gift className="w-4 h-4 mr-1" />
              Grant Scholarship
            </Button>
            <Button size="sm" variant="outline">
              <Mail className="w-4 h-4 mr-1" />
              Send Email
            </Button>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedMembers.size === paginatedMembers.length &&
                    paginatedMembers.length > 0
                  }
                  onCheckedChange={toggleAllSelection}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1 font-medium">
                  Member
                  <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("tier")}
              >
                <div className="flex items-center gap-1 font-medium">
                  Subscription
                  <SortIcon field="tier" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1 font-medium">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("joinedAt")}
              >
                <div className="flex items-center gap-1 font-medium">
                  Joined
                  <SortIcon field="joinedAt" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
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
              const statusInfo =
                statusConfig[member.status as keyof typeof statusConfig];

              return (
                <TableRow key={member._id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedMembers.has(member._id)}
                      onCheckedChange={() => toggleMemberSelection(member._id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-700 flex-shrink-0">
                        {member.avatarUrl ? (
                          <Image
                            src={member.avatarUrl}
                            alt={fullName}
                            width={40}
                            height={40}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {fullName}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {member.email}
                        </div>
                        {member.role === "admin" && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {tierInfo && (
                        <Badge
                          variant="outline"
                          className={cn("text-xs", tierInfo.color)}
                        >
                          {tierInfo.label}
                        </Badge>
                      )}
                      {member.billingInterval &&
                        member.tier !== "free" &&
                        member.tier !== "scholarship" && (
                          <div className="text-xs text-gray-500">
                            {tierInfo?.price}/
                            {member.billingInterval === "monthly" ? "mo" : "yr"}
                          </div>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", statusInfo.color)}
                    >
                      <statusInfo.icon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                    {member.status === "cancelled" &&
                      member.subscriptionEndDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          Ends{" "}
                          {format(
                            new Date(member.subscriptionEndDate),
                            "MMM d",
                          )}
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
                    {member.amountCents &&
                    member.tier !== "free" &&
                    member.tier !== "scholarship" ? (
                      <div className="text-sm font-medium">
                        ${(member.amountCents / 100).toFixed(0)}/
                        {member.billingInterval === "monthly" ? "mo" : "yr"}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMemberId(member._id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
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
                              onClick={() =>
                                grantScholarship({ memberId: member._id })
                              }
                              className="text-sm"
                            >
                              <Gift className="w-4 h-4 mr-2" />
                              Grant Scholarship
                            </DropdownMenuItem>
                          )}
                          {member.tier === "scholarship" && (
                            <DropdownMenuItem
                              onClick={() =>
                                revokeScholarship({ memberId: member._id })
                              }
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(
                currentPage * itemsPerPage,
                filteredAndSortedMembers.length,
              )}{" "}
              of {filteredAndSortedMembers.length} members
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
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
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
        <MemberDetailsModal
          memberId={selectedMemberId}
          onClose={() => setSelectedMemberId(null)}
        />
      )}
    </div>
  );
}
