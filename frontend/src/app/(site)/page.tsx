import { BarChart3, Bot, EyeOff, Handshake, Map, Mic, ShieldCheck, Vote } from "lucide-react";
import Link from "next/link";
import { OpinionMap } from "@/components/opinion-map";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getClusters, getQuestion } from "@/lib/api";

const steps = [
  { icon: Mic, title: "Spune-ți părerea", text: "Scanezi codul QR și răspunzi cu vocea sau în scris. Fără cont, în mai puțin de un minut." },
  { icon: Vote, title: "Votează ideile celorlalți", text: "De acord, nu sunt de acord sau nu știu. Fiecare vot contează la fel." },
  { icon: Map, title: "Vezi unde te afli", text: "Harta opiniilor arată taberele care se formează și locul tău printre ele." },
  { icon: Handshake, title: "Votează compromisul", text: "AI-ul propune o soluție pornind de la punctele comune. Dacă nu trece pragul, o rescrie." },
];

const principles = [
  { icon: Bot, title: "AI-ul e mereu etichetat", text: "Tot ce scrie AI-ul e marcat „Generat de AI”. Deciziile rămân ale oamenilor." },
  { icon: Handshake, title: "Puncte comune, nu majorități", text: "Căutăm afirmațiile cu care sunt de acord toate taberele, nu doar cea mai mare." },
  { icon: BarChart3, title: "Doar voturi reale", text: "Opiniile simulate de AI sunt afișate separat și nu intră niciodată în procente." },
  { icon: EyeOff, title: "Fără date personale", text: "Nu cerem nume, telefon sau email. Mesajele cu date personale sunt filtrate." },
];

export default async function LandingPage() {
  const [question, clusters] = await Promise.all([getQuestion(), getClusters()]);

  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-24">
        <div className="flex flex-col gap-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Consultare publică cu AI</p>
          <h1 className="text-4xl font-bold tracking-tight text-balance md:text-6xl">
            Orașul tău. Vocea ta. O soluție votată de toți.
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            CityMind adună părerile oamenilor despre o problemă a orașului, găsește ce îi unește și propune un compromis pe
            care îl votează toată lumea, live.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/participa" className={buttonVariants({ size: "lg", className: "h-12 px-6 text-base" })}>
              Participă acum
            </Link>
            <Link
              href="/cum-functioneaza"
              className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 px-6 text-base" })}
            >
              Cum funcționează
            </Link>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{question}</p>
              <Badge variant="secondary" className="shrink-0">
                {clusters.points.length} participanți
              </Badge>
            </div>
            <OpinionMap clusters={clusters} />
          </CardContent>
        </Card>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Cum participi</p>
            <h2 className="text-3xl font-bold tracking-tight">Patru pași, cinci minute</h2>
          </div>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">Pasul {i + 1}</span>
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16">
        <div className="flex max-w-2xl flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Principii</p>
          <h2 className="text-3xl font-bold tracking-tight">AI care ajută, nu care decide</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {principles.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-primary p-8 text-primary-foreground md:flex-row md:items-center md:justify-between md:p-12">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <ShieldCheck className="size-6 text-brand-amber" /> Organizezi o consultare?
            </h2>
            <p className="text-primary-foreground/80">
              Pune o întrebare, afișează codul QR și urmărește harta opiniilor pe proiector. Raportul final e gata la sfârșit.
            </p>
          </div>
          <Link
            href="/organizer"
            className={buttonVariants({ variant: "secondary", size: "lg", className: "h-12 px-6 text-base" })}
          >
            Creează o consultare
          </Link>
        </div>
      </section>
    </>
  );
}
