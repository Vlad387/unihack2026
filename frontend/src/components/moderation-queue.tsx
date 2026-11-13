"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { moderateStatement } from "@/lib/api";
import type { ModerationItem, ModerationReason } from "@/lib/types";

const reasons: Record<ModerationReason, string> = {
  abuse: "Limbaj abuziv",
  personal_data: "Date personale",
  off_topic: "În afara subiectului",
};

export function ModerationQueue({ initial }: { initial: ModerationItem[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, approve: boolean) {
    setBusy(id);
    setError(null);
    try {
      await moderateStatement(id, approve);
      setItems((all) => all.filter((i) => i.statement.id !== id));
    } catch (err) {
      console.error("moderateStatement failed", err);
      setError(id);
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground">Nimic de moderat. Toate afirmațiile au fost verificate.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map(({ statement, reason }) => (
        <Card key={statement.id}>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-col gap-2">
              <Badge variant="destructive" className="w-fit">
                Semnalat de AI · {reasons[reason]}
              </Badge>
              <p>„{statement.text}”</p>
              {error === statement.id && <p className="text-sm text-destructive">Nu s-a salvat. Încearcă din nou.</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy === statement.id} onClick={() => decide(statement.id, true)}>
                Aprobă
              </Button>
              <Button variant="destructive" disabled={busy === statement.id} onClick={() => decide(statement.id, false)}>
                Respinge
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
