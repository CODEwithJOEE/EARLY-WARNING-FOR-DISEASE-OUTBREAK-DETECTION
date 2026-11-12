import type { RiskLevel } from "@/lib/types";

const STYLE: Record<RiskLevel, string> = {
  low: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  moderate: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  high: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export default function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${STYLE[level]}`}>
      {level}
    </span>
  );
}
