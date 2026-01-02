"use client";

import { ExternalLink, FileText, Lock, MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearch } from "@/hooks/use-search";
import { useSearchHotkey } from "@/hooks/use-search-hotkey";
import { memberProfileUrl } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "post" | "comment" | "link";
  title?: string;
  content?: string;
  link?: string;
  domain?: string;
  restricted?: boolean;
  slug?: string;
  categoryName?: string;
  postId?: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    slug: string;
  };
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function highlightMatch(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm.trim()) return text;

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark
        key={index}
        className="bg-muted/50 dark:bg-muted/30 text-foreground font-medium rounded-sm px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function SearchResultItem({
  result,
  searchTerm,
  onSelect,
}: {
  result: SearchResult;
  searchTerm: string;
  onSelect: (result: SearchResult) => void;
}) {
  const handleSelect = useCallback(() => {
    if (result.restricted) {
      return;
    }
    onSelect(result);
  }, [result, onSelect]);

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "post":
        return "default";
      case "comment":
        return "secondary";
      case "link":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "post":
        return <FileText className="w-4 h-4" />;
      case "comment":
        return <MessageSquare className="w-4 h-4" />;
      case "link":
        return <ExternalLink className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const renderContent = () => {
    if (result.type === "post") {
      return (
        <div className="flex-1">
          <div className="font-medium">{highlightMatch(result.title || "", searchTerm)}</div>
          <div className="text-sm text-muted-foreground">/{result.categoryName}</div>
        </div>
      );
    }

    if (result.type === "comment") {
      const preview =
        result.content?.slice(0, 80) + (result.content && result.content.length > 80 ? "..." : "");
      return (
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {result.member && (
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-xs">
                  {result.member.firstName[0]}
                  {result.member.lastName[0]}
                </AvatarFallback>
              </Avatar>
            )}
            {result.member ? (
              <Link
                href={memberProfileUrl({
                  slug: result.member.slug,
                  id: result.member.id,
                })}
                className="text-sm font-medium"
                data-testid="member-link"
              >
                {result.member.username}
              </Link>
            ) : (
              <span className="text-sm font-medium">Unknown</span>
            )}
          </div>
          <div className="text-sm">{highlightMatch(preview || "", searchTerm)}</div>
        </div>
      );
    }

    if (result.type === "link") {
      return (
        <div className="flex-1">
          <div className="font-medium">{result.domain}</div>
          <div className="text-sm text-muted-foreground truncate">{result.link}</div>
        </div>
      );
    }

    return null;
  };

  const item = (
    <CommandItem
      key={result.id}
      value={
        result.type === "post"
          ? `${result.title ?? ""}`
          : result.type === "comment"
            ? `${result.content ?? ""}`
            : result.type === "link"
              ? `${result.link ?? ""}`
              : ""
      }
      onSelect={handleSelect}
      className={`flex items-center gap-3 p-3 data-[selected=true]:bg-muted data-[selected=true]:text-foreground ${result.restricted ? "opacity-60" : ""}`}
    >
      <div className="shrink-0">{getIcon(result.type)}</div>

      {renderContent()}

      <div className="flex items-center gap-2 shrink-0">
        {result.restricted && <Lock className="w-4 h-4 text-muted-foreground" />}
        <Badge variant={getBadgeVariant(result.type)}>
          {result.restricted && result.type !== "link"
            ? "Private"
            : result.type === "post"
              ? "Post"
              : result.type === "comment"
                ? "Comment"
                : "Link"}
        </Badge>
      </div>
    </CommandItem>
  );

  return item;
}

export function GlobalSearch() {
  const { isOpen, closeSearch, setIsOpen, openSearch } = useSearchHotkey();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const router = useRouter();

  useEffect(() => {
    const handleTriggerSearch = () => {
      openSearch();
    };

    window.addEventListener("trigger-global-search", handleTriggerSearch);
    return () => {
      window.removeEventListener("trigger-global-search", handleTriggerSearch);
    };
  }, [openSearch]);

  const { data: results, isLoading } = useSearch(debouncedSearchTerm);

  const displayResults = searchTerm.trim() ? results : undefined;

  const handleSelect = useCallback(
    (result: SearchResult) => {
      closeSearch();
      setSearchTerm("");

      if (result.type === "post" && result.slug && result.categoryName) {
        router.push(`/${result.categoryName}/${result.slug}`);
      } else if (result.type === "comment" && result.slug && result.categoryName) {
        router.push(`/${result.categoryName}/${result.slug}?commentId=${result.id}`);
      } else if (result.type === "link" && result.link) {
        window.open(result.link, "_blank");
      }
    },
    [closeSearch, router],
  );

  const groupedResults = useMemo(() => {
    if (!displayResults) return { posts: [], comments: [], links: [] };

    return {
      posts: displayResults.filter((r) => r.type === "post"),
      comments: displayResults.filter((r) => r.type === "comment"),
      links: displayResults.filter((r) => r.type === "link"),
    };
  }, [displayResults]);

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <CommandInput
        placeholder="Search posts, comments, and links..."
        value={searchTerm}
        onValueChange={setSearchTerm}
        autoFocus
      />
      <CommandList>
        <CommandEmpty>
          {searchTerm.trim()
            ? isLoading
              ? "Searching..."
              : "No results found."
            : "Start typing to search..."}
        </CommandEmpty>

        {groupedResults.posts.length > 0 && (
          <CommandGroup heading="Posts">
            {groupedResults.posts.map((result) => (
              <SearchResultItem
                key={result.id}
                result={result}
                searchTerm={debouncedSearchTerm}
                onSelect={handleSelect}
              />
            ))}
          </CommandGroup>
        )}

        {groupedResults.comments.length > 0 && (
          <CommandGroup heading="Comments">
            {groupedResults.comments.map((result) => (
              <SearchResultItem
                key={result.id}
                result={result}
                searchTerm={debouncedSearchTerm}
                onSelect={handleSelect}
              />
            ))}
          </CommandGroup>
        )}

        {groupedResults.links.length > 0 && (
          <CommandGroup heading="Links">
            {groupedResults.links.map((result) => (
              <SearchResultItem
                key={result.id}
                result={result}
                searchTerm={debouncedSearchTerm}
                onSelect={handleSelect}
              />
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
