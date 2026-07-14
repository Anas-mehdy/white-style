import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const TIMEOUT_MS = 15000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const mockMode = process.env.CAMPAIGN_CENTER_MOCK_MODE === "true";
    const webhookUrl = process.env.N8N_WS02_RESOLVER_WEBHOOK_URL;
    const secret = process.env.N8N_CAMPAIGN_WEBHOOK_SECRET;

    // 1. Mock Mode Simulation
    if (mockMode) {
      const supabase = await createClient();
      
      // Update request to have resolved post details
      const payload = {
        content_analysis: {
          platform: "Facebook",
          media_type: "Image",
          content_summary: "فستان نسائي أبيض راقي مصمم للمناسبات الفخمة والأعياد، بخامات إيطالية عالية الجودة وتصميم عصري متكامل.",
          detected_goal: "Sales (مبيعات)",
          detected_language: "Arabic (العربية)",
          confidence: 94,
        }
      };

      const { data, error } = await supabase
        .from("campaign_creation_requests")
        .update({
          request_payload: payload,
          status: "strategy_ready" // directly jump to strategy stage
        })
        .eq("id", requestId)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    // 2. Production webhook call
    if (!webhookUrl || !secret) {
      return NextResponse.json(
        { error: "لم تُضبط إعدادات Resolver Webhook على الخادم." },
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
        return NextResponse.json({ error: "فشل استجابة n8n في محدد المنشور." }, { status: 502 });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return NextResponse.json(
        { error: isTimeout ? "انتهت مهلة استدعاء Resolver Webhook في n8n." : "فشل استدعاء n8n." },
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
