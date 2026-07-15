import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const TIMEOUT_MS = 15000; // 15 seconds timeout for receiving fast n8n acknowledgment

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const mockMode = process.env.CAMPAIGN_CENTER_MOCK_MODE === "true";
    const webhookUrl = process.env.N8N_WS03_STRATEGY_WEBHOOK_URL;
    const secret = process.env.N8N_CAMPAIGN_WEBHOOK_SECRET;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!requestId || !uuidRegex.test(requestId)) {
      return NextResponse.json({ error: "معرف الطلب غير صالح (UUID format required)" }, { status: 400 });
    }

    console.log("[WS03_TRIGGER_START]", { requestId });
    console.log("[WS03_WEBHOOK_URL_PRESENT]", Boolean(webhookUrl));

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

    const duplicateStatuses = ["analyzing", "strategy_ready", "strategy_review_required", "building", "ready_for_review"];
    if (duplicateStatuses.includes(currentReq.status)) {
      // Return existing status without triggering second WS-03 execution
      return NextResponse.json({
        ok: true,
        accepted: true,
        request_id: requestId,
        status: currentReq.status,
        message: "تم تشغيل هذا الطلب مسبقاً."
      }, { status: 202 });
    }

    // 2. Mock Mode Simulation (No detached background promises)
    if (mockMode) {
      const updatedPayload = {
        ...(currentReq.request_payload || {}),
        mock_strategy_started_at: new Date().toISOString()
      };

      const { data: updatedReq, error: updateErr } = await supabase
        .from("campaign_creation_requests")
        .update({
          status: "analyzing",
          request_payload: updatedPayload
        })
        .eq("id", requestId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        accepted: true,
        request_id: requestId,
        status: "analyzing"
      }, { status: 202 });
    }

    // 3. Production Webhook Call (Fast Acknowledgment)
    if (!webhookUrl || !secret) {
      return NextResponse.json(
        { error: "لم تُضبط إعدادات Strategist Webhook على الخادم." },
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
        body: JSON.stringify({ request_id: requestId }),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      const responseBody = await response.text();
      console.log("[WS03_RESPONSE]", response.status, responseBody);

      // Return 502/503 only if n8n did not accept execution
      if (!response.ok) {
        return NextResponse.json({ error: `فشل استجابة n8n في محاذاة الاستراتيجيات. الحالة: ${response.status}` }, { status: 502 });
      }

      let data = {};
      try {
        data = JSON.parse(responseBody);
      } catch (e) {
        // Response body not JSON
      }
      
      // Pass the 202 response to the frontend directly
      return NextResponse.json({
        ok: true,
        accepted: true,
        request_id: requestId,
        status: "analyzing",
        n8n_response: data
      }, { status: 202 });

    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return NextResponse.json(
        { error: isTimeout ? "انتهت مهلة استدعاء Strategist Webhook في n8n (Fast ACK)." : "فشل تشغيل n8n." },
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
