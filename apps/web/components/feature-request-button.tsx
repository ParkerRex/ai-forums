"use client";

import React, { useState } from "react";
import { Button } from "@/web/components/ui/button";
import { FeatureRequestModal } from "./feature-request-modal";

export function FeatureRequestButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="text-muted-foreground hover:text-foreground h-7 w-full flex-1 text-xs"
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
