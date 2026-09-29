import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate, todayStr } from "../lib/helpers";
import { useBumpStreak } from "../lib/providers";

const TYPES = ["study", "personal", "exam", "other"] as const;
type TaskType = (typeof TYPES)[number];

function monthMatrix(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export default function CalendarView() {
  const tasksQuery = useQuery(api.tracking.listTasks);
  const tasks = useMemo(() => tasksQuery ?? [], [tasksQuery]);
  const add = useMutation(api.tracking.addTask);
  const toggle = useMutation(api.tracking.setTaskDone);
  const remove = useMutation(api.tracking.deleteTask);
  const bump = useBumpStreak();

  const today = todayStr();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState<TaskType>("study");

  const rows = useMemo(() => monthMatrix(cursor.y, cursor.m), [cursor]);

  const byDay = useMemo(() => {
    const map: Record<string, typeof tasks> = {};
    for (const t of tasks) {
      (map[t.date] ??= []).push(t);
    }
    return map;
  }, [tasks]);

  const weekOf = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(start);
      x.setDate(start.getDate() + i);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    });
  };

  const addTask = async () => {
    if (!title.trim()) return;
    try {
      await add({ date: selected, time: time.trim() || undefined, title: title.trim(), type });
      setTitle("");
      setTime("");
      bump();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tasks with dates, times, and types.</p>
        </div>
      </header>

      <Card>
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}>
            <ChevronLeft className="size-4" />
          </Button>
          <p className="text-sm font-medium">{monthLabel}</p>
          <Button variant="ghost" size="icon" onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="hairline-b grid grid-cols-7 px-2 pb-1.5 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 p-2">
          {rows.flat().map((date, i) => {
            if (!date) return <span key={i} />;
            const dayTasks = byDay[date] ?? [];
            const isToday = date === today;
            const isSelected = date === selected;
            return (
              <button
                key={i}
                onClick={() => {
                  setSelected(date);
                  setShowForm(true);
                }}
                className={cn(
                  "mx-auto flex size-9 flex-col items-center justify-center rounded-md text-sm transition-colors hover:bg-accent",
                  isSelected && "bg-foreground text-background hover:bg-foreground",
                  isToday && !isSelected && "font-semibold",
                )}
              >
                <span className="tnum">{Number(date.slice(-2))}</span>
                {dayTasks.length > 0 && (
                  <span className={cn("mt-0.5 flex gap-0.5", isSelected && "opacity-80")}>
                    {dayTasks.slice(0, 3).map((t, j) => (
                      <span key={j} className={cn("size-1 rounded-full", isSelected ? "bg-background" : t.done ? "bg-muted-foreground/50" : "bg-foreground")} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Week of {fmtDate(weekOf(selected)[0])}</h2>
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Add task
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-2 py-4">
            <div className="min-w-40 flex-1">
              <label className="text-xs text-muted-foreground">Task</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Revise Unit 2" />
            </div>
            <div className="w-28">
              <label className="text-xs text-muted-foreground">Time</label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="w-32">
              <label className="text-xs text-muted-foreground">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as TaskType)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="text-xs text-muted-foreground">Date</label>
              <Input type="date" value={selected} onChange={(e) => setSelected(e.target.value)} />
            </div>
            <Button onClick={addTask} disabled={!title.trim()}>
              <Plus className="size-4" /> Add
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} title="Close">
              <X className="size-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {weekOf(selected).map((date) => {
          const dayTasks = (byDay[date] ?? []).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "") || a.title.localeCompare(b.title));
          return (
            <div key={date}>
              <p className={cn("mb-1 text-xs font-medium", date === today ? "text-foreground" : "text-muted-foreground")}>
                {fmtDate(date)} {date === today && "· Today"}
              </p>
              {dayTasks.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground/70">—</p>
              ) : (
                <div className="space-y-1.5">
                  {dayTasks.map((t) => (
                    <Card key={t._id}>
                      <CardContent className="flex items-center gap-3 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => toggle({ id: t._id, done: !t.done }).then(bump).catch(() => toast.error("Failed"))}
                          className="size-4 accent-foreground"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm", t.done && "text-muted-foreground line-through")}>{t.title}</p>
                        </div>
                        {t.time && <span className="tnum shrink-0 text-xs text-muted-foreground">{t.time}</span>}
                        <span className="hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] capitalize text-muted-foreground sm:block">{t.type}</span>
                        <button
                          onClick={() => remove({ id: t._id }).catch(() => toast.error("Failed"))}
                          className="rounded p-1 text-muted-foreground hover:text-foreground"
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
