"use client";

import { QRCodeSVG } from "qrcode.react";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

// Points at whatever host serves the app, so it works on localhost, LAN IP and Vultr alike.
export function JoinQr({ size = 160 }: { size?: number }) {
  const url = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => null,
  );
  if (!url) return <div style={{ width: size, height: size }} />;

  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="rounded-lg bg-white p-2">
        <QRCodeSVG value={url} size={size} title="Scanează ca să participi" />
      </div>
      <figcaption className="text-center text-sm text-muted-foreground">
        Scanează ca să participi
        <br />
        <span className="font-mono text-xs">{url.replace(/^https?:\/\//, "")}</span>
      </figcaption>
    </figure>
  );
}
