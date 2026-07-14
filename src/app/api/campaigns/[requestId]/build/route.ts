import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const TIMEOUT_MS = 25000;

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

    // 1. Mock Mode Simulation
    if (mockMode) {
      const supabase = await createClient();

      // Update campaign request status to ready_for_review
      const { data: updatedReq, error: reqErr } = await supabase
        .from("campaign_creation_requests")
        .update({ status: "ready_for_review" })
        .eq("id", requestId)
        .select()
        .single();

      if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });

      // Update strategies table to set build IDs
      const { error: stratErr } = await supabase
        .from("campaign_strategies")
        .update({
          status: "built_paused",
          meta_campaign_id: "act_demo_camp_123456",
          meta_adset_id: "act_demo_adset_123456",
          meta_creative_id: "act_demo_creative_123456",
          meta_ad_id: "act_demo_ad_123456",
        })
        .eq("request_id", requestId)
        .eq("tier", tier);

      if (stratErr) {
        console.error("Mock strategy update error:", stratErr);
      }

      return NextResponse.json(updatedReq);
    }

    // 2. Production webhook call
    if (!webhookUrl || !secret) {
      return NextResponse.json(
        { error: "لم تُضبط إعدادات Campaign Builder Webhook على الخادم." },
        { status: 503 }
      );
    }

    // DIRECT POST requests do not retry automatically.
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
      return NextResponse.json(data);
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return NextResponse.json(
        { error: isTimeout ? "انتهت مهلة استدعاء Builder Webhook في n8n." : "فشل استدعاء n8n." },
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
