import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "student" | "office";
type Level = "easy" | "medium" | "detailed";

const QUICK_STUDENT = [
  "Explain today's toughest topic simply",
  "Quiz me on my syllabus",
  "Summarize my materials",
  "How do I stay consistent?",
];
const QUICK_OFFICE = [
  "Draft a crisp status update",
  "Summarize this text in 5 bullets",
  "Draft a polite follow-up email",
  "Plan my deep-work block",
];

export default function Chat() {
  const profile = useQuery(api.profile.getMy);
  const history = useQuery(api.chat.list) ?? [];
  const materials = useQuery(api.library.listMaterials) ?? [];
  const send = useMutation(api.chat.addUserMessage);
  const store = useMutation(api.chat.addAssistantMessage);
  const clear = useMutation(api.chat.clear);
  const ask = useAction(api.ai.chat);

  const [modeOverride, setModeOverride] = useState<Mode | null>(null);
  const [level, setLevel] = useState<Level>("medium");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Derived, not synced: the profile is the default until the user toggles here.
  const mode: Mode = modeOverride ?? profile?.mode ?? "student";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length, pending]);

  const sendNow = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setPending(message);
    try {
      await send({ content: message });
      const mats = materials.map((m) => ({ title: m.title, text: m.text ?? "" }));
      const answer = await ask({
        mode,
        level,
        message,
        history: history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        materials: mats,
      });
      setPending(null);
      await store({ content: answer });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setPending(null);
      setBusy(false);
    }
  };

  const chips = mode === "office" ? QUICK_OFFICE : QUICK_STUDENT;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-7rem)]">
      <header className="flex flex-wrap items-center gap-2 pb-4">
        <h1 className="text-lg font-semibold tracking-tight">Assistant</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border text-sm">
            {(["student", "office"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setModeOverride(m)}
                className={cn(
                  "px-3 py-1 capitalize text-muted-foreground first:rounded-l-md last:rounded-r-md",
                  mode === m && "bg-foreground text-background",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            className="h-8 rounded-md border bg-background px-2 text-sm text-muted-foreground"
            title="Explanation level"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="detailed">Detailed</option>
          </select>
          {history.length > 0 && (
            <Button variant="ghost" size="icon" onClick={() => clear().catch(() => toast.error("Couldn't clear"))} title="Clear chat">
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </header>

      {mode === "student" && materials.length === 0 && (
        <p className="mb-3 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Tip: upload materials in Materials so answers can quote your own notes.
        </p>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {history.length === 0 && !pending && (
          <div className="mx-auto max-w-md py-16 text-center">
            <p className="text-sm font-medium">Ask anything — grounded in your materials.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "office" ? "Office mode: work-doc drafts, summaries, planning." : "Student mode: doubt-solving from your own syllabus."}
            </p>
          </div>
        )}
        {history.map((m) => (
          <div key={m._id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-6",
                m.role === "user" ? "bg-foreground text-background" : "border bg-card",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex flex-col items-end gap-1">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-foreground px-3.5 py-2.5 text-sm leading-6 text-background">
              {pending}
            </div>
            <div className="max-w-[85%] rounded-lg border bg-card px-3.5 py-2.5 text-sm leading-6 text-muted-foreground">
              Thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="pt-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => setInput(c)}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendNow();
              }
            }}
            placeholder={mode === "office" ? "Ask about work drafts, summaries, planning…" : "Ask a doubt — e.g. explain integration by parts…"}
            rows={1}
            className="min-h-11 max-h-40 resize-none"
            disabled={busy}
          />
          <Button size="icon" onClick={sendNow} disabled={busy || !input.trim()} title="Send">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
