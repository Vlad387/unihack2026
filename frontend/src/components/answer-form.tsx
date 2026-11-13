"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { MicButton } from "@/components/mic-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitResponse } from "@/lib/api";

export function AnswerForm() {
  const [audio, setAudio] = useState<Blob | null>(null);
  const [text, setText] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [age, setAge] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // state updates are async, so a fast double tap could slip through: this guard blocks it instantly
  const inFlight = useRef(false);
  const canSend = (audio !== null || text.trim() !== "") && status !== "sending";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus("sending");
    try {
      await submitResponse({
        text: text.trim() || null,
        audio,
        neighborhood: neighborhood.trim() || null,
        age: age ? Number(age) : null,
      });
      setStatus("sent");
    } catch (err) {
      // keep the form filled so the citizen can retry without losing the answer
      console.error("submitResponse failed", err);
      inFlight.current = false;
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-2xl font-semibold">Mulțumim! 🙌</p>
        <p className="text-muted-foreground">Răspunsul tău a fost trimis. Acum vezi ce cred ceilalți.</p>
        <Link href="/vote" className={buttonVariants({ size: "lg", className: "w-full" })}>
          Votează afirmațiile celorlalți
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-6">
      <MicButton audio={audio} onChange={setAudio} />

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> sau scrie <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="text">Răspunsul tău</Label>
        <Textarea
          id="text"
          rows={4}
          maxLength={2000}
          placeholder="Ce crezi că ar trebui făcut?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">Despre tine (opțional)</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="neighborhood">Cartier</Label>
            <Input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="age">Vârstă</Label>
            <Input
              id="age"
              type="number"
              inputMode="numeric"
              min={14}
              max={110}
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
        </div>
      </details>

      {status === "error" && (
        <p className="text-sm text-destructive">Nu am putut trimite răspunsul. Încearcă din nou.</p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!canSend}>
        {status === "sending" ? "Se trimite…" : "Trimite răspunsul"}
      </Button>
    </form>
  );
}
