import { NextResponse } from "next/server";

const TIMEOUT_MS = 25000;

export async function POST() {
  try {
    const mockMode = process.env.CAMPAIGN_CENTER_MOCK_MODE === "true";
    const webhookUrl = process.env.N8N_CONTENT_SYNC_WEBHOOK_URL;
    const secret = process.env.N8N_CAMPAIGN_WEBHOOK_SECRET;

    if (mockMode) {
      // Simulate sync delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return NextResponse.json({
        success: true,
        summary: "تمت مزامنة 4 منشورات من Instagram بنجاح (وضع المحاكاة).",
        synced_count: 4,
        timestamp: new Date().toISOString(),
      });
    }

    if (!webhookUrl || !secret) {
      return NextResponse.json(
        { error: "لم تُضبط إعدادات Content Sync Webhook (N8N) على الخادم." },
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
        body: JSON.stringify({ trigger_source: "dashboard" }),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json({ error: "فشلت مزامنة المحتوى في n8n." }, { status: 502 });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return NextResponse.json(
        { error: isTimeout ? "انتهت مهلة استدعاء Content Sync في n8n." : "فشل تشغيل مزامنة n8n." },
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
