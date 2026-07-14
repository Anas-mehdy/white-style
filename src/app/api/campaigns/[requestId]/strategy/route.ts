import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const TIMEOUT_MS = 20000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const mockMode = process.env.CAMPAIGN_CENTER_MOCK_MODE === "true";
    const webhookUrl = process.env.N8N_WS03_STRATEGY_WEBHOOK_URL;
    const secret = process.env.N8N_CAMPAIGN_WEBHOOK_SECRET;

    // 1. Mock Mode Simulation
    if (mockMode) {
      const supabase = await createClient();
      
      // Update request status to strategy_ready
      const { error: reqErr } = await supabase
        .from("campaign_creation_requests")
        .update({ status: "strategy_ready" })
        .eq("id", requestId);

      if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });

      // Build three mock strategies
      const mockStrategies = [
        {
          request_id: requestId,
          tier: "conservative",
          campaign_name: "White Style - Conservative Campaign - فستان أبيض",
          objective: "OUTCOMES",
          optimization_goal: "MESSAGES",
          billing_event: "IMPRESSIONS",
          bid_strategy: "LOWEST_COST_WITHOUT_CAP",
          destination_type: "whatsapp",
          daily_budget: 10,
          duration_days: 7,
          age_min: 24,
          age_max: 45,
          gender: "female",
          country_codes: ["IL", "PS"],
          placements: ["facebook", "instagram"],
          targeting_mode: "custom",
          interest_hints: ["فساتين", "ملابس نسائية", "تسوق"],
          confidence: 88,
          reasons: ["استهداف دقيق لجمهور مهتم بالفساتين النسائية", "ميزانية منخفضة لتقليل مخاطر الهدر"],
          warnings: ["وصول محدود للمنشور بسبب تضييق الاستهداف"],
          strategy_payload: { cpa_estimate: 1.85, expected_conversations: 5 },
          selected: false,
          status: "draft"
        },
        {
          request_id: requestId,
          tier: "balanced",
          campaign_name: "White Style - Balanced Campaign - فستان أبيض",
          objective: "OUTCOMES",
          optimization_goal: "MESSAGES",
          billing_event: "IMPRESSIONS",
          bid_strategy: "LOWEST_COST_WITHOUT_CAP",
          destination_type: "whatsapp",
          daily_budget: 15,
          duration_days: 10,
          age_min: 22,
          age_max: 50,
          gender: "female",
          country_codes: ["IL", "PS"],
          placements: ["advantage_plus"],
          targeting_mode: "advantage_plus",
          interest_hints: ["موضة نسائية", "فساتين سهرة", "أناقة"],
          confidence: 94,
          reasons: ["استخدام مواضع تلقائية لتوسيع الوصول وتحسين التوزيع", "موازنة التكلفة والوصول اليومي"],
          warnings: ["مواضع فيسبوك قد تقدم كفاءة أعلى نسبياً"],
          strategy_payload: { cpa_estimate: 1.55, expected_conversations: 10 },
          selected: true, // Selected by default in mock
          status: "draft"
        },
        {
          request_id: requestId,
          tier: "aggressive",
          campaign_name: "White Style - Aggressive Campaign - فستان أبيض",
          objective: "OUTCOMES",
          optimization_goal: "MESSAGES",
          billing_event: "IMPRESSIONS",
          bid_strategy: "LOWEST_COST_WITHOUT_CAP",
          destination_type: "whatsapp",
          daily_budget: 25,
          duration_days: 14,
          age_min: 18,
          age_max: 55,
          gender: "all",
          country_codes: ["IL", "PS"],
          placements: ["advantage_plus"],
          targeting_mode: "broad",
          interest_hints: ["تسوق إلكتروني", "علامات تجارية فاخرة"],
          confidence: 91,
          reasons: ["توسيع الفئة العمرية والنوع لزيادة انتشار العلامة التجارية", "ميزانية مرتفعة لاستغلال الفرص بكثافة"],
          warnings: ["ارتفاع CPA في بداية الحملة حتى يستقر التفاعل"],
          strategy_payload: { cpa_estimate: 2.1, expected_conversations: 12 },
          selected: false,
          status: "draft"
        }
      ];

      // Upsert mock strategies
      for (const strat of mockStrategies) {
        await supabase
          .from("campaign_strategies")
          .insert(strat);
      }

      // Fetch the updated request
      const { data: updatedReq } = await supabase
        .from("campaign_creation_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      return NextResponse.json(updatedReq);
    }

    // 2. Production webhook call
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

      if (!response.ok) {
        return NextResponse.json({ error: "فشل استجابة n8n في محاذاة الاستراتيجيات." }, { status: 502 });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return NextResponse.json(
        { error: isTimeout ? "انتهت مهلة استدعاء Strategist Webhook في n8n." : "فشل استدعاء n8n." },
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
