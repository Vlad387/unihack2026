import Image from "next/image";

// App logo: the CityMind mascot, a purple cat with turquoise eyes (mascot/citymind-cat.png, 192px web copy).
export function Logo({ className = "size-8" }: { className?: string }) {
  return <Image src="/brand/cat.png" alt="" width={192} height={164} className={`object-contain ${className}`} priority />;
}
