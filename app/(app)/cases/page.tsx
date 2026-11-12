import CaseForms from "./CaseForms";
import { canEdit, getSessionProfile } from "@/lib/auth";
import { monthLabel, type CaseRow } from "@/lib/types";

export default async function CasesPage() {
  const { supabase, role } = await getSessionProfile();
  const { data } = await supabase.from("monthly_cases").select("*").order("year", { ascending: false }).order("month", { ascending: false });
  const rows = (data ?? []) as CaseRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Monthly cases</h1>
        <p className="text-sm text-muted">Total cases for the whole municipality. No patient names or identifiers are stored.</p>
      </div>

      {canEdit(role) ? (
        <CaseForms />
      ) : (
        <p className="card p-4 text-sm text-muted">Your role can view data but not enter it.</p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Monthly case counts</caption>
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2">Month</th>
              <th className="px-4 py-2 text-right">Cough</th>
              <th className="px-4 py-2 text-right">Fever</th>
              <th className="px-4 py-2 text-right">Diarrhea</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2">{monthLabel(r.year, r.month)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.cough}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.fever}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.diarrhea}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  No months entered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
