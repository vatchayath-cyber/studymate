import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate, todayStr } from "../lib/helpers";
import { useBumpStreak } from "../lib/providers";

const TYPES = ["study", "personal", "exam", "other"] as const;
type TaskType = (typeof TYPES)[number];

export default function Tasks() {
  const tasks = useQuery(api.tracking.listTasks) ?? [];
  const add = useMutation(api.tracking.addTask);
  const toggle = useMutation(api.tracking.setTaskDone);
  const remove = useMutation(api.tracking.deleteTask);
  const bump = useBumpStreak();

  const today = todayStr();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [type, setType] = useState<TaskType>("study");

  const submit = async () => {
    if (!title.trim()) return;
    try {
      await add({ title: title.trim(), date, time: time.trim() || undefined, type });
      setTitle("");
      bump();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const sorted = [...tasks].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.title.localeCompare(b.title));
  const overdue = sorted.filter((t) => !t.done && t.date < today);
  const todays = sorted.filter((t) => t.date === today);
  const upcoming = sorted.filter((t) => t.date > today);
  const done = sorted.filter((t) => t.done && t.date >= today);

  const Row = ({ t }: { t: typeof tasks[number] }) => (
    <Card>
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
        <span className={cn("tnum shrink-0 text-xs", t.date < today && !t.done ? "text-destructive" : "text-muted-foreground")}>{fmtDate(t.date)}</span>
        <button onClick={() => remove({ id: t._id }).catch(() => toast.error("Failed"))} className="rounded p-1 text-muted-foreground hover:text-foreground" title="Delete">
          <Trash2 className="size-3.5" />
        </button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything on your list — overdue first.</p>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-2 py-4">
          <div className="min-w-40 flex-1">
            <label className="text-xs text-muted-foreground">Task</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>
          <div className="w-36">
            <label className="text-xs text-muted-foreground">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
          <Button onClick={submit} disabled={!title.trim()}>
            <Plus className="size-4" /> Add
          </Button>
        </CardContent>
      </Card>

      {[
        { label: "Overdue", items: overdue },
        { label: "Today", items: todays },
        { label: "Upcoming", items: upcoming },
        { label: "Completed", items: done },
      ].map(
        (group) =>
          group.items.length > 0 && (
            <div key={group.label}>
              <h2 className="mb-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground/70">{group.label}</h2>
              <div className="space-y-1.5">
                {group.items.map((t) => (
                  <Row key={t._id} t={t} />
                ))}
              </div>
            </div>
          ),
      )}

      {tasks.length === 0 && (
        <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">No tasks yet.</p>
      )}
    </div>
  );
}
