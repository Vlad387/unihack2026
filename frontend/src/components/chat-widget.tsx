"use client";

import { MessageCircle, SendHorizontal, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChatActionButton, ReportCard } from "@/components/chat-actions";
import { Logo } from "@/components/logo";
import { ApiError, sendChat } from "@/lib/api";
import type { ChatAction, ChatMessage, ReportDraft } from "@/lib/types";

type Entry = ChatMessage & { action?: ChatAction; report?: ReportDraft | null };

const SUGGESTIONS = ["Cum particip?", "Unde văd harta?", "Vreau să raportez o problemă"];
const GRADIENT = "bg-[linear-gradient(135deg,oklch(58%_0.25_300),oklch(68%_0.15_235))]";

// Help bubble on every page except the projector board. A native modal <dialog> gives the focus trap,
// Esc-to-close and focus return to the bubble for free. The conversation lives in state for the session.
export function ChatWidget() {
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [entries.length, waiting]);

  if (path.startsWith("/board")) return null;

  const close = () => dialog.current?.close();

  async function ask(text: string) {
    const q = text.trim().slice(0, 1000);
    if (!q || waiting) return;
    const next: Entry[] = [...entries, { role: "user", text: q }];
    setEntries(next);
    setInput("");
    setError(null);
    setWaiting(true);
    try {
      const reply = await sendChat(
        next.map(({ role, text }) => ({ role, text })),
        path,
      );
      setEntries([...next, { role: "assistant", text: reply.text, action: reply.action, report: reply.report }]);
    } catch (err) {
      console.error("sendChat failed", err);
      setError(
        err instanceof ApiError && err.status === 429
          ? "Ai trimis multe mesaje într-un minut. Așteaptă puțin și încearcă din nou."
          : "Asistentul nu răspunde acum. Verifică internetul și încearcă din nou.",
      );
    } finally {
      setWaiting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label="Deschide asistentul AI"
        aria-haspopup="dialog"
        className={`fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 grid size-14 place-items-center rounded-full ${GRADIENT} text-white shadow-[0_12px_32px_-8px_oklch(45%_0.25_295/0.6)] transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-[var(--cyan)]/40 focus-visible:outline-none active:scale-95 print:hidden`}
      >
        <MessageCircle className="size-6" aria-hidden />
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="chat-title"
        // click on the backdrop (outside the panel) closes it
        onClick={(e) => e.target === dialog.current && close()}
        className="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-[var(--carbon)] p-0 text-foreground backdrop:bg-black/40 sm:top-auto sm:right-[calc(1rem+env(safe-area-inset-right))] sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:left-auto sm:h-[min(600px,calc(100dvh-7rem))] sm:w-[360px] sm:rounded-2xl sm:border sm:border-foreground/10 sm:shadow-2xl sm:backdrop:bg-transparent"
      >
        <div className="flex h-full flex-col">
          <header className={`flex items-center gap-3 px-4 py-3 text-white ${GRADIENT}`}>
            <Logo className="size-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 id="chat-title" className="leading-tight font-semibold">
                Asistent AI
              </h2>
              <p className="text-xs text-white/85">Te ajută să participi. Nu votează în locul tău.</p>
            </div>
            <button type="button" onClick={close} aria-label="Închide asistentul" className="grid size-9 place-items-center rounded-full hover:bg-white/15">
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <div ref={log} role="log" aria-live="polite" aria-label="Conversația cu asistentul" className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <Bubble role="assistant" text="Salut! Te pot ajuta să răspunzi la consultare, să votezi, să găsești harta sau să raportezi o problemă." />
            {entries.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-foreground/15 px-3 py-1.5 text-sm hover:border-[var(--cyan)] hover:text-[var(--cyan)]">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {entries.map((e, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Bubble role={e.role} text={e.text} />
                {e.action && (
                  <ChatActionButton action={e.action} fallback={entries.findLast((m) => m.role === "user")?.text ?? ""} onLeave={close} />
                )}
                {e.action?.type === "report" && e.report && <ReportCard draft={e.report} />}
              </div>
            ))}
            {waiting && (
              <p className="flex items-center gap-1 self-start rounded-2xl bg-foreground/5 px-3 py-2.5" aria-label="Asistentul scrie">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="size-1.5 animate-bounce rounded-full bg-ink-3" style={{ animationDelay: `${d}ms` }} />
                ))}
              </p>
            )}
            {error && <p className="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="flex items-end gap-2 border-t border-foreground/10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <textarea
              autoFocus
              rows={1}
              maxLength={1000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              // Enter sends, Shift+Enter makes a new line
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(input);
                }
              }}
              aria-label="Mesajul tău"
              placeholder="Scrie o întrebare…"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-foreground/15 bg-transparent px-3 py-2.5 text-base outline-none focus:border-[var(--cyan)]"
            />
            <button
              type="submit"
              disabled={waiting || !input.trim()}
              aria-label="Trimite mesajul"
              className={`grid size-11 shrink-0 place-items-center rounded-xl text-white ${GRADIENT} transition-opacity disabled:opacity-40`}
            >
              <SendHorizontal className="size-5" aria-hidden />
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}

function Bubble({ role, text }: ChatMessage) {
  const mine = role === "user";
  return (
    <div className={`flex max-w-[85%] flex-col gap-1 ${mine ? "self-end items-end" : "self-start"}`}>
      <span className="text-[0.7rem] font-semibold tracking-wide text-ink-3 uppercase">{mine ? "Tu" : "Asistent AI"}</span>
      <p className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${mine ? "bg-[var(--cyan)] text-white" : "bg-foreground/5"}`}>{text}</p>
    </div>
  );
}
