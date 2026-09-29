import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { fmtMoney, pct, todayStr } from "../lib/helpers";
import { cn } from "@/lib/utils";

export default function Analytics() {
  const expensesQuery = useQuery(api.tracking.listExpenses);
  const expenses = useMemo(() => expensesQuery ?? [], [expensesQuery]);
  const profile = useQuery(api.profile.getMy);
  const monthlyBudget = profile?.monthlyBudget ?? 0;

  const today = todayStr();
  const weekStart = (() => {
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() - d.getDay());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const month = today.slice(0, 7);

  const totals = useMemo(() => {
    const day = expenses.filter((e) => e.date === today).reduce((s, e) => s + e.amount, 0);
    const week = expenses.filter((e) => e.date >= weekStart && e.date <= today).reduce((s, e) => s + e.amount, 0);
    const mo = expenses.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0);
    const all = expenses.reduce((s, e) => s + e.amount, 0);
    return { day, week, mo, all };
  }, [expenses, today, weekStart, month]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) if (e.date.startsWith(month)) map[e.category] = (map[e.category] ?? 0) + e.amount;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses, month]);

  const last7 = useMemo(() => {
    const out: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(`${today}T00:00:00`);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({
        date: key,
        total: expenses.filter((e) => e.date === key).reduce((s, e) => s + e.amount, 0),
      });
    }
    return out;
  }, [expenses, today]);

  const insights = useMemo(() => {
    const lines: string[] = [];
    const daysElapsed = Number(today.slice(-2));
    const monthDays = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
    const projected = monthDays > 0 ? Math.round((totals.mo / daysElapsed) * monthDays) : 0;
    if (totals.mo > 0) {
      lines.push(
        `You're averaging ${fmtMoney(Math.round(totals.mo / daysElapsed))} a day this month. At this pace you'll end the month near ${fmtMoney(projected)}.`,
      );
    }
    if (byCategory.length > 0) {
      lines.push(`${byCategory[0][0]} is your top category so far — ${fmtMoney(byCategory[0][1])} this month.`);
    }
    if (monthlyBudget > 0 && totals.mo > 0) {
      const p = pct(totals.mo, monthlyBudget);
      lines.push(
        p >= 100
          ? `You've crossed your monthly budget (${p}%). Consider trimming non-essentials.`
          : `You've used ${p}% of your monthly budget — ${fmtMoney(monthlyBudget - totals.mo)} left for ${monthDays - daysElapsed} days.`,
      );
    }
    if (lines.length === 0) lines.push("Add a few expenses to see insights here.");
    return lines;
  }, [totals, byCategory, monthlyBudget, today]);

  const max7 = Math.max(...last7.map((d) => d.total), 1);
  const maxCat = Math.max(...byCategory.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Where the money went. Not financial advice.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Today", value: totals.day },
          { label: "This week", value: totals.week },
          { label: "This month", value: totals.mo },
          { label: "All time", value: totals.all },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="tnum mt-1 text-xl font-semibold">{fmtMoney(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Last 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-2">
            {last7.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="tnum text-[10px] text-muted-foreground">{d.total > 0 ? fmtMoney(d.total) : ""}</span>
                <div
                  className={cn("w-full max-w-8 rounded-t-sm", d.total > 0 ? "bg-foreground/80" : "bg-border")}
                  style={{ height: `${Math.max((d.total / max7) * 100, 2)}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">By category — this month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {byCategory.length === 0 && <p className="text-sm text-muted-foreground">No expenses this month yet.</p>}
          {byCategory.map(([name, value]) => (
            <div key={name}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="truncate">{name}</span>
                <span className="tnum text-muted-foreground">{fmtMoney(value)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-foreground/70" style={{ width: `${(value / maxCat) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm leading-6">
            {insights.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">—</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground/70">Figures are estimates, not financial advice.</p>
        </CardContent>
      </Card>
    </div>
  );
}
