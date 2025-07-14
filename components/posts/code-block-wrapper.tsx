"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockWrapperProps {
  code: string;
  language?: string;
  children: React.ReactNode;
}

export function CodeBlockWrapper({ code, language, children }: CodeBlockWrapperProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="relative group">
      {children}
      <Button
        onClick={handleCopy}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0"
        title="Copy code"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
      {language && (
        <div className="absolute top-0 right-12 px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50 rounded-bl border-b border-l border-border/50">
          {language}
        </div>
      )}
    </div>
  );
}