"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OpinionMap } from "@/components/opinion-map";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { campColor } from "@/lib/colors";
import { type ConsultationState, useConsultation } from "@/hooks/use-consultation";
import { getMyPosition } from "@/lib/api";
import { getParticipantId } from "@/lib/participant";
import type { Point } from "@/lib/types";

export function WhereYouAre({ initial }: { initial: ConsultationState }) {
  const { clusters, bridges } = useConsultation(initial);
  const [me, setMe] = useState<Point | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getMyPosition()
      .then((p) => {
        setMe(p);
        setMyId(getParticipantId());
      })
      .catch((err) => console.error("getMyPosition failed", err))
      .finally(() => setLoaded(true));
  }, []);

  // live map wins: a new participant appears here as soon as clustering places them
  const myPoint = clusters.points.find((p) => p.participant_id === myId) ?? me;
  const camp = clusters.camps.find((c) => c.id === myPoint?.camp_id);
  const color = campColor(clusters.camps);

  return (
    <div className="flex flex-col gap-6">
      <Card className="py-2">
        <CardContent className="px-2">
          <OpinionMap clusters={clusters} me={myPoint} scale={2} />
        </CardContent>
      </Card>

      {camp ? (
        <Card style={{ borderColor: color(camp.id) }} className="border-2">
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">Ești în tabăra</p>
              <Badge variant="secondary" className="font-normal">
                Generat de AI
              </Badge>
            </div>
            <p className="text-xl font-bold">
              {camp.name}
            </p>
            <p className="text-muted-foreground">{camp.description}</p>
            <p className="text-sm">
              <strong>{camp.size}</strong> din {clusters.points.length} participanți gândesc ca tine.
            </p>
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-muted-foreground" aria-live="polite">
          {loaded ? "Încă te așezăm pe hartă. Revino în câteva momente." : "Te căutăm pe hartă…"}
        </p>
      )}

      {bridges.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Ce te leagă de ceilalți</h2>
          {bridges.map((b) => (
            <p key={b.id} className="rounded-lg bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
              „{b.text}”
            </p>
          ))}
        </section>
      )}

      <Link href="/proposal" className={buttonVariants({ size: "lg", className: "w-full" })}>
        Votează compromisul
      </Link>
    </div>
  );
}
