import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// --s is the scale; desktop previews shrink further on phones so they never overflow a 375px screen.
const DEVICES = {
  phone: { w: 390, h: 844, scale: "[--s:0.6]", frame: "rounded-[2rem] border-4 border-foreground/80" },
  desktop: { w: 1440, h: 900, scale: "[--s:0.235] sm:[--s:0.36]", frame: "rounded-xl" },
};

// A live, interactive mini version of a real page: the iframe renders at true device size, then CSS scales it down.
export function PagePreview({ href, title, text, device }: { href: string; title: string; text: string; device: keyof typeof DEVICES }) {
  const d = DEVICES[device];
  return (
    <figure className={`flex flex-col gap-3 ${d.scale}`} style={{ width: `calc(${d.w}px * var(--s))` }}>
      <div className={`overflow-hidden border bg-background shadow-lg ${d.frame}`} style={{ height: `calc(${d.h}px * var(--s))` }}>
        <iframe
          src={href}
          title={`Previzualizare: ${title}`}
          loading="lazy"
          width={d.w}
          height={d.h}
          className="origin-top-left border-0"
          style={{ transform: "scale(var(--s))" }}
        />
      </div>
      <figcaption className="flex flex-col gap-1">
        <span className="flex items-start justify-between gap-2">
          <span className="font-semibold">{title}</span>
          <Link href={href} className={buttonVariants({ variant: "ghost", size: "sm", className: "shrink-0" })}>
            Deschide <ExternalLink />
          </Link>
        </span>
        <span className="font-mono text-xs text-muted-foreground">{href}</span>
        <span className="text-sm text-muted-foreground">{text}</span>
      </figcaption>
    </figure>
  );
}
