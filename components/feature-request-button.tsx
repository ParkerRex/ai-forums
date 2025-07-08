"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FeatureRequestModal } from "./feature-request-modal";

export function FeatureRequestButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="flex-1 w-full h-7 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        Add Feature
      </Button>
      {open && (
        <FeatureRequestModal isOpen={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
