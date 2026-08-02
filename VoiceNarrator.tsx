import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Volume2, MessageCircle, X, Send, VolumeX } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { transcribeAudio, askAndSpeak } from "@/lib/voice.functions";

type Status = "idle" | "recording" | "thinking" | "speaking" | "error";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface VoiceNarratorProps {
  buildContext: () => string;
}

export function VoiceNarrator({ buildContext }: VoiceNarratorProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const transcribe = useServerFn(transcribeAudio);
  const ask = useServerFn(askAndSpeak);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const addMessage = (role: Message["role"], text: string) => {
    setMessages((prev: Message[]) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text },
    ]);
  };

  const askQuestion = async (question: string) => {
    setError(null);
    addMessage("user", question);
    setStatus("thinking");
    try {
      const context = buildContext();
      const { answer, audioBase64 } = await ask({ data: { question, context } });
      addMessage("assistant", answer);
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setStatus("idle");
      audio.onerror = () => setStatus("idle");
      setStatus("speaking");
      await audio.play().catch(() => setStatus("idle"));
    } catch (err) {
      console.error("[voice] ask failed", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  };

  const startRecording = useCallback(async () => {
    setError(null);
    stopPlayback();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1024) {
          setStatus("idle");
          setError("Recording was too short. Please try again.");
          return;
        }
        setStatus("thinking");
        try {
          const arrayBuf = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuf);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const audioBase64 = btoa(binary);
          const { text } = await transcribe({
            data: { audioBase64, mimeType: blob.type || "audio/webm" },
          });
          const question = text.trim();
          if (!question) {
            setStatus("idle");
            setError("Couldn't hear anything. Please try again.");
            return;
          }
          await askQuestion(question);
        } catch (err) {
          console.error("[voice] transcription failed", err);
          setError(err instanceof Error ? err.message : "Transcription failed.");
          setStatus("error");
        }
      };
      recorderRef.current = rec;
      rec.start();
      setStatus("recording");
    } catch (err) {
      console.error("[voice] mic error", err);
      setError("Microphone access denied.");
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const handleMicClick = () => {
    if (status === "recording") stopRecording();
    else if (status === "speaking") {
      stopPlayback();
      setStatus("idle");
    } else if (status === "idle" || status === "error") {
      void startRecording();
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || status === "thinking" || status === "recording") return;
    setInput("");
    stopPlayback();
    void askQuestion(text);
  };

  const busy = status === "thinking";

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 text-sidebar-foreground">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Volume2 className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold">Dashboard Assistant</div>
                <div className="text-[10px] uppercase tracking-wide text-sidebar-foreground/60">
                  British voice · Ask anything
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {status === "speaking" && (
                <button
                  type="button"
                  onClick={() => {
                    stopPlayback();
                    setStatus("idle");
                  }}
                  aria-label="Stop playback"
                  className="rounded p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <VolumeX className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  stopPlayback();
                  setOpen(false);
                  if (status !== "recording") setStatus("idle");
                }}
                aria-label="Close assistant"
                className="rounded p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="mt-6 text-center text-xs text-muted-foreground">
                <p className="mb-2 font-medium text-foreground">Hello — how may I help?</p>
                <p>Try: "What's total revenue?" or "Which region leads?"</p>
                <p className="mt-1">Type below or tap the mic to speak.</p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {status === "thinking" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
              </div>
            )}
            {status === "speaking" && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-500">
                <Volume2 className="h-3 w-3" /> Speaking…
              </div>
            )}
            {status === "recording" && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-500">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                </span>
                Listening…
              </div>
            )}
            {error && <p className="text-xs text-red-600 dark:text-red-500">{error}</p>}
          </div>

          <div className="border-t border-border bg-background/60 p-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                onClick={handleMicClick}
                disabled={busy}
                aria-label={status === "recording" ? "Stop recording" : "Record question"}
                className={cn(
                  "h-10 w-10 shrink-0 rounded-full",
                  status === "recording"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {status === "recording" ? (
                  <Square className="h-4 w-4" fill="currentColor" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask a question…"
                disabled={status === "recording"}
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                onClick={handleSend}
                disabled={busy || status === "recording" || !input.trim()}
                aria-label="Send question"
                className="h-10 w-10 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (open) {
            stopPlayback();
            if (status !== "recording") setStatus("idle");
          }
        }}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full p-0 shadow-lg",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          status === "recording" && "bg-red-600 hover:bg-red-700",
          status === "speaking" && "bg-emerald-600 hover:bg-emerald-700",
        )}
      >
        {status === "recording" ? (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" />
            <Mic className="relative h-6 w-6" />
          </>
        ) : status === "thinking" ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : status === "speaking" ? (
          <Volume2 className="h-6 w-6" />
        ) : open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
    </>
  );
}
