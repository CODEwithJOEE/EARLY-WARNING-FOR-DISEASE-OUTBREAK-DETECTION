import { NextResponse } from "next/server";
import { latestRun } from "@/lib/github";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Latest pipeline run status. Any signed-in user may read it.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await latestRun());
}
