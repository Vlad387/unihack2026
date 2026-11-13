import { Brand } from "@/components/brand";
import { VoteDeck } from "@/components/vote-deck";
import { getQuestion, getStatementsToVote } from "@/lib/api";

export default async function VotePage() {
  const [question, statements] = await Promise.all([getQuestion(), getStatementsToVote()]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2 text-center">
        <Brand className="mx-auto mb-2 text-lg" />
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pasul 2 din 4 · Ce cred ceilalți?</p>
        <h1 className="text-lg font-semibold">{question}</h1>
      </header>
      <VoteDeck statements={statements} />
    </main>
  );
}
