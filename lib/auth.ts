import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  return {
    supabase,
    user,
    name: (profile?.full_name as string | null) ?? user.email ?? "User",
    role: ((profile?.role as Role | undefined) ?? "viewer") as Role,
  };
}

export const canEdit = (role: Role) => role === "admin" || role === "health_officer";
