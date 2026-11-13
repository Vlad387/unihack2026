"use client";

import { Check, HelpCircle, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { submitVote } from "@/lib/api";
import type { Statement, VoteValue } from "@/lib/types";

const choices: { value: VoteValue; label: string; icon: typeof Check; className: string }[] = [
  { value: "agree", label: "De acord", icon: Check, className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { value: "disagree", label: "Nu sunt de acord", icon: X, className: "bg-rose-600 hover:bg-rose-700 text-white" },
  { value: "pass", label: "Nu știu", icon: HelpCircle, className: "" },
];

export function VoteDeck({ statements }: { statements: Statement[] }) {
  const [index, setIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  async function vote(value: VoteValue) {
    setSending(true);
    setError(false);
    try {
      await submitVote(statements[index].id, value);
      setIndex((i) => i + 1);
    } catch (err) {
      // stay on the same statement so the vote isn't silently lost
      console.error("submitVote failed", err);
      setError(true);
    } finally {
      setSending(false);
    }
  }

  if (index >= statements.length) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-2xl font-semibold">Gata, ai votat tot! 🎉</p>
        <p className="text-muted-foreground">Urmărește harta live ca să vezi unde te afli față de ceilalți.</p>
        <Link href="/me" className={buttonVariants({ size: "lg", className: "w-full" })}>
          Vezi unde te afli
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Afirmația {index + 1} din {statements.length}
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${(index / statements.length) * 100}%` }} />
        </div>
      </div>

      <blockquote className="flex min-h-48 items-center rounded-2xl border bg-card p-6 text-xl font-medium shadow-sm">
        „{statements[index].text}”
      </blockquote>

      {error && <p className="text-sm text-destructive">Nu am putut trimite votul. Încearcă din nou.</p>}

      <div className="flex flex-col gap-3">
        {choices.map(({ value, label, icon: Icon, className }) => (
          <Button
            key={value}
            size="lg"
            variant={value === "pass" ? "outline" : "default"}
            className={`h-14 w-full text-base ${className}`}
            disabled={sending}
            onClick={() => vote(value)}
          >
            <Icon /> {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
