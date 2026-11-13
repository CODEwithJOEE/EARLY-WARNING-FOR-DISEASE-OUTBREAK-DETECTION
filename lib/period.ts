// Calendar helpers in Philippine time (the RHU's time zone), independent of the server's zone.
export function manilaNow(now: Date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Month index used for comparing months: year * 12 + (month - 1). */
export const monthIndex = (year: number, month: number) => year * 12 + (month - 1);

export function fromMonthIndex(i: number): { year: number; month: number } {
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
}

/**
 * The data is "behind" when the latest month entered is older than the previous calendar month.
 * Returns the first month that still needs to be added, or null if the data is up to date.
 */
export function firstMissingMonth(
  latest: { year: number; month: number },
  now: Date = new Date(),
): { year: number; month: number } | null {
  const n = manilaNow(now);
  const previous = monthIndex(n.year, n.month) - 1;
  const have = monthIndex(latest.year, latest.month);
  return have < previous ? fromMonthIndex(have + 1) : null;
}
