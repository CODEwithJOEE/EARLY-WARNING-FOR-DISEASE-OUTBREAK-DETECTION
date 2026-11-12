"use server";

import { revalidatePath } from "next/cache";
import { canEdit, getSessionProfile } from "@/lib/auth";

export async function setAlertStatus(formData: FormData) {
  const { supabase, user, role } = await getSessionProfile();
  if (!canEdit(role)) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["acknowledged", "resolved"].includes(status)) return;
  await supabase.from("alerts").update({ status, acknowledged_by: user.id }).eq("id", id);
  revalidatePath("/", "layout");
}
