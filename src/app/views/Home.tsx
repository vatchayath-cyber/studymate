import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useFocus, useBumpStreak } from "../lib/providers";
import { fmtMoney, pct, todayStr } from "../lib/helpers";
import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { ArrowRight, Flame, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type SuggestionState =
  | { status: "idle" }
  | { status: "done"; items: string[] }
  | { status: "error"; message: string };

export default function Home() {
  const profile = useQuery(api.profile.getMy);
  const tasksQuery = useQuery(api.tracking.listTasks);
  const expensesQuery = useQuery(api.tracking.listExpenses);
  const syllabus = useQuery(api.library.listSyllabus);
  const tasks = useMemo(() => tasksQuery ?? [], [tasksQuery]);
  const expenses = useMemo(() => expensesQuery ?? [], [expensesQuery]);
  const focus = useFocus();
  const bump = useBumpStreak();
  const navigate = useNavigate();
  const suggest = useAction(api.ai.suggestions);

  const today = todayStr();
  const month = today.slice(0, 7);

  const todayTasks = tasks.filter((t) => t.date === today);
  const openTasks = todayTasks.filter((t) => !t.done);
  const doneTasks = todayTasks.filter((t) => t.done);

  const totalTopics = syllabus?.topics.length ?? 0;
  const doneTopics = syllabus?.topics.filter((t) => t.status === "Completed").length ?? 0;
  const progress = pct(doneTopics, totalTopics);

  const monthSpent = expenses
    .filter((e) => e.date.startsWith(month))
    .reduce((s, e) => s + e.amount, 0);
  const budget = profile?.monthlyBudget ?? 0;
  const mode = profile?.mode ?? "student";
  const streakCount = profile?.streakCount ?? 0;
  const streakBest = profile?.streakBest ?? 0;

  const last7 = (profile?.streakDays ?? []).slice(-7);

  const [sugState, setSugState] = useState<SuggestionState>({ status: "idle" });
  const requestedRef = useRef(false);
  const hasData = tasks.length > 0 || expenses.length > 0 || totalTopics > 0;

  // Fetch once, and only ever setState from promise callbacks (not synchronously in the effect).
  useEffect(() => {
    if (requestedRef.current || profile === undefined || !hasData) return;
    requestedRef.current = true;
    const summary = [
      `Mode: ${mode === "office" ? "office worker" : "student"}.`,
      `Syllabus: ${totalTopics} topics, ${doneTopics} completed.`,
      `Tasks today: ${openTasks.length} open, ${doneTasks.length} done.`,
      budget > 0
        ? `Spent ${fmtMoney(monthSpent)} of a ${fmtMoney(budget)} monthly budget.`
        : `Spent ${fmtMoney(monthSpent)} this month, no budget set.`,
      `Streak: ${streakCount} days (best ${streakBest}).`,
    ].join(" ");
    suggest({ mode, summary })
      .then((items) => setSugState({ status: "done", items }))
      .catch((e) => setSugState({ status: "error", message: e instanceof Error ? e.message : "Failed" }));
  }, [
    suggest,
    profile,
    hasData,
    mode,
    totalTopics,
    doneTopics,
    openTasks.length,
    doneTasks.length,
    budget,
    monthSpent,
    streakCount,
    streakBest,
  ]);

  // Visiting Home counts as activity for today's streak (server dedupes per day).
  useEffect(() => {
    bump();
  }, [bump]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Welcome{profile?.name ? `, ${profile.name}` : ""}
          </h1>
        </div>
        <div className="hidden text-right text-sm text-muted-foreground sm:block">
          <p>
            Best streak <span className="tnum font-medium text-foreground">{streakBest}</span>
          </p>
          <p>
            Focus <span className="tnum font-medium text-foreground">{focus.state.minutes}m</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(mode === "office" ? "/app/expenses" : "/app/chat")}
        >
          {mode === "office" ? "Open Expenses" : "Ask the assistant"}
          <ArrowRight className="size-4" />
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="tnum text-3xl font-semibold">{openTasks.length}</span>
              <span className="text-sm text-muted-foreground">open · {doneTasks.length} done</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {todayTasks.slice(0, 4).map((t) => (
                <div key={t._id} className="flex items-center gap-2 text-sm">
                  <span className={cn("size-1.5 rounded-full", t.done ? "bg-border" : "bg-foreground")} />
                  <span className={cn("truncate", t.done && "text-muted-foreground line-through")}>{t.title}</span>
                </div>
              ))}
              {todayTasks.length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing scheduled — add tasks in Calendar.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Syllabus progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="tnum text-3xl font-semibold">{progress}%</span>
              <span className="text-sm text-muted-foreground">
                {doneTopics} of {totalTopics} topics
              </span>
            </div>
            <Progress value={progress} className="mt-3 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This month's spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="tnum text-3xl font-semibold">{fmtMoney(monthSpent)}</span>
              <span className="text-sm text-muted-foreground">
                {budget > 0 ? `of ${fmtMoney(budget)}` : "no budget set"}
              </span>
            </div>
            {budget > 0 && <Progress value={pct(monthSpent, budget)} className="mt-3 h-1.5" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="tnum text-3xl font-semibold">{streakCount}</span>
              <Flame className="size-4 self-center text-muted-foreground" />
              <span className="text-sm text-muted-foreground">days in a row</span>
            </div>
            <div className="mt-3 flex gap-1.5">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                return (
                  <span
                    key={i}
                    className={cn("h-1.5 flex-1 rounded-full", last7.includes(key) ? "bg-foreground" : "bg-border")}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="size-4" /> AI suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sugState.status === "idle" &&
            (hasData ? (
              <p className="text-sm text-muted-foreground">Thinking…</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add topics, tasks or expenses — suggestions appear once there's something to work with.
              </p>
            ))}
          {sugState.status === "error" && <p className="text-sm text-muted-foreground">{sugState.message}</p>}
          {sugState.status === "done" && (
            <>
              <ul className="space-y-2">
                {sugState.items.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-6">
                    <span className="tnum text-muted-foreground">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground/70">
                Suggestions are ideas, not financial or exam advice.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
