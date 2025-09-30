"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface PollOption {
  id: string;
  text: string;
}

export interface PollData {
  options: PollOption[];
  duration: "24h" | "3d" | "7d" | "unlimited";
}

interface PollCreationInlineProps {
  pollData?: PollData;
  onChange: (pollData: PollData) => void;
  disabled?: boolean;
}

export function PollCreationInline({
  pollData,
  onChange,
  disabled = false,
}: PollCreationInlineProps) {
  const [options, setOptions] = useState<PollOption[]>(
    pollData?.options || [
      { id: crypto.randomUUID(), text: "" },
      { id: crypto.randomUUID(), text: "" },
    ],
  );
  const [duration, setDuration] = useState<PollData["duration"]>(pollData?.duration || "7d");

  // Update parent when options or duration change
  useEffect(() => {
    const nonEmptyOptions = options.filter((opt) => opt.text.trim());
    if (nonEmptyOptions.length >= 2) {
      onChange({ options: nonEmptyOptions, duration });
    }
  }, [options, duration, onChange]);

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, { id: crypto.randomUUID(), text: "" }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter((opt) => opt.id !== id));
  };

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-sm font-medium text-muted-foreground">Poll Options</Label>

        {options.map((option, index) => (
          <div key={option.id} className="flex items-center gap-2">
            <Input
              type="text"
              value={option.text}
              onChange={(e) => handleOptionChange(option.id, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="flex-1"
              disabled={disabled}
              maxLength={100}
            />
            {options.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveOption(option.id)}
                disabled={disabled}
                className="h-9 w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {options.length < 6 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            disabled={disabled}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Poll Duration</Label>
        <Select
          value={duration}
          onValueChange={(value) => setDuration(value as PollData["duration"])}
        >
          <SelectTrigger disabled={disabled}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24 hours</SelectItem>
            <SelectItem value="3d">3 days</SelectItem>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="unlimited">No limit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          "text-xs text-muted-foreground",
          options.filter((opt) => opt.text.trim()).length < 2 && "text-yellow-500",
        )}
      >
        {options.filter((opt) => opt.text.trim()).length < 2
          ? "At least 2 options required"
          : `${options.filter((opt) => opt.text.trim()).length} options`}
      </div>
    </div>
  );
}
