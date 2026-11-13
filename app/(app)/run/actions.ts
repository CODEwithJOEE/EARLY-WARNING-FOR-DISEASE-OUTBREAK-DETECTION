"use server";

import { getSessionProfile } from "@/lib/auth";
import { dispatchPipeline } from "@/lib/github";

export type RunResult = { ok: true; serverTime: number } | { ok: false; error: string };

// Admin only. Checked here on the server, not just by hiding the button.
export async function runPipeline(): Promise<RunResult> {
  const { role } = await getSessionProfile();
  if (role !== "admin") return { ok: false, error: "Only an admin can run the prediction." };
  const res = await dispatchPipeline();
  return res.ok ? { ok: true, serverTime: Date.now() } : res;
}
