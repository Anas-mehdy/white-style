import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sync_runs").select("id,status,started_at,finished_at,records_processed,error_summary,cursor_state").order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: "تعذر قراءة حالة المزامنة." }, { status: 500 });
  return NextResponse.json({ sync_run: data ? { ...data, counts: data.cursor_state && typeof data.cursor_state === "object" ? (data.cursor_state as { counts?: unknown }).counts ?? null : null } : null });
}
