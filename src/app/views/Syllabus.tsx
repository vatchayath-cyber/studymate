import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { pct } from "../lib/helpers";
import { useBumpStreak } from "../lib/providers";

const STATUSES = ["Not Started", "In Progress", "Completed", "Needs Revision"] as const;
type Status = (typeof STATUSES)[number];

export default function Syllabus() {
  const data = useQuery(api.library.listSyllabus);
  const addSub = useMutation(api.library.addSubject);
  const delSub = useMutation(api.library.deleteSubject);
  const addUnit = useMutation(api.library.addUnit);
  const delUnit = useMutation(api.library.deleteUnit);
  const addTopic = useMutation(api.library.addTopic);
  const delTopic = useMutation(api.library.deleteTopic);
  const setStatus = useMutation(api.library.setTopicStatus);
  const bulk = useMutation(api.library.bulkImport);
  const bump = useBumpStreak();

  const [subjectName, setSubjectName] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [unitDraft, setUnitDraft] = useState<Record<string, string>>({});
  const [topicDraft, setTopicDraft] = useState<Record<string, string>>({});

  if (data === undefined) return <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>;
  const { subjects, units, topics } = data;

  const topicsOf = (unitId: string) => topics.filter((t) => t.unitId === unitId);
  const unitsOf = (subjectId: string) => units.filter((u) => u.subjectId === subjectId);
  const doneIn = (list: typeof topics) => list.filter((t) => t.status === "Completed").length;

  const addSubject = async () => {
    const name = subjectName.trim();
    if (!name) return;
    try {
      await addSub({ name });
      setSubjectName("");
      bump();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const runImport = async () => {
    if (!importText.trim()) return;
    try {
      const res = await bulk({ text: importText });
      toast.success(`Imported ${res.subjects} subjects, ${res.units} units, ${res.topics} topics`);
      setImportText("");
      setImportOpen(false);
      bump();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight">Syllabus</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subjects.length} subjects · {topics.length} topics · {pct(doneIn(topics), topics.length)}% complete
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(!importOpen)}>
          Bulk import
        </Button>
      </header>

      {importOpen && (
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            One subject per line, or use <code className="rounded bg-muted px-1"># Subject</code>,{" "}
            <code className="rounded bg-muted px-1">## Unit</code>, <code className="rounded bg-muted px-1">- Topic</code>.
          </p>
          <Textarea
            className="mt-2"
            rows={6}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"DBMS\n## Unit 1\n- ER Model\n- Normalization\nMathematics"}
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={runImport}>Import</Button>
            <Button size="sm" variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Add subject…"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSubject()}
        />
        <Button onClick={addSubject} disabled={!subjectName.trim()}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {subjects.map((s) => {
          const sUnits = unitsOf(s._id);
          const sTopics = sUnits.flatMap((u) => topicsOf(u._id));
          const open = expanded[s._id];
          return (
            <Card key={s._id}>
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  onClick={() => setExpanded((e) => ({ ...e, [s._id]: !open }))}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <Progress value={pct(doneIn(sTopics), sTopics.length)} className="mt-1.5 h-1" />
                </div>
                <span className="tnum shrink-0 text-xs text-muted-foreground">
                  {doneIn(sTopics)}/{sTopics.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => delSub({ id: s._id }).catch(() => toast.error("Failed"))}
                  title="Delete subject"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {open && (
                <div className="border-t px-4 py-3">
                  <div className="space-y-3">
                    {sUnits.map((u) => {
                      const uTopics = topicsOf(u._id);
                      return (
                        <div key={u._id} className="rounded-md border bg-muted/30 p-3">
                          <div className="flex items-center gap-2">
                            <p className="min-w-0 flex-1 truncate text-sm font-medium">{u.title}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => delUnit({ id: u._id }).catch(() => toast.error("Failed"))}
                              title="Delete unit"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>

                          <div className="mt-2 space-y-1">
                            {uTopics.map((t) => (
                              <div key={t._id} className="group flex items-center gap-2 text-sm">
                                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                                <select
                                  value={t.status}
                                  onChange={(e) =>
                                    setStatus({ id: t._id, status: e.target.value as Status }).then(bump).catch(() => toast.error("Failed"))
                                  }
                                  className="h-7 rounded border bg-background px-1.5 text-xs"
                                >
                                  {STATUSES.map((s2) => (
                                    <option key={s2} value={s2}>{s2}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => delTopic({ id: t._id }).catch(() => toast.error("Failed"))}
                                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                                  title="Delete topic"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="mt-2 flex gap-1.5">
                            <Input
                              className="h-8 text-sm"
                              placeholder="Add topic…"
                              value={topicDraft[u._id] ?? ""}
                              onChange={(e) => setTopicDraft((d) => ({ ...d, [u._id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && (topicDraft[u._id] ?? "").trim()) {
                                  addTopic({ unitId: u._id, title: topicDraft[u._id] })
                                    .then(() => {
                                      setTopicDraft((d) => ({ ...d, [u._id]: "" }));
                                      bump();
                                    })
                                    .catch(() => toast.error("Failed"));
                                }
                              }}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-8"
                              disabled={!(topicDraft[u._id] ?? "").trim()}
                              onClick={() =>
                                addTopic({ unitId: u._id, title: topicDraft[u._id] })
                                  .then(() => {
                                    setTopicDraft((d) => ({ ...d, [u._id]: "" }));
                                    bump();
                                  })
                                  .catch(() => toast.error("Failed"))
                              }
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex gap-1.5">
                      <Input
                        className="h-8 text-sm"
                        placeholder="Add unit…"
                        value={unitDraft[s._id] ?? ""}
                        onChange={(e) => setUnitDraft((d) => ({ ...d, [s._id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (unitDraft[s._id] ?? "").trim()) {
                            addUnit({ subjectId: s._id, title: unitDraft[s._id] })
                              .then(() => setUnitDraft((d) => ({ ...d, [s._id]: "" })))
                              .catch(() => toast.error("Failed"));
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        disabled={!(unitDraft[s._id] ?? "").trim()}
                        onClick={() =>
                          addUnit({ subjectId: s._id, title: unitDraft[s._id] })
                            .then(() => setUnitDraft((d) => ({ ...d, [s._id]: "" })))
                            .catch(() => toast.error("Failed"))
                        }
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {subjects.length === 0 && (
          <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            No subjects yet — add one above or bulk import.
          </p>
        )}
      </div>
    </div>
  );
}
