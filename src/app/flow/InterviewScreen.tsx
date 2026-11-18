import { useAuth } from "../lib/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { extractInterview } from "@/lib/interview.functions";
import type { InterviewGoal, TranscriptLine } from "@/lib/interview";
import { useWorkspace } from "../lib/store";

import { Button } from "@/components/ui/button";
import { Ticker } from "@/components/look/Ticker";

const MAX_MS = 3 * 60 * 1000;
const RECENT_MS = 900;

/** The latest sentence of a caption row. */
function lastSentence(text: string) {
  const parts = text.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export default function InterviewScreen({ goal }: { goal: InterviewGoal }) {
  const navigate = useNavigate();
  const { ws, set, setExtractingInterview } = useWorkspace();
  const extract = useServerFn(extractInterview);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const linesRef = useRef<TranscriptLine[]>([]);
  const [lastAgentAt, setLastAgentAt] = useState(0);
  const [lastFounderAt, setLastFounderAt] = useState(0);
  const [, setTick] = useState(0);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [ending, setEnding] = useState(false);
  const endedRef = useRef(false);

  const append = useCallback((role: TranscriptLine["role"], delta: string, newRow = false) => {
    const next = [...linesRef.current];
    const last = next[next.length - 1];
    if (!newRow && last && last.role === role) next[next.length - 1] = { role, text: last.text + delta };
    else next.push({ role, text: delta.trimStart() });
    linesRef.current = next;
    setLines(next);
  }, []);

  const onEvent = useCallback((event: LiveEvent) => {
    const delta = typeof event.delta === "string" ? event.delta : "";
    if (event.type === "session.output_transcript.delta" && delta) {
      append("agent", delta);
      setLastAgentAt(Date.now());
    } else if (event.type === "session.input_transcript.delta" && delta) {
      append("founder", delta);
      setLastFounderAt(Date.now());
    }
  }, [append]);

  const { session } = useAuth();
  const voice = useLiveVoice({ url: `/api/live?goal=${goal}&token=${encodeURIComponent(session?.access_token ?? "")}`, onEvent });

  const finish = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnding(true);
    voice.stop();
    setExtractingInterview(true);
    navigate({ to: "/leads" });
    const transcript = linesRef.current.filter((l) => l.text.trim());
    try {
      const { interview } = await extract({ data: { goal, transcript } });
      set({ interview: { ...interview, website: ws.url || interview.website }, url: ws.url || interview.website });
    } catch {
      set({ interview: { goal, website: ws.url || "", pitch: "", buyer: { role: "", companyType: "", size: "" }, points: ["", ""], proof: [], ask: "", contact: "" } });
    } finally {
      setExtractingInterview(false);
    }
  }, [extract, goal, navigate, set, setExtractingInterview, voice, ws.url]);

  // Start as soon as the screen opens; a failed start offers one tap to retry.
  // No ref guard: the hook ignores repeat starts, and a dev double-mount must start again after its cleanup.
  useEffect(() => {
    voice.start();
  }, [voice.start]);

  // Repaint speaking/listening state and enforce the 3-minute limit.
  useEffect(() => {
    if (voice.status !== "connected") return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setTick((t) => t + 1);
      if (Date.now() - startedAt > MAX_MS) void finish();
    }, 250);
    return () => clearInterval(timer);
  }, [voice.status, finish]);

  // The agent's closing thank-you ends the call once it has finished speaking.
  const lastAgent = [...lines].reverse().find((l) => l.role === "agent");
  const founderTurns = lines.filter((l) => l.role === "founder").length;
  const thanked = Boolean(lastAgent && founderTurns >= 2 && /\bthank/i.test(lastAgent.text) && lines[lines.length - 1]?.role === "agent");
  useEffect(() => {
    if (!thanked || ending) return;
    const t = setTimeout(() => void finish(), 3500);
    return () => clearTimeout(t);
  }, [thanked, lastAgentAt, ending, finish]);

  const now = Date.now();
  const agentSpeaking = voice.status === "connected" && now - lastAgentAt < RECENT_MS;
  const founderSpeaking = voice.status === "connected" && !agentSpeaking && now - lastFounderAt < RECENT_MS;
  const failed = !ending && (voice.status === "closed" || (voice.status === "idle" && Boolean(voice.error)));

  const state = ending ? "Reading your answers" : failed ? "Call stopped" : voice.status === "connecting" || voice.status === "idle" ? "Connecting" : agentSpeaking ? "Speaking" : "Listening";
  const caption = lines.length ? lastSentence((lines.at(-1)?.text ?? "")) : "";

  const sendTyped = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (voice.sendText(text)) {
      append("founder", text, true);
      setDraft("");
    }
  };

  const orbMode = ending || voice.status !== "connected" ? "orb-idle" : agentSpeaking ? "orb-speaking" : founderSpeaking ? "orb-hearing" : "orb-listening";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between px-6 py-10 text-ink">
      {!ending && (voice.status === "connecting" || voice.status === "idle") && !failed && <Ticker phase="interview" />}
      <audio ref={voice.audioRef} className="hidden" />

      <p className="label text-sm text-grain" role="status" aria-live="polite">{state}</p>

      <div className="flex w-full max-w-3xl flex-col items-center gap-12">
        <div className={`orb ${orbMode}`} aria-hidden />
        <p className="min-h-[5.5rem] text-center text-2xl font-medium leading-snug text-ink sm:text-3xl">
          {failed ? (voice.error ?? "The call ended before the interview finished.") : caption}
        </p>
        {voice.playbackBlocked && (
          <Button variant="primary" className=" h-14 px-8 text-lg" onClick={voice.resumePlayback}>Tap to hear the interviewer</Button>
        )}
        {failed && (
          <Button variant="primary" className=" h-14 px-8 text-lg" onClick={() => { linesRef.current = []; setLines([]); voice.start(); }}>Tap to start</Button>
        )}
      </div>

      <div className="flex w-full max-w-xl flex-col items-center gap-5">
        {typing && voice.status === "connected" && !ending && (
          <form onSubmit={sendTyped} className="flex w-full gap-2">
            <input autoFocus className="input h-12 min-w-0 flex-1 bg-transparent text-lg"
              placeholder="Type your answer" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <Button variant="primary" className=" h-12 px-5" disabled={!draft.trim()}>Send</Button>
          </form>
        )}
        <div className="flex items-center gap-8">
          {!typing && voice.status === "connected" && !ending && (
            <Button variant="bare" className="text-sm font-semibold text-grain underline underline-offset-4 hover:text-ink" onClick={() => setTyping(true)}>Type instead</Button>
          )}
          <Button variant="subtle" className="h-12 px-8 text-base"
            onClick={() => void finish()} disabled={ending}>
            End
          </Button>
        </div>
      </div>
    </main>
  );
}
