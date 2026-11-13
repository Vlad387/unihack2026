"use client";

import Link from "next/link";
import { useState } from "react";
import { JoinQr } from "@/components/join-qr";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createConsultation } from "@/lib/api";
import type { Consultation } from "@/lib/types";

export function CreateConsultation({ initial }: { initial: Consultation }) {
  const [question, setQuestion] = useState(initial.question);
  const [context, setContext] = useState(initial.context);
  const [threshold, setThreshold] = useState(String(Math.round(initial.threshold * 100)));
  const [status, setStatus] = useState<"idle" | "sending" | "created" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      await createConsultation({ question: question.trim(), context: context.trim(), threshold: Number(threshold) / 100 });
      setStatus("created");
    } catch (err) {
      console.error("createConsultation failed", err);
      setStatus("error");
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto]">
      <Card>
        <CardHeader>
          <CardTitle>Consultare nouă</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="question">Întrebarea</Label>
              <Input id="question" required maxLength={200} value={question} onChange={(e) => setQuestion(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="context">Context pentru cetățeni și pentru AI</Label>
              <Textarea id="context" rows={4} maxLength={2000} value={context} onChange={(e) => setContext(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="threshold">Prag de acceptare (% voturi „Susțin”)</Label>
              <Input
                id="threshold"
                type="number"
                inputMode="numeric"
                required
                min={50}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="max-w-32"
              />
            </div>
            {status === "error" && <p className="text-sm text-destructive">Nu am putut salva consultarea. Încearcă din nou.</p>}
            <Button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Se salvează…" : status === "created" ? "Salvează modificările" : "Pornește consultarea"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:w-72">
        <CardHeader>
          <CardTitle>Cod QR</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <JoinQr size={200} />
          {status === "created" && (
            <p className="text-center text-sm text-emerald-700 dark:text-emerald-400" aria-live="polite">
              Consultarea a pornit. Pune ecranul live pe proiector.
            </p>
          )}
          <Link href="/board" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            Deschide ecranul live
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
