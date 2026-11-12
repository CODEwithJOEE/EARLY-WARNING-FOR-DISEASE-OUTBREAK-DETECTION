"use client";

import { useActionState } from "react";
import { Spinner } from "@/components/Skeleton";
import { importCsv, saveCase, type CaseState } from "./actions";
import { MONTHS } from "@/lib/types";

function Message({ state }: { state: CaseState }) {
  if (state.error)
    return (
      <p
        role="alert"
        className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
      >
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p
        role="status"
        className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
      >
        {state.ok}
      </p>
    );
  return null;
}

export default function CaseForms() {
  const [saveState, saveAction, saving] = useActionState<CaseState, FormData>(
    saveCase,
    {},
  );
  const [csvState, csvAction, importing] = useActionState<CaseState, FormData>(
    importCsv,
    {},
  );
  const now = new Date();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form action={saveAction} className="card space-y-3 p-4">
        <h2 className="font-semibold">Enter one month</h2>
        <p className="text-xs text-muted">
          Entering a month that already exists replaces it.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Month</span>
            <select
              name="month"
              defaultValue={now.getMonth() + 1}
              className="field"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Year</span>
            <input
              name="year"
              type="number"
              min={2000}
              max={2100}
              defaultValue={now.getFullYear()}
              required
              className="field"
            />
          </label>
          {(["cough", "fever", "diarrhea"] as const).map((d) => (
            <label key={d} className="text-sm">
              <span className="mb-1 block font-medium capitalize">
                {d} cases
              </span>
              <input
                name={d}
                type="number"
                min={0}
                step={1}
                required
                className="field"
              />
            </label>
          ))}
        </div>
        <Message state={saveState} />
        <button
          className="btn-primary inline-flex items-center gap-2"
          disabled={saving}
        >
          {saving && <Spinner />}
          {saving ? "Saving…" : "Save month"}
        </button>
      </form>

      <form action={csvAction} className="card space-y-3 p-4">
        <h2 className="font-semibold">Import from CSV</h2>
        <p className="text-xs text-muted">
          Columns: <code>year,month,cough,fever,diarrhea</code>, one row per
          month. Existing months are replaced.
        </p>
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="field"
        />
        <Message state={csvState} />
        <button
          className="btn-primary inline-flex items-center gap-2"
          disabled={importing}
        >
          {importing && <Spinner />}
          {importing ? "Importing…" : "Import"}
        </button>
      </form>
    </div>
  );
}
