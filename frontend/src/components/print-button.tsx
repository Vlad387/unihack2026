"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// shortcut: browser "Save as PDF" instead of a PDF library, upgrade only if the print layout isn't good enough
export function PrintButton() {
  return (
    <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
      <Printer /> Descarcă PDF
    </Button>
  );
}
