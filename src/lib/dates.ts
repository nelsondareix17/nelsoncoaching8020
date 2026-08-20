export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function lastNDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(toISO(d));
  }
  return out;
}

export function shortLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function dayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Aujourd'hui";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (iso === toISO(y)) return "Hier";
  const [yy, mm, dd] = iso.split("-").map(Number);
  const date = new Date(yy!, (mm ?? 1) - 1, dd ?? 1);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function groupByDay<T extends { entry_date: string }>(rows: T[]): { day: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.entry_date);
    if (list) list.push(row);
    else map.set(row.entry_date, [row]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, items]) => ({ day, items }));
}
