import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useFocus, useBumpStreak } from "../lib/providers";
import { fmtMoney, pct, todayStr } from "../lib/helpers";
import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { ArrowRight, Flame, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type SuggestionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; items: string[] }
  | { status: "error"; message: string };

export default function Home() {
  const { user } = useAuth();
  const profile = useQuery(api.profile.getMy);
  const tasks = useQuery(api.tracking.listTasks) ?? [];
  const expenses = useQuery(api.tracking.listExpenses) ?? [];
  const syllabus = useQuery(api.library.listSyllabus);
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

  const days = profile?.streakDays ?? [];
  const last7 = days.slice(-7);

  const [sugState, setSugState] = useState<SuggestionState>({ status: "idle" });
  const requestedRef = useRef(false);

  const loadSuggestions = useCallback(() => {
    const hasData = tasks.length > 0 || expenses.length > 0 || totalTopics > 0;
    if (!hasData) return;
    setSugState({ status: "loading" });
    const summary = [
      `Mode: ${profile?.mode === "office" ? "office worker" : "student"}.`,
      `Syllabus: ${totalTopics} topics, ${doneTopics} completed.`,
      `Tasks today: ${openTasks.length} open, ${doneTasks.length} done.`,
      budget > 0
        ? `Spent ${fmtMoney(monthSpent)} of a ${fmtMoney(budget)} monthly budget.`
        : `Spent ${fmtMoney(monthSpent)} this month, no budget set.`,
      `Streak: ${profile?.streakCount ?? 0} days (best ${profile?.streakBest ?? 0}).`,
    ].join(" ");
    suggest({ mode: profile?.mode === "office" ? "office" : "student", summary })
      .then((items) => setSugState({ status: "done", items }))
      .catch((e) => setSugState({ status: "error", message: e instanceof Error ? e.message : "Failed" }));
  }, [suggest, profile?.mode, profile?.streakCount, profile?.streakBest, totalTopics, doneTopics, openTasks.length, doneTasks.length, budget, monthSpent, tasks.length, expenses.length]);

  useEffect(() => {
    if (requestedRef.current) return;
    if (profile === undefined) return;
    requestedRef.current = true;
    loadSuggestions();
  }, [profile, loadSuggestions]);

  // Visiting Home counts as activity for today's streak (server dedupes).
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
            Welcome{profile?.name ? `, ${profile.name}` : user?.email ? "" : ""}
          </h1>
        </div>
        <div className="hidden text-right text-sm text-muted-foreground sm:block">
          <p>
            Best streak <span className="tnum font-medium text-foreground">{profile?.streakBest ?? 0}</span>
          </p>
          <p>
            Focus <span className="tnum font-medium text-foreground">{focus.state.minutes}m</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(profile?.mode === "office" ? "/app/expenses" : "/app/chat")}
        >
          {profile?.mode === "office" ? "Open Expenses" : "Ask the assistant"}
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
              <span className="tnum text-3xl font-semibold">{profile?.streakCount ?? 0}</span>
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
          {sugState.status === "idle" && (
            <p className="text-sm text-muted-foreground">
              Add topics, tasks or expenses — suggestions appear once there's something to work with.
            </p>
          )}
          {sugState.status === "loading" && <p className="text-sm text-muted-foreground">Thinking…</p>}
          {sugState.status === "error" && (
            <p className="text-sm text-muted-foreground">{sugState.message}</p>
          )}
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
