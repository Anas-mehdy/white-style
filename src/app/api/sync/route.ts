import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TIMEOUT_MS = 12_000;

export async function POST() {
  const webhookUrl = process.env.N8N_SYNC_WEBHOOK_URL;
  const secret = process.env.N8N_SYNC_WEBHOOK_SECRET;
  if (!webhookUrl || !secret) return NextResponse.json({ error: "لم تُضبط إعدادات مزامنة n8n على الخادم." }, { status: 503 });
  const supabase = await createClient();
  const { data: running, error: runningError } = await supabase
    .from("sync_runs").select("id,status,started_at").eq("status", "running").order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (runningError) return NextResponse.json({ error: "تعذر التحقق من حالة المزامنة." }, { status: 500 });
  if (running) return NextResponse.json({ accepted: false, status: "running", sync_run: running, message: "المزامنة جارية بالفعل." }, { status: 409 });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(webhookUrl, { method: "POST", headers: { "content-type": "application/json", "x-white-style-sync-secret": secret }, body: JSON.stringify({ source: "dashboard" }), signal: controller.signal, cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "رفض n8n طلب المزامنة." }, { status: 502 });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
    return NextResponse.json({ accepted: payload.accepted ?? true, execution_id: payload.execution_id ?? null, status: payload.status ?? "running" }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "انتهت مهلة الاتصال بـn8n." : "تعذر بدء مزامنة n8n.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally { clearTimeout(timeout); }
}
