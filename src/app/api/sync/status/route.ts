import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET(request: NextRequest) {
  const startedAfter = request.nextUrl.searchParams.get("started_after");
  console.info("[sync-status] received", { started_after: startedAfter });
  if (!startedAfter || startedAfter === "undefined" || startedAfter === "null" || Number.isNaN(Date.parse(startedAfter))) return NextResponse.json({ error: "started_after يجب أن يكون ISO UTC صالحًا." }, { status: 400, headers: { "cache-control": "no-store" } });
  const supabase = await createClient();
  const { data, error, count } = await supabase.from("sync_runs").select("id,status,started_at,finished_at,records_processed,error_summary,cursor_state", { count: "exact" }).eq("source", "meta_api").gte("started_at", startedAfter).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: "تعذر قراءة حالة المزامنة." }, { status: 500 });
  console.info("[sync-status]", { started_after: startedAfter, matched_rows: count ?? 0, status: data?.status ?? "not_found", started_at: data?.started_at ?? null });
  if (!data) return NextResponse.json({ found: false, status: "not_found", sync_run: null }, { headers: { "cache-control": "no-store" } });
  return NextResponse.json({ found: true, status: data.status, sync_run: { ...data, counts: data.cursor_state && typeof data.cursor_state === "object" ? (data.cursor_state as { counts?: unknown }).counts ?? null : null } }, { headers: { "cache-control": "no-store" } });
}
