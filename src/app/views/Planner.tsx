import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBumpStreak } from "../lib/providers";

type Horizon = "daily" | "weekly" | "monthly";

export default function Planner() {
  const profile = useQuery(api.profile.getMy);
  const syllabus = useQuery(api.library.listSyllabus);
  const materials = useQuery(api.library.listMaterials) ?? [];
  const savePlan = useMutation(api.profile.savePlanner);
  const gen = useAction(api.ai.studyPlan);
  const bump = useBumpStreak();

  const [horizon, setHorizon] = useState<Horizon>("daily");
  const [notes, setNotes] = useState("");
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.plannerText != null && text === null) setText(profile.plannerText);
  }, [profile?.plannerText, text]);

  const syllabusText = (syllabus?.subjects ?? [])
    .map((s) => {
      const sUnits = (syllabus?.units ?? []).filter((u) => u.subjectId === s._id);
      const lines = sUnits.map((u) => {
        const t = (syllabus?.topics ?? []).filter((x) => x.unitId === u._id);
        return `  ${u.title}: ${t.map((x) => `${x.title} [${x.status}]`).join("; ") || "—"}`;
      });
      return `${s.name}\n${lines.join("\n")}`;
    })
    .join("\n\n");

  const generate = async () => {
    setBusy(true);
    try {
      const plan = await gen({
        mode: profile?.mode === "office" ? "office" : "student",
        horizon,
        syllabus: syllabusText,
        materials: materials.map((m) => ({ title: m.title, text: m.text ?? "" })),
        extraNotes: notes.trim() || undefined,
      });
      setText(plan);
      await savePlan({ text: plan });
      bump();
      toast.success("Plan generated — edit freely below");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const saveEdits = async () => {
    if (text == null) return;
    try {
      await savePlan({ text });
      toast.success("Plan saved");
    } catch {
      toast.error("Couldn't save the plan");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Study planner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a {horizon} plan from your syllabus and progress, then edit it freely.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Generate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex rounded-md border text-sm" role="tablist">
            {(["daily", "weekly", "monthly"] as Horizon[]).map((h) => (
              <button
                key={h}
                role="tab"
                aria-selected={horizon === h}
                onClick={() => setHorizon(h)}
                className={cn(
                  "px-3 py-1 capitalize first:rounded-l-md last:rounded-r-md",
                  horizon === h ? "bg-foreground text-background" : "text-muted-foreground",
                )}
              >
                {h}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Optional notes: exam dates, free hours, weak areas…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
          <Button onClick={generate} disabled={busy || (!syllabusText.trim() && !notes.trim())}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate {horizon} plan
          </Button>
          {!syllabusText.trim() && !notes.trim() && (
            <p className="text-xs text-muted-foreground">
              Add topics in Syllabus (or type some notes above) to enable planning.
            </p>
          )}
        </CardContent>
      </Card>

      {text != null && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Your plan</CardTitle>
              <Button variant="outline" size="sm" onClick={saveEdits}>
                Save edits
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={16} className="font-mono text-[13px] leading-6" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
