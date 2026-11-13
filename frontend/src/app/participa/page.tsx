import { Brand } from "@/components/brand";
import { AnswerForm } from "@/components/answer-form";
import { getQuestion } from "@/lib/api";

export default async function ParticipatePage() {
  const question = await getQuestion();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2 text-center">
        <Brand className="mx-auto mb-2 text-lg" />
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pasul 1 din 4 · Spune-ți părerea</p>
        <h1 className="text-2xl font-bold">{question}</h1>
      </header>
      <AnswerForm />
    </main>
  );
}
