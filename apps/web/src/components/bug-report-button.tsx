"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { BugReportModal } from "./bug-report-modal";

export function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-xs"
      >
        Submit Bug
      </Button>
      <BugReportModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
