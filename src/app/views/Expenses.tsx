import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtMoney, pct, todayStr } from "../lib/helpers";
import { useBumpStreak } from "../lib/providers";

/** 🟢🟡🟠🔴 threshold dot for spend vs limit. */
function usageDot(used: number, limit: number): { dot: string; label: string } {
  const p = pct(used, limit);
  if (p >= 100) return { dot: "bg-red-500", label: "over" };
  if (p >= 85) return { dot: "bg-orange-400", label: "near limit" };
  if (p >= 70) return { dot: "bg-yellow-400", label: "watch" };
  return { dot: "bg-emerald-500", label: "ok" };
}

export default function Expenses() {
  const expenses = useQuery(api.tracking.listExpenses) ?? [];
  const categories = useQuery(api.tracking.listCategories) ?? [];
  const budgets = useQuery(api.tracking.listBudgets) ?? [];
  const profile = useQuery(api.profile.getMy);
  const add = useMutation(api.tracking.addExpense);
  const remove = useMutation(api.tracking.deleteExpense);
  const addCat = useMutation(api.tracking.addCategory);
  const delCat = useMutation(api.tracking.deleteCategory);
  const setB = useMutation(api.tracking.setBudget);
  const updateProfile = useMutation(api.profile.update);
  const bump = useBumpStreak();

  const today = todayStr();
  const month = today.slice(0, 7);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [newCat, setNewCat] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState<Record<string, string>>({});

  const saveOverall = () => {
    const v = Number(budgetDraft.overall ?? "");
    updateProfile({ monthlyBudget: v > 0 ? v : 0 })
      .then(() => toast.success("Budget updated"))
      .catch(() => toast.error("Failed"));
  };

  const catNames = useMemo(() => {
    const names = categories.map((c) => c.name);
    for (const e of expenses) {
      if (!names.includes(e.category)) names.push(e.category);
    }
    return names;
  }, [categories, expenses]);

  const monthExpenses = expenses.filter((e) => e.date.startsWith(month));
  const spentByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthExpenses) map[e.category] = (map[e.category] ?? 0) + e.amount;
    return map;
  }, [monthExpenses]);
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const overallBudget = profile?.monthlyBudget ?? 0;

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter an amount");
      return;
    }
    const cat = category || catNames[0];
    if (!cat) {
      toast.error("Add a category first");
      return;
    }
    try {
      await add({ date, amount: amt, category: cat, note: note.trim() || undefined });
      setAmount("");
      setNote("");
      bump();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtMoney(monthTotal)} this month
            {overallBudget > 0 ? ` of ${fmtMoney(overallBudget)} budget` : ""} ·
            <span className={cn("ml-1.5 font-medium", monthTotal > overallBudget && overallBudget > 0 && "text-destructive")}>
              {overallBudget > 0 ? `${pct(monthTotal, overallBudget)}%` : "no budget set"}
            </span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCatOpen(!catOpen)}>
          Categories & budgets
        </Button>
      </header>

      {catOpen && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Categories & budgets</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCatOpen(false)} title="Close">
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Overall monthly budget</label>
              <div className="mt-1 flex gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 8000"
                  value={budgetDraft.overall ?? String(overallBudget || "")}
                  onChange={(e) => setBudgetDraft((d) => ({ ...d, overall: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveOverall();
                  }}
                />
                <Button variant="outline" onClick={saveOverall}>
                  Set
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Categories</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <span key={c._id} className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
                    {c.name}
                    <button
                      onClick={() => delCat({ id: c._id }).catch(() => toast.error("Failed"))}
                      className="text-muted-foreground hover:text-foreground"
                      title="Remove"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                {categories.length === 0 && <span className="text-xs text-muted-foreground/70">None yet</span>}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="New category…"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCat.trim()) {
                      addCat({ name: newCat })
                        .then(() => setNewCat(""))
                        .catch((e2) => toast.error(e2 instanceof Error ? e2.message : "Failed"));
                    }
                  }}
                />
                <Button
                  variant="outline"
                  disabled={!newCat.trim()}
                  onClick={() =>
                    addCat({ name: newCat })
                      .then(() => setNewCat(""))
                      .catch((e2) => toast.error(e2 instanceof Error ? e2.message : "Failed"))
                  }
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Per-category limits</label>
              <div className="mt-1 space-y-1.5">
                {catNames.map((name) => {
                  const limit = budgets.find((b) => b.category === name)?.limitAmount ?? 0;
                  const spent = spentByCat[name] ?? 0;
                  return (
                    <div key={name} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      <span className="tnum text-xs text-muted-foreground">
                        {fmtMoney(spent)}{limit > 0 ? ` / ${fmtMoney(limit)}` : ""}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        className="h-8 w-28"
                        placeholder="limit"
                        defaultValue={limit || undefined}
                        key={`${name}-${limit}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = Number((e.target as HTMLInputElement).value);
                            setB({ category: name, limitAmount: v > 0 ? v : 0 }).then(() => toast.success("Limit saved"));
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground/70">Type a limit and press Enter. 0 or empty removes it.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Add expense</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-36">
              <label className="text-xs text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="w-28">
              <label className="text-xs text-muted-foreground">Amount</label>
              <Input type="number" min="0" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="min-w-32 flex-1">
              <label className="text-xs text-muted-foreground">Category</label>
              <select value={category || catNames[0] || ""} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                {catNames.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="min-w-40 flex-1">
              <label className="text-xs text-muted-foreground">Note</label>
              <Input placeholder="optional" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button onClick={submit} disabled={!amount || Number(amount) <= 0}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-category usage with threshold dots */}
      {catNames.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {catNames.map((name) => {
            const limit = budgets.find((b) => b.category === name)?.limitAmount ?? 0;
            const spent = spentByCat[name] ?? 0;
            const info = usageDot(spent, limit);
            return (
              <Card key={name}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", limit > 0 ? info.dot : "bg-border")} />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{name}</p>
                    <span className="tnum text-sm">{fmtMoney(spent)}</span>
                    {limit > 0 && <span className="tnum text-xs text-muted-foreground">/ {fmtMoney(limit)}</span>}
                  </div>
                  {limit > 0 && <Progress value={pct(spent, limit)} className="mt-2 h-1" />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="space-y-1.5">
        {expenses.slice(0, 30).map((e) => (
          <Card key={e._id}>
            <CardContent className="flex items-center gap-3 px-3 py-2">
              <span className="tnum shrink-0 text-xs text-muted-foreground">{e.date.slice(5)}</span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {e.note || e.category}
                <span className="ml-1.5 text-xs text-muted-foreground">{e.category}</span>
              </span>
              <span className="tnum shrink-0 text-sm font-medium">{fmtMoney(e.amount)}</span>
              <button
                onClick={() => remove({ id: e._id }).catch(() => toast.error("Failed"))}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                title="Delete"
              >
                <Trash2 className="size-3.5" />
              </button>
            </CardContent>
          </Card>
        ))}
        {expenses.length === 0 && (
          <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No expenses yet.</p>
        )}
      </div>
    </div>
  );
}
