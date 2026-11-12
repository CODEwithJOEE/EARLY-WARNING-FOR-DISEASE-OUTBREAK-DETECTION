import { getSessionProfile } from "@/lib/auth";
import { DISEASES, DISEASE_LABEL, type Disease, type ModelMetric } from "@/lib/types";

const MODEL_LABEL: Record<string, string> = {
  persistence_baseline: "Statistical baseline (last month's status)",
  rf_no_weather: "Random Forest, no weather",
  rf_with_weather: "Random Forest, with weather",
};
const MODEL_ORDER = ["persistence_baseline", "rf_no_weather", "rf_with_weather"];
const pct = (v: number | null) => (v == null ? "—" : Number(v).toFixed(2));

export default async function MetricsPage() {
  const { supabase } = await getSessionProfile();
  const { data } = await supabase.from("model_metrics").select("*").order("trained_at", { ascending: false }).limit(60);
  const all = (data ?? []) as ModelMetric[];

  // Keep only the newest row per disease + model.
  const latest = new Map<string, ModelMetric>();
  for (const m of all) {
    const k = `${m.disease}:${m.model_name}`;
    if (!latest.has(k)) latest.set(k, m);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Model evaluation</h1>
        <p className="text-sm text-muted">
          One-month-ahead forecasts, validated by training on earlier months and testing on the next one (no random split).
        </p>
      </div>

      <p className="card border-amber-400 p-4 text-sm">
        <strong>Read with care:</strong> the test set is only a handful of months, with very few elevated months in it. These
        numbers are unstable and will change as more monthly records are added.
      </p>

      {latest.size === 0 && <p className="card p-4 text-sm text-muted">No evaluation yet. Run the Python pipeline.</p>}

      {DISEASES.map((d: Disease) => {
        const rows = MODEL_ORDER.map((m) => latest.get(`${d}:${m}`)).filter(Boolean) as ModelMetric[];
        if (!rows.length) return null;
        return (
          <section key={d} aria-labelledby={`m-${d}`} className="card overflow-x-auto">
            <h2 id={`m-${d}`} className="px-4 pt-4 font-semibold">
              {DISEASE_LABEL[d]}
            </h2>
            <table className="mt-2 w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2">Model</th>
                  <th className="px-4 py-2 text-right">Accuracy</th>
                  <th className="px-4 py-2 text-right">Precision</th>
                  <th className="px-4 py-2 text-right">Recall</th>
                  <th className="px-4 py-2 text-right">F1</th>
                  <th className="px-4 py-2">Confusion matrix (TN / FP / FN / TP)</th>
                  <th className="px-4 py-2 text-right">Test months</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.model_name} className="border-b border-line last:border-0">
                    <td className="px-4 py-2">{MODEL_LABEL[m.model_name] ?? m.model_name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{pct(m.accuracy)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{pct(m.precision_score)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{pct(m.recall)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{pct(m.f1)}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {m.confusion_matrix
                        ? `${m.confusion_matrix.tn} / ${m.confusion_matrix.fp} / ${m.confusion_matrix.fn} / ${m.confusion_matrix.tp}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{m.n_test ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
