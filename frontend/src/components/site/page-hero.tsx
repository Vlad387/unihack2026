// Inner public pages open in the same violet -> ice band as the landing, running up behind the header.
export function PageHero({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <header className="band-top -mt-[4.25rem] pt-[4.25rem]">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-5 px-4 pt-16 pb-24 text-center sm:px-8 lg:pt-24 lg:pb-32">
        <p className="font-mono text-meta tracking-[0.14em] text-ink-2 uppercase">{eyebrow}</p>
        <h1 className="max-w-4xl font-display text-[clamp(2.4rem,1.3rem+3.8vw,4.8rem)] leading-[0.98] font-extrabold tracking-[-0.045em] text-balance">
          {title}
        </h1>
        <p className="max-w-2xl text-lead text-pretty text-ink-2">{text}</p>
      </div>
    </header>
  );
}
