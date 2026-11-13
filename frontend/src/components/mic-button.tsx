"use client";

import { Mic, Square, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  audio: Blob | null;
  onChange: (audio: Blob | null) => void;
}

export function MicButton({ audio, onChange }: Props) {
  const recorder = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const audioUrl = useMemo(() => (audio ? URL.createObjectURL(audio) : null), [audio]);
  useEffect(() => () => void (audioUrl && URL.revokeObjectURL(audioUrl)), [audioUrl]);

  // release the mic if the user leaves mid-recording
  useEffect(() => () => recorder.current?.stream.getTracks().forEach((t) => t.stop()), []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        onChange(new Blob(chunks, { type: rec.mimeType }));
      };
      rec.start();
      recorder.current = rec;
      setSeconds(0);
      setRecording(true);
    } catch (e) {
      console.error("Microphone unavailable", e);
      setError("Nu am putut accesa microfonul. Poți scrie răspunsul mai jos.");
    }
  }

  function stop() {
    recorder.current?.stop();
    setRecording(false);
  }

  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-label={recording ? "Oprește înregistrarea" : "Începe înregistrarea"}
        className={`flex size-32 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 ${
          recording ? "animate-pulse bg-red-600" : "bg-primary"
        }`}
      >
        {recording ? <Square className="size-12" /> : <Mic className="size-14" />}
      </button>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {recording ? `Se înregistrează… ${time}` : audio ? `Înregistrare gata (${time})` : "Apasă și spune ce crezi"}
      </p>
      {audioUrl && !recording && (
        <div className="flex items-center gap-2">
          <audio controls src={audioUrl}className="h-10 max-w-60" />
          <Button variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Șterge înregistrarea">
            <Trash2 />
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
