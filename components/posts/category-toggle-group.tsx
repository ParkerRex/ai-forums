"use client";

import { Check, ChevronDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategorySelectorItem } from "@/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface CategoryToggleGroupProps {
  categories: CategorySelectorItem[];
  value?: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
}

export function CategoryToggleGroup({
  categories,
  value,
  onChange,
  disabled = false,
}: CategoryToggleGroupProps) {
  const selectedCategory = categories.find((cat) => cat.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full max-w-sm h-12 justify-between text-left",
            !selectedCategory && "text-muted-foreground",
          )}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {selectedCategory ? (
              <>
                {selectedCategory.icon && (
                  <span className="text-base shrink-0">{selectedCategory.icon}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{selectedCategory.displayName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {selectedCategory.postCount.toLocaleString()} posts
                  </div>
                </div>
              </>
            ) : (
              <span>Select a category...</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-w-sm max-h-[300px] overflow-y-auto">
        {categories.map((category) => {
          const isSelected = value === category.id;

          return (
            <DropdownMenuItem
              key={category.id}
              onClick={() => onChange(category.id)}
              className="flex items-center space-x-3 p-3 cursor-pointer"
            >
              {/* Icon */}
              {category.icon && <span className="text-base shrink-0">{category.icon}</span>}

              {/* Name and Description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm">{category.displayName}</span>
                  {category.isTrending && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                    >
                      <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                      Hot
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {category.description}
                </div>
              </div>

              {/* Post Count and Selection */}
              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {category.postCount.toLocaleString()}
                </span>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
