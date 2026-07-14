import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const TIMEOUT_MS = 15000; // 15 seconds fast ack timeout

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const body = await request.json().catch(() => ({}));
    const { tier } = body;

    if (!tier || !["conservative", "balanced", "aggressive"].includes(tier)) {
      return NextResponse.json({ error: "الرجاء اختيار خيار استراتيجية صالح (tier)." }, { status: 400 });
    }

    const mockMode = process.env.CAMPAIGN_CENTER_MOCK_MODE === "true";
    const webhookUrl = process.env.N8N_WS04_BUILDER_WEBHOOK_URL;
    const secret = process.env.N8N_CAMPAIGN_WEBHOOK_SECRET;

    const supabase = await createClient();

    // 1. Fetch current status for duplicate protection check
    const { data: currentReq, error: fetchErr } = await supabase
      .from("campaign_creation_requests")
      .select("status, request_payload")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!currentReq) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const duplicateStatuses = ["building", "ready_for_review", "approved", "published"];
    if (duplicateStatuses.includes(currentReq.status)) {
      return NextResponse.json({
        ok: true,
        accepted: true,
        request_id: requestId,
        status: currentReq.status,
        message: "حملة هذا الطلب قيد البناء أو مبنية بالفعل."
      }, { status: 202 });
    }

    // 2. Mock Mode Simulation
    if (mockMode) {
      const updatedPayload = {
        ...(currentReq.request_payload || {}),
        mock_build_started_at: new Date().toISOString(),
        mock_build_tier: tier
      };

      const { data: updatedReq, error: updateErr } = await supabase
        .from("campaign_creation_requests")
        .update({
          status: "building",
          request_payload: updatedPayload
        })
        .eq("id", requestId)
        .select()
        .single();

      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

      return NextResponse.json({
        ok: true,
        accepted: true,
        request_id: requestId,
        status: "building"
      }, { status: 202 });
    }

    // 3. Production Webhook Call (Fast Acknowledgment)
    if (!webhookUrl || !secret) {
      return NextResponse.json(
        { error: "لم تُضبط إعدادات Campaign Builder Webhook على الخادم." },
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
          request_id: requestId,
          tier,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json({ error: "فشل استجابة n8n في محرك بناء الحملة." }, { status: 502 });
      }

      const data = await response.json();
      return NextResponse.json({
        ok: true,
        accepted: true,
        request_id: requestId,
        status: "building",
        n8n_response: data
      }, { status: 202 });

    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return NextResponse.json(
        { error: isTimeout ? "انتهت مهلة استدعاء Builder Webhook في n8n (Fast ACK)." : "فشل استدعاء n8n." },
        { status: 503 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
