"use client";

import { ArrowRight, Check, Flag, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendReport } from "@/lib/api";
import { saveDraft } from "@/lib/draft";
import type { ChatAction, ReportDraft } from "@/lib/types";

const PAGES = {
  vote: { href: "/vote", label: "Mergi la vot" },
  map: { href: "/me", label: "Vezi harta" },
  proposal: { href: "/proposal", label: "Vezi propunerea" },
} as const;

const KIND: Record<ReportDraft["kind"], string> = {
  abuse: "Limbaj abuziv",
  personal_data: "Date personale",
  bug: "Problemă tehnică",
  other: "Altceva",
};

const btn =
  "inline-flex w-fit items-center gap-1.5 rounded-lg border border-foreground/20 bg-[var(--carbon)] px-3 py-1.5 text-sm font-semibold transition-colors hover:border-[var(--cyan)] hover:text-[var(--cyan)]";

// The button an assistant reply suggests. Nothing here submits on its own: it only opens a page or a draft.
export function ChatActionButton({ action, fallback, onLeave }: { action: ChatAction; fallback: string; onLeave: () => void }) {
  const router = useRouter();
  const path = usePathname();

  if (action.type === "answer") {
    return (
      <button
        type="button"
        className={btn}
        onClick={() => {
          saveDraft(action.prefill || fallback);
          onLeave();
          // already on the form: it picks the draft up through this event instead of a navigation
          if (path === "/participa") window.dispatchEvent(new Event("citymind-draft"));
          else router.push("/participa");
        }}
      >
        Deschide formularul cu ciorna <ArrowRight className="size-4" aria-hidden />
      </button>
    );
  }
  if (action.type === "vote" || action.type === "map" || action.type === "proposal") {
    const page = PAGES[action.type];
    return (
      <Link href={page.href} className={btn} onClick={onLeave}>
        {page.label} <ArrowRight className="size-4" aria-hidden />
      </Link>
    );
  }
  return null;
}

// A report the assistant drafted: the citizen reads (and can edit) it, and only "Trimite raportul" sends it.
export function ReportCard({ draft }: { draft: ReportDraft }) {
  const [text, setText] = useState(draft.text);
  const [state, setState] = useState<"draft" | "sending" | "sent" | "error">("draft");

  async function send() {
    setState("sending");
    try {
      await sendReport({ ...draft, text: text.trim() });
      setState("sent");
    } catch (err) {
      console.error("sendReport failed", err);
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-foreground/30 bg-[var(--carbon)] p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-3 uppercase">
        <Flag className="size-3.5" aria-hidden /> Ciornă de raport · {KIND[draft.kind]}
      </p>
      {state === "sent" ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400" aria-live="polite">
          <Check className="size-4" aria-hidden /> Trimis. Mulțumim, organizatorul îl vede.
        </p>
      ) : (
        <>
          <Textarea
            aria-label="Textul raportului"
            rows={3}
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={state === "sending"}
          />
          {state === "error" && <p className="text-sm text-destructive">Nu am putut trimite raportul. Încearcă din nou.</p>}
          <Button size="sm" className="w-fit" onClick={send} disabled={state === "sending" || !text.trim()}>
            {state === "sending" && <Loader2 className="animate-spin" />}
            Trimite raportul
          </Button>
        </>
      )}
    </div>
  );
}
