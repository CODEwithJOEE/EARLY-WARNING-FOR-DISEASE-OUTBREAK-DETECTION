import Link from "next/link";
import DiseaseCharts from "@/components/DiseaseCharts";
import RiskBadge from "@/components/RiskBadge";
import { getSessionProfile } from "@/lib/auth";
import { RECOMMENDATIONS } from "@/lib/recommendations";
import {
  DISEASES,
  DISEASE_LABEL,
  monthLabel,
  type AlertRow,
  type CaseRow,
  type Disease,
  type Prediction,
  type WeatherRow,
} from "@/lib/types";

export default async function DashboardPage() {
  const { supabase } = await getSessionProfile();

  const [casesRes, weatherRes, predRes, alertRes] = await Promise.all([
    supabase.from("monthly_cases").select("*").order("year").order("month"),
    supabase.from("monthly_weather").select("*").order("year").order("month"),
    supabase.from("predictions").select("*").order("year", { ascending: false }).order("month", { ascending: false }).limit(30),
    supabase.from("alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(10),
  ]);

  const cases = (casesRes.data ?? []) as CaseRow[];
  const weather = (weatherRes.data ?? []) as WeatherRow[];
  const allPreds = (predRes.data ?? []) as Prediction[];
  const alerts = (alertRes.data ?? []) as AlertRow[];

  // Latest forecast per disease.
  const latest: Partial<Record<Disease, Prediction>> = {};
  for (const p of allPreds) if (!latest[p.disease]) latest[p.disease] = p;
  const thresholds: Partial<Record<Disease, number>> = {};
  for (const d of DISEASES) {
    const t = latest[d]?.stat_threshold;
    if (t != null) thresholds[d] = Number(t);
  }

  const last = cases[cases.length - 1];

  if (!cases.length) {
    return (
      <div className="card p-6">
        <h1 className="text-lg font-semibold">No data yet</h1>
        <p className="mt-1 text-sm text-muted">
          Add monthly cases on the <Link className="underline" href="/cases">Monthly cases</Link> page, or load the demo data with{" "}
          <code>python ml/seed_supabase.py</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">
          {cases.length} months of data, latest {last ? monthLabel(last.year, last.month) : "—"}.
          {allPreds.length === 0 && " No forecast yet: run the Python pipeline."}
        </p>
      </div>

      <section aria-labelledby="risk-h" className="space-y-3">
        <h2 id="risk-h" className="text-lg font-semibold">
          Forecast risk{latest.cough ? ` for ${monthLabel(latest.cough.year, latest.cough.month)}` : ""}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {DISEASES.map((d) => {
            const p = latest[d];
            return (
              <article key={d} className="card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{DISEASE_LABEL[d]}</h3>
                  {p ? <RiskBadge level={p.risk_level} /> : <span className="text-xs text-muted">No forecast</span>}
                </div>
                {p && (
                  <>
                    <p className="mt-3 text-3xl font-semibold tabular-nums">{Math.round(Number(p.risk_score) * 100)}%</p>
                    <p className="text-xs text-muted">Model risk score</p>
                    {p.top_factors && p.top_factors.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium">Main factors</p>
                        <ul className="mt-1 space-y-0.5 text-sm text-muted">
                          {p.top_factors.slice(0, 3).map((f) => (
                            <li key={f.feature}>{f.feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="alerts-h" className="space-y-3">
        <h2 id="alerts-h" className="text-lg font-semibold">
          Open alerts
        </h2>
        {alerts.length === 0 ? (
          <p className="card p-4 text-sm text-muted">No open alerts.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => (
              <article key={a.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <RiskBadge level={a.level} />
                  <h3 className="font-semibold">
                    {DISEASE_LABEL[a.disease]} · {monthLabel(a.year, a.month)}
                  </h3>
                </div>
                {a.message && <p className="mt-1 text-sm">{a.message}</p>}
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer font-medium">Suggested actions</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                    {RECOMMENDATIONS[a.disease].map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted">Suggestions only. The RHU decides what action to take.</p>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>

      <DiseaseCharts cases={cases} weather={weather} thresholds={thresholds} />
    </div>
  );
}
