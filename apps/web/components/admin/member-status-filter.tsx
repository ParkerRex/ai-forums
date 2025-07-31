"use client";

import { Filter, X, Search } from "lucide-react";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";
import { Input } from "@/web/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/web/components/ui/select";
import { tierConfig } from "@/lib/admin-config";

export type StatusFilter = "all" | "active" | "cancelled" | "churned";
export type TierFilter = "all" | "founding_member" | "early_bird" | "member";

interface MemberStatusFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  tierFilter: TierFilter;
  onTierFilterChange: (value: TierFilter) => void;
  showSearch?: boolean;
  showTierFilter?: boolean;
  className?: string;
}

const statusLabels: Record<StatusFilter, string> = {
  all: "All Status",
  active: "Active",
  cancelled: "Cancelled",
  churned: "Churned",
};

export function MemberStatusFilter({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  tierFilter,
  onTierFilterChange,
  showSearch = true,
  showTierFilter = true,
  className = "",
}: MemberStatusFilterProps) {
  const hasActiveFilters =
    statusFilter !== "all" || tierFilter !== "all" || search;

  const clearAllFilters = () => {
    onSearchChange("");
    onStatusFilterChange("all");
    onTierFilterChange("all");
  };

  return (
    <div
      className={`rounded-none border border-gray-200 bg-white p-4 ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Search */}
        {showSearch && (
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              onStatusFilterChange(value as StatusFilter)
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
          {showTierFilter && (
            <Select
              value={tierFilter}
              onValueChange={(value) => onTierFilterChange(value as TierFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="founding_member">Founding</SelectItem>
                <SelectItem value="early_bird">Early Bird</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Active filters */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {statusFilter !== "all" && (
            <Badge
              variant="secondary"
              className="cursor-pointer text-xs hover:bg-gray-200"
              onClick={() => onStatusFilterChange("all")}
            >
              Status: {statusLabels[statusFilter]}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {tierFilter !== "all" && (
            <Badge
              variant="secondary"
              className="cursor-pointer text-xs hover:bg-gray-200"
              onClick={() => onTierFilterChange("all")}
            >
              Tier: {tierConfig[tierFilter as keyof typeof tierConfig]?.label}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {search && (
            <Badge
              variant="secondary"
              className="cursor-pointer text-xs hover:bg-gray-200"
              onClick={() => onSearchChange("")}
            >
              Search: {search}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs hover:bg-gray-100"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

// Status filter badges component for compact display
interface StatusFilterBadgesProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  counts?: {
    active: number;
    cancelled: number;
    churned: number;
    total: number;
  };
}

export function StatusFilterBadges({
  statusFilter,
  onStatusFilterChange,
  counts,
}: StatusFilterBadgesProps) {
  const filters: StatusFilter[] = ["all", "active", "cancelled", "churned"];

  return (
    <div className="flex gap-2">
      {filters.map((filter) => {
        const isActive = statusFilter === filter;
        const count =
          filter === "all"
            ? counts?.total
            : counts?.[filter as keyof Omit<typeof counts, "total">];

        return (
          <Badge
            key={filter}
            variant={isActive ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${
              isActive ? "" : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => onStatusFilterChange(filter)}
          >
            {statusLabels[filter]}
            {count !== undefined && <span className="ml-1">({count})</span>}
          </Badge>
        );
      })}
    </div>
  );
}
