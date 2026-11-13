import { AnswerForm } from "@/components/answer-form";
import { getQuestion } from "@/lib/api";

export default async function AnswerPage() {
  const question = await getQuestion();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-sm font-medium text-muted-foreground">CityMind · Consultare publică</p>
        <h1 className="text-2xl font-bold">{question}</h1>
      </header>
      <AnswerForm />
    </main>
  );
}
