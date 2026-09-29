import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Bell, CalendarClock, Flame, Wallet } from "lucide-react";
import { addDaysStr, budgetLevel, fmtDate, fmtMoney, pct, todayStr } from "../lib/helpers";

type Alert = {
  icon: "task" | "exam" | "budget" | "revision" | "streak";
  title: string;
  detail: string;
  tone: "default" | "warn" | "danger";
};

export default function Alerts() {
  const tasks = useQuery(api.tracking.listTasks) ?? [];
  const expenses = useQuery(api.tracking.listExpenses) ?? [];
  const syllabus = useQuery(api.library.listSyllabus);
  const profile = useQuery(api.profile.getMy);

  const today = todayStr();
  const in7 = addDaysStr(today, 7);
  const alerts: Alert[] = [];

  const openToday = tasks.filter((t) => t.date === today && !t.done);
  if (openToday.length > 0) {
    alerts.push({
      icon: "task",
      title: `${openToday.length} task${openToday.length > 1 ? "s" : ""} today`,
      detail: openToday.slice(0, 3).map((t) => t.title).join(", ") + (openToday.length > 3 ? "…" : ""),
      tone: "default",
    });
  }

  const overdue = tasks.filter((t) => !t.done && t.date < today);
  if (overdue.length > 0) {
    alerts.push({
      icon: "task",
      title: `${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}`,
      detail: overdue.slice(0, 3).map((t) => `${t.title} (${fmtDate(t.date)})`).join(", "),
      tone: "warn",
    });
  }

  const exams = tasks.filter((t) => t.type === "exam" && !t.done && t.date >= today && t.date <= in7);
  for (const ex of exams) {
    alerts.push({
      icon: "exam",
      title: `Exam: ${ex.title}`,
      detail: fmtDate(ex.date) === fmtDate(today) ? "Today" : fmtDate(ex.date),
      tone: "warn",
    });
  }

  const budget = profile?.monthlyBudget ?? 0;
  const month = today.slice(0, 7);
  const spent = expenses.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0);
  const level = budgetLevel(spent, budget);
  if (level === "over") {
    alerts.push({
      icon: "budget",
      title: "Monthly budget exceeded",
      detail: `Spent ${fmtMoney(spent)} of ${fmtMoney(budget)} (${pct(spent, budget)}%)`,
      tone: "danger",
    });
  } else if (level === "near" || level === "watch") {
    alerts.push({
      icon: "budget",
      title: "Approaching budget limit",
      detail: `${pct(spent, budget)}% of ${fmtMoney(budget)} used`,
      tone: "warn",
    });
  }

  const revision = (syllabus?.topics ?? []).filter((t) => t.status === "Needs Revision");
  if (revision.length > 0) {
    alerts.push({
      icon: "revision",
      title: `${revision.length} topic${revision.length > 1 ? "s" : ""} need revision`,
      detail: revision.slice(0, 4).map((t) => t.title).join(", ") + (revision.length > 4 ? "…" : ""),
      tone: "warn",
    });
  }

  const streak = profile?.streakCount ?? 0;
  if (streak >= 3) {
    alerts.push({
      icon: "streak",
      title: `${streak}-day streak going`,
      detail: `Best: ${profile?.streakBest ?? streak} days`,
      tone: "default",
    });
  }

  const iconFor = (a: Alert) => {
    switch (a.icon) {
      case "task": return <CalendarClock className="size-4" />;
      case "exam": return <Flame className="size-4" />;
      case "budget": return <Wallet className="size-4" />;
      case "revision": return <Bell className="size-4" />;
      default: return <Bell className="size-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Derived from your tasks, exams, budget, and revision list.</p>
      </header>

      {alerts.length === 0 && (
        <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          All clear — nothing needs attention.
        </p>
      )}

      <div className="space-y-2">
        {alerts.map((a, i) => (
          <Card key={i} className={cnTone(a.tone)}>
            <CardContent className="flex items-start gap-3 py-3.5">
              <span className="mt-0.5 text-muted-foreground">{iconFor(a)}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function cnTone(tone: Alert["tone"]): string {
  if (tone === "danger") return "border-destructive/40";
  if (tone === "warn") return "border-foreground/25";
  return "";
}
