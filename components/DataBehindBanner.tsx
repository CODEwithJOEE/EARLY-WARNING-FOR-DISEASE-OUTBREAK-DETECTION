import Link from "next/link";
import { monthLabel } from "@/lib/types";

export default function DataBehindBanner({
  latest,
  missing,
}: {
  latest: { year: number; month: number };
  missing: { year: number; month: number };
}) {
  return (
    <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Data is behind</p>
      <p className="mt-0.5">
        The latest month entered is {monthLabel(latest.year, latest.month)}. Add {monthLabel(missing.year, missing.month)} on
        the{" "}
        <Link className="underline" href="/cases">
          Monthly cases
        </Link>{" "}
        page, then run the prediction. The forecast shown below may be out of date.
      </p>
    </div>
  );
}
