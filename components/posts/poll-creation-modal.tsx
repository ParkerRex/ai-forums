"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PollOption {
  id: string;
  text: string;
}

export interface PollData {
  options: PollOption[];
  duration: "24h" | "3d" | "7d" | "unlimited";
}

interface PollCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pollData: PollData) => void;
}

export function PollCreationModal({ isOpen, onClose, onConfirm }: PollCreationModalProps) {
  const [options, setOptions] = useState<PollOption[]>([
    { id: crypto.randomUUID(), text: "" },
    { id: crypto.randomUUID(), text: "" },
  ]);
  const [duration, setDuration] = useState<PollData["duration"]>("7d");
  const [error, setError] = useState<string>("");

  const handleAddOption = () => {
    if (options.length >= 6) {
      setError("Maximum 6 options allowed");
      return;
    }
    setOptions([...options, { id: crypto.randomUUID(), text: "" }]);
    setError("");
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) {
      setError("Minimum 2 options required");
      return;
    }
    setOptions(options.filter((opt) => opt.id !== id));
    setError("");
  };

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
    setError("");
  };

  const handleConfirm = () => {
    // Validate options
    const nonEmptyOptions = options.filter((opt) => opt.text.trim());

    if (nonEmptyOptions.length < 2) {
      setError("Please provide at least 2 options");
      return;
    }

    for (const option of nonEmptyOptions) {
      if (option.text.length > 100) {
        setError("Options must be 100 characters or less");
        return;
      }
    }

    onConfirm({
      options: nonEmptyOptions,
      duration,
    });

    // Reset state
    setOptions([
      { id: crypto.randomUUID(), text: "" },
      { id: crypto.randomUUID(), text: "" },
    ]);
    setDuration("7d");
    setError("");
  };

  const handleClose = () => {
    // Reset state
    setOptions([
      { id: crypto.randomUUID(), text: "" },
      { id: crypto.randomUUID(), text: "" },
    ]);
    setDuration("7d");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Poll</DialogTitle>
          <DialogDescription>
            Add poll options and set the duration for your poll.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Poll Options</Label>
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option.text}
                  onChange={(e) => handleOptionChange(option.id, e.target.value)}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(option.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Poll Duration</Label>
            <Select
              value={duration}
              onValueChange={(value) => setDuration(value as PollData["duration"])}
            >
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="3d">3 days</SelectItem>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="unlimited">No end date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Create Poll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
