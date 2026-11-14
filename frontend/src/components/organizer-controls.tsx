"use client";

import { useState } from "react";
import { AnswerQueue } from "@/components/answer-queue";
import { ProposalRound } from "@/components/proposal-round";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// One password field for every organizer action that needs the server's ORGANIZER_TOKEN.
export function OrganizerControls() {
  const [token, setToken] = useState("");
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-token">Parolă organizator (doar pe server)</Label>
        <Input id="org-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} className="max-w-xs" />
      </div>
      <AnswerQueue token={token} />
      <ProposalRound token={token} />
    </>
  );
}
