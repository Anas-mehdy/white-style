import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const TIMEOUT_MS = 15000;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      target_ad_account_id,
      source_post_url,
      destination_type,
      requested_daily_budget,
      execution_mode,
      placements,
    } = body;

    // Validate request parameters
    if (!target_ad_account_id || !source_post_url || !destination_type || !placements) {
      return NextResponse.json({ error: "المعلمات المطلوبة غير متوفرة." }, { status: 400 });
    }

    const mockMode = process.env.CAMPAIGN_CENTER_MOCK_MODE === "true";
    const webhookUrl = process.env.N8N_WS02_REQUEST_WEBHOOK_URL;
    const secret = process.env.N8N_CAMPAIGN_WEBHOOK_SECRET;

    // 1. Mock Mode Simulation
    if (mockMode) {
      const requestId = crypto.randomUUID();
      const mockRequest = {
        id: requestId,
        organization_id: "11111111-1111-4111-8111-111111111111",
        target_ad_account_id,
        target_meta_account_id: "demo-meta-account-id",
        source_platform: source_post_url.includes("instagram") ? "instagram" : "facebook",
        source_post_url,
        destination_type,
        execution_mode: execution_mode || "dry_run",
        status: "draft",
        requested_daily_budget: requested_daily_budget || null,
        idempotency_key: crypto.randomUUID(),
        request_payload: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Save mockup directly to supabase
      const supabase = await createClient();
      const { error: insErr } = await supabase.from("campaign_creation_requests").insert(mockRequest);
      if (insErr) {
        console.error("Mock insert error:", insErr);
      }
      return NextResponse.json({
        ...mockRequest,
        id: requestId,
        request_id: requestId,
      });
    }

    // 2. Production webhook call
    if (!webhookUrl || !secret) {
      return NextResponse.json(
        { error: "لم تُضبط إعدادات Intake Webhook (N8N) على الخادم." },
        { status: 503 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": secret,
        },
        body: JSON.stringify({
          target_ad_account_id,
          source_post_url,
          destination_type,
          requested_daily_budget,
          execution_mode: execution_mode || "dry_run",
          placements,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json({ error: "رفض n8n استقبال طلب الحملة." }, { status: 502 });
      }

      let data = await response.json();
      if (Array.isArray(data)) {
        data = data[0] || {};
      }

      const reqId = data.request_id || data.id;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!reqId || !uuidRegex.test(reqId)) {
        return NextResponse.json(
          { error: "لم يتم إرجاع معرف طلب صالح (UUID) من خادم n8n." },
          { status: 502 }
        );
      }

      return NextResponse.json({
        ...data,
        id: reqId,
        request_id: reqId,
      });
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return NextResponse.json(
        { error: isTimeout ? "انتهت مهلة استدعاء Intake Webhook في n8n." : "فشل بدء مسار العمل في n8n." },
        { status: 502 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
