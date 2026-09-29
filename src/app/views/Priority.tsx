import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useBumpStreak } from "../lib/providers";

const COLUMNS = [
  { key: "High", label: "High priority" },
  { key: "Medium", label: "Medium" },
  { key: "Low", label: "Low" },
] as const;

export default function Priority() {
  const syllabus = useQuery(api.library.listSyllabus);
  const materials = useQuery(api.library.listMaterials) ?? [];
  const saved = useQuery(api.library.getPriorityTopics);
  const gen = useAction(api.ai.importantTopics);
  const save = useMutation(api.library.savePriorityTopics);
  const bump = useBumpStreak();
  const [busy, setBusy] = useState(false);

  const syllabusText = (syllabus?.subjects ?? [])
    .map((s) => {
      const sUnits = (syllabus?.units ?? []).filter((u) => u.subjectId === s._id);
      const lines = sUnits.map((u) => {
        const t = (syllabus?.topics ?? []).filter((x) => x.unitId === u._id);
        return `  ${u.title}: ${t.map((x) => x.title).join("; ") || "—"}`;
      });
      return `${s.name}\n${lines.join("\n")}`;
    })
    .join("\n\n");

  const generate = async () => {
    setBusy(true);
    try {
      const raw = await gen({
        syllabus: syllabusText,
        materials: materials.map((m) => ({ title: m.title, text: m.text ?? "" })),
      });
      const items = raw.map((r) => ({
        topic: r.topic,
        priority: (r.priority === "High" ? "High" : r.priority === "Low" ? "Low" : "Medium") as "High" | "Medium" | "Low",
        reason: r.reason,
      }));
      await save({ items });
      bump();
      toast.success("Priorities updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    }  finally {
      setBusy(false);
    }
  };

  const items = saved?.items ?? [];
  const groups = {
    High: items.filter((i) => i.priority === "High"),
    Medium: items.filter((i) => i.priority === "Medium"),
    Low: items.filter((i) => i.priority === "Low"),
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight">Important topics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-predicted from your syllabus and materials. Not exam-guaranteed — always verify with your faculty.
          </p>
        </div>
        <Button onClick={generate} disabled={busy || !syllabusText.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {items.length ? "Regenerate" : "Generate"}
        </Button>
      </header>

      {!syllabusText.trim() && (
        <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Add subjects and topics in Syllabus first.
        </p>
      )}

      {items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.key} className="rounded-md border bg-card">
              <div className="hairline-b flex items-center justify-between px-4 py-2.5">
                <p className="text-sm font-medium">{col.label}</p>
                <span className="tnum text-xs text-muted-foreground">{groups[col.key].length}</span>
              </div>
              <div className="space-y-2 p-3">
                {groups[col.key].map((item, i) => (
                  <div key={i} className="rounded border px-3 py-2">
                    <p className="text-sm font-medium leading-5">{item.topic}</p>
                    {item.reason && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.reason}</p>}
                  </div>
                ))}
                {groups[col.key].length === 0 && (
                  <p className="px-1 py-2 text-xs text-muted-foreground">None</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {saved && (
        <p className="text-xs text-muted-foreground/70">
          Last generated {new Date(saved.generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
