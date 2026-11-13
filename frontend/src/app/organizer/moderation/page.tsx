import { ModerationQueue } from "@/components/moderation-queue";
import { getModerationQueue } from "@/lib/api";

export default async function ModerationPage() {
  const items = await getModerationQueue();

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Moderare</h1>
        <p className="text-muted-foreground">
          Afirmațiile semnalate de AI nu apar la vot până nu le aprobi. Cele respinse nu sunt folosite nicăieri.
        </p>
      </header>
      <ModerationQueue initial={items} />
    </section>
  );
}
