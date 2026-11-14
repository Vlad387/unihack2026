import { PagePreview } from "@/components/page-preview";

// The four phone screens a citizen goes through after scanning the QR code. Shared by "Cum funcționează"
// and "Admin Demo", so both always show the same live previews.
export const citizenPages = [
  { href: "/participa", title: "1. Răspunde", text: "Cu vocea sau în scris." },
  { href: "/vote", title: "2. Votează afirmațiile", text: "De acord, nu sunt de acord, nu știu." },
  { href: "/me", title: "3. Unde te afli", text: "Locul tău pe harta opiniilor." },
  { href: "/proposal", title: "4. Votează compromisul", text: "Propunerea AI și ce câștigă fiecare tabără." },
];

export function CitizenJourney() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-16 sm:px-8">
      <div className="flex max-w-2xl flex-col gap-2">
        <p className="font-mono text-meta tracking-[0.14em] text-[var(--cyan)] uppercase">Parcursul cetățeanului</p>
        <h2 className="font-display text-[clamp(1.8rem,1.2rem+2vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.04em] text-balance">
          Patru ecrane pe telefon, după scanarea codului QR
        </h2>
        <p className="text-ink-2">Sunt paginile reale, live: poți da clic și încerca direct aici.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-8 lg:justify-between">
        {citizenPages.map((p) => (
          <PagePreview key={p.href} device="phone" {...p} />
        ))}
      </div>
    </section>
  );
}
