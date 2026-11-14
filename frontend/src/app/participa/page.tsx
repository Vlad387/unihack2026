import { AnswerForm } from "@/components/answer-form";
import { SiteHeader } from "@/components/site-header";
import { getQuestion } from "@/lib/api";

const STEPS = ["Răspunde", "Votează", "Unde ești", "Compromis"];

// Step 1 of the citizen journey: the full site menu on top, the same violet -> ice band as the public pages,
// a 4-step progress bar, and the form in a glass card.
export default async function ParticipatePage() {
  const question = await getQuestion();

  return (
    <>
      <SiteHeader />
      <main className="band-top -mt-[4.25rem] flex-1 pt-[4.25rem]">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pt-10 pb-20">
          <ol className="grid grid-cols-4 gap-1.5" aria-label="Pasul 1 din 4">
            {STEPS.map((s, i) => (
              <li key={s} className="flex flex-col gap-1.5">
                <span
                  className={`h-1.5 rounded-full ${i === 0 ? "bg-[linear-gradient(90deg,oklch(58%_0.25_300),oklch(68%_0.15_235))]" : "bg-foreground/15"}`}
                  aria-hidden
                />
                <span className={`text-[0.7rem] font-semibold tracking-wide uppercase ${i === 0 ? "text-foreground" : "text-ink-3"}`}>{s}</span>
              </li>
            ))}
          </ol>

          <header className="flex flex-col gap-2 text-center">
            <p className="font-mono text-meta tracking-[0.14em] text-ink-2 uppercase">Pasul 1 din 4 · Spune-ți părerea</p>
            <h1 className="font-display text-[clamp(1.9rem,1.4rem+2vw,2.6rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">
              {question}
            </h1>
            <p className="text-ink-2">Durează sub un minut. Fără cont, fără date personale.</p>
          </header>

          <div className="rounded-3xl border border-white/50 bg-[var(--glass)] p-5 shadow-[0_24px_60px_-30px_oklch(45%_0.25_295/0.45)] backdrop-blur-xl sm:p-6">
            <AnswerForm />
          </div>
        </div>
      </main>
    </>
  );
}
