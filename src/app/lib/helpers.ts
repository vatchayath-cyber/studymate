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
