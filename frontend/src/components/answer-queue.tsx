"use client";

import { Loader2, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, getResponseStats, retryResponses } from "@/lib/api";
import type { ResponseStats } from "@/lib/types";

const POLL_MS = 5000;

function errorText(err: unknown): string {
  return err instanceof ApiError && err.status === 401
    ? "Parola de organizator e greșită sau lipsește."
    : "Nu am putut citi starea răspunsurilor. Verifică conexiunea.";
}

// Answers stuck in AI intake (usually the Gemini daily quota): show them and let the organizer retry now.
export function AnswerQueue({ token }: { token: string }) {
  const [stats, setStats] = useState<ResponseStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retried, setRetried] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const s = await getResponseStats(token.trim() || null);
        if (alive) {
          setStats(s);
          setError(null);
        }
      } catch (err) {
        console.error("getResponseStats failed", err);
        if (alive) setError(errorText(err));
      }
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [token]);

  async function retry() {
    setRetrying(true);
    try {
      setStats(await retryResponses(token.trim() || null));
      setError(null);
      setRetried(true);
    } catch (err) {
      console.error("retryResponses failed", err);
      setError(errorText(err));
    } finally {
      setRetrying(false);
    }
  }

  const stuck = (stats?.pending ?? 0) + (stats?.failed ?? 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Răspunsuri procesate de AI</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Fiecare răspuns trece prin AI ca să devină afirmații. Dacă limita gratuită Gemini s-a terminat, răspunsurile așteaptă și se
          reîncearcă singure. Niciun răspuns nu se pierde.
        </p>
        <dl className="grid grid-cols-3 gap-3 text-center">
          {(
            [
              ["În așteptare", stats?.pending],
              ["Eșuate", stats?.failed],
              ["Procesate", stats?.done],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-mono text-2xl font-semibold tabular-nums">{value ?? "–"}</dd>
            </div>
          ))}
        </dl>
        <Button onClick={retry} disabled={retrying || stuck === 0} variant="outline" className="w-fit">
          {retrying ? <Loader2 className="animate-spin" /> : <RotateCw />}
          Reîncearcă acum
        </Button>
        <div className="text-sm" aria-live="polite">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : retried && stuck > 0 ? (
            <span className="text-muted-foreground">Am repornit {stuck === 1 ? "un răspuns" : `${stuck} răspunsuri`}. Cifrele se actualizează singure.</span>
          ) : stats && stuck === 0 ? (
            <span className="text-emerald-700 dark:text-emerald-400">Toate răspunsurile au fost procesate.</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
