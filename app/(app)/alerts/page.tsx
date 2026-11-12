import RiskBadge from "@/components/RiskBadge";
import SubmitButton from "@/components/SubmitButton";
import { canEdit, getSessionProfile } from "@/lib/auth";
import { RECOMMENDATIONS } from "@/lib/recommendations";
import { DISEASE_LABEL, monthLabel, type AlertRow } from "@/lib/types";
import { setAlertStatus } from "./actions";

export default async function AlertsPage() {
  const { supabase, role } = await getSessionProfile();
  const { data } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const alerts = (data ?? []) as AlertRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Alerts</h1>
        <p className="text-sm text-muted">
          Raised when the forecast risk or the statistical threshold is
          exceeded.
        </p>
      </div>

      {alerts.length === 0 && (
        <p className="card p-4 text-sm text-muted">No alerts yet.</p>
      )}

      <div className="space-y-3">
        {alerts.map((a) => (
          <article key={a.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge level={a.level} />
                <h2 className="font-semibold">
                  {DISEASE_LABEL[a.disease]} · {monthLabel(a.year, a.month)}
                </h2>
                <span className="rounded-full border border-line px-2 py-0.5 text-xs capitalize text-muted">
                  {a.status}
                </span>
              </div>
              {canEdit(role) && a.status === "open" && (
                <form action={setAlertStatus} className="flex gap-2">
                  <input type="hidden" name="id" value={a.id} />
                  <SubmitButton name="status" value="acknowledged">
                    Acknowledge
                  </SubmitButton>
                  <SubmitButton name="status" value="resolved">
                    Resolve
                  </SubmitButton>
                </form>
              )}
            </div>
            {a.message && <p className="mt-2 text-sm">{a.message}</p>}
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-medium">
                Suggested actions
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                {RECOMMENDATIONS[a.disease].map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
