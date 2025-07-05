"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FeatureRequestModal } from "./feature-request-modal";

export function FeatureRequestButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={() => setOpen(true)}
      >
        Request Feature
      </Button>
      {open && (
        <FeatureRequestModal isOpen={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
