"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile, canEdit } from "@/lib/auth";

export type CaseState = { ok?: string; error?: string };

type Parsed = { year: number; month: number; cough: number; fever: number; diarrhea: number };

function parseRow(raw: Record<string, unknown>): Parsed | string {
  const n = (k: string) => Number(String(raw[k] ?? "").trim());
  const row = { year: n("year"), month: n("month"), cough: n("cough"), fever: n("fever"), diarrhea: n("diarrhea") };
  for (const [k, v] of Object.entries(row)) {
    if (!Number.isInteger(v)) return `"${k}" must be a whole number.`;
  }
  if (row.year < 2000 || row.year > 2100) return "Year must be between 2000 and 2100.";
  if (row.month < 1 || row.month > 12) return "Month must be between 1 and 12.";
  if (row.cough < 0 || row.fever < 0 || row.diarrhea < 0) return "Case counts cannot be negative.";
  return row;
}

export async function saveCase(_prev: CaseState, formData: FormData): Promise<CaseState> {
  const { supabase, user, role } = await getSessionProfile();
  if (!canEdit(role)) return { error: "Your role cannot enter data." };

  const row = parseRow(Object.fromEntries(formData));
  if (typeof row === "string") return { error: row };

  const { error } = await supabase
    .from("monthly_cases")
    .upsert({ ...row, entered_by: user.id }, { onConflict: "year,month" });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: `Saved ${row.month}/${row.year}. Run the prediction pipeline to refresh the forecast.` };
}

export async function importCsv(_prev: CaseState, formData: FormData): Promise<CaseState> {
  const { supabase, user, role } = await getSessionProfile();
  if (!canEdit(role)) return { error: "Your role cannot enter data." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
  if (file.size > 200_000) return { error: "File is too large for a monthly-case import." };

  const lines = (await file.text()).replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const header = lines.shift()?.split(",").map((h) => h.trim().toLowerCase()) ?? [];
  for (const col of ["year", "month", "cough", "fever", "diarrhea"]) {
    if (!header.includes(col)) return { error: `Missing column "${col}". Expected: year,month,cough,fever,diarrhea.` };
  }

  const rows: (Parsed & { entered_by: string })[] = [];
  for (const [i, line] of lines.entries()) {
    const cells = line.split(",");
    const parsed = parseRow(Object.fromEntries(header.map((h, j) => [h, cells[j]])));
    if (typeof parsed === "string") return { error: `Line ${i + 2}: ${parsed}` };
    rows.push({ ...parsed, entered_by: user.id });
  }
  if (!rows.length) return { error: "The file has no data rows." };

  const { error } = await supabase.from("monthly_cases").upsert(rows, { onConflict: "year,month" });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: `Imported ${rows.length} months.` };
}
