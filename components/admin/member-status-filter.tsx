"use client";

import { Filter, X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tierConfig } from "@/lib/admin-config";

export type StatusFilter = "all" | "active" | "cancelled" | "churned";
export type TierFilter = "all" | "free" | "scholarship" | "founding_member" | "early_bird" | "member";

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
  const hasActiveFilters = statusFilter !== "all" || tierFilter !== "all" || search;

  const clearAllFilters = () => {
    onSearchChange("");
    onStatusFilterChange("all");
    onTierFilterChange("all");
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        {showSearch && (
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
            onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}
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
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="scholarship">Scholarship</SelectItem>
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
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-sm text-gray-500">Active filters:</span>
          {statusFilter !== "all" && (
            <Badge
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-gray-200"
              onClick={() => onStatusFilterChange("all")}
            >
              Status: {statusLabels[statusFilter]}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
          {tierFilter !== "all" && (
            <Badge
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-gray-200"
              onClick={() => onTierFilterChange("all")}
            >
              Tier: {tierConfig[tierFilter as keyof typeof tierConfig]?.label}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
          {search && (
            <Badge
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-gray-200"
              onClick={() => onSearchChange("")}
            >
              Search: {search}
              <X className="w-3 h-3 ml-1" />
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
        const count = filter === "all" 
          ? counts?.total 
          : counts?.[filter as keyof Omit<typeof counts, "total">];
        
        return (
          <Badge
            key={filter}
            variant={isActive ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${
              isActive 
                ? "" 
                : "hover:bg-gray-100 text-gray-600"
            }`}
            onClick={() => onStatusFilterChange(filter)}
          >
            {statusLabels[filter]}
            {count !== undefined && (
              <span className="ml-1">({count})</span>
            )}
          </Badge>
        );
      })}
    </div>
  );
}