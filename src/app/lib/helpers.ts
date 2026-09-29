/** Shared helpers for the StudyMate app shell. */

export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysStr(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return todayStr(d);
}

export function fmtDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function fmtMoney(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

/** Budget alert level. Thresholds: 100% = over, 85% = near, 70% = watch. */
export type BudgetLevel = "ok" | "watch" | "near" | "over";

export function budgetLevel(used: number, limit: number): BudgetLevel {
  if (limit <= 0) return "ok";
  const p = pct(used, limit);
  if (p >= 100) return "over";
  if (p >= 85) return "near";
  if (p >= 70) return "watch";
  return "ok";
}
