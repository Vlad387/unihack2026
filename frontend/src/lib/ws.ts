// The ONLY place that opens the WebSocket.
import { simulateEvents } from "./mock";
import type { ConsultationEvent } from "./types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

export function subscribe(onEvent: (e: ConsultationEvent) => void): () => void {
  // shortcut: simulated events until Rares's WebSocket is up, set NEXT_PUBLIC_WS_URL to use the real one
  if (!WS_URL) return simulateEvents(onEvent);

  let ws: WebSocket;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const connect = () => {
    ws = new WebSocket(WS_URL);
    ws.onmessage = (msg) => {
      try {
        onEvent(JSON.parse(msg.data) as ConsultationEvent);
      } catch (err) {
        console.error("Bad WebSocket message", err);
      }
    };
    // the big screen must survive Wi-Fi blips during the demo
    ws.onclose = () => {
      if (!closed) retry = setTimeout(connect, 2000);
    };
  };

  connect();
  return () => {
    closed = true;
    clearTimeout(retry);
    ws.close();
  };
}
