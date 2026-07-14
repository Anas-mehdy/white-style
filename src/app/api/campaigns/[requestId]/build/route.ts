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

    // 3. Production Webhook Call with Retry Scheduler (5s, 10s, 20s)
    if (!webhookUrl || !secret) {
      return NextResponse.json(
        { error: "لم تُضبط إعدادات Campaign Builder Webhook على الخادم." },
        { status: 503 }
      );
    }

    const retrySchedule = [5000, 10000, 20000];
    let attempt = 0;
    let lastError = "";

    const checkIfTransientMetaError = (data: any) => {
      if (!data) return false;
      const errorMsg = String(data.error_message || data.error || data.message || "").toLowerCase();
      const errorCode = String(data.error_code || data.code || "").toLowerCase();
      
      const isTransient = 
        errorMsg.includes("timeout") ||
        errorMsg.includes("temporary") ||
        errorMsg.includes("rate limit") ||
        errorMsg.includes("try again") ||
        errorMsg.includes("server error") ||
        errorMsg.includes("meta api error 500") ||
        errorMsg.includes("transient") ||
        errorCode.includes("1") || 
        errorCode.includes("2") || 
        errorCode.includes("17") || 
        errorCode.includes("4");

      const isBlocked = 
        errorMsg.includes("auth") ||
        errorMsg.includes("permission") ||
        errorMsg.includes("token") ||
        errorMsg.includes("oauth") ||
        errorMsg.includes("validation") ||
        errorMsg.includes("invalid") ||
        errorMsg.includes("required") ||
        errorMsg.includes("403") ||
        errorMsg.includes("401");

      return isTransient && !isBlocked;
    };

    while (true) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        console.log(`[Campaign Builder Webhook] Attempt ${attempt + 1} for request ${requestId}`);
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

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          const isTransient = checkIfTransientMetaError(data);

          if (isTransient && attempt < retrySchedule.length) {
            const delay = retrySchedule[attempt];
            console.warn(`[Campaign Builder Webhook] Transient error response detected in body: ${JSON.stringify(data)}. Retrying attempt ${attempt + 1} in ${delay}ms...`);
            attempt++;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          return NextResponse.json({
            ok: true,
            accepted: true,
            request_id: requestId,
            status: "building",
            n8n_response: data
          }, { status: 202 });
        }

        const is5xx = response.status >= 500;
        if (is5xx && attempt < retrySchedule.length) {
          const delay = retrySchedule[attempt];
          console.warn(`[Campaign Builder Webhook] Transient HTTP status ${response.status} detected. Retrying attempt ${attempt + 1} in ${delay}ms...`);
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        const errJson = await response.json().catch(() => ({}));
        return NextResponse.json(
          { error: errJson.error || `HTTP error ${response.status} from builder workflow.` },
          { status: response.status }
        );

      } catch (err) {
        clearTimeout(timeout);
        const isTimeout = err instanceof Error && err.name === "AbortError";
        lastError = isTimeout ? "AbortError (Timeout)" : (err instanceof Error ? err.message : String(err));

        if (attempt < retrySchedule.length) {
          const delay = retrySchedule[attempt];
          console.warn(`[Campaign Builder Webhook] Network exception/timeout (${lastError}). Retrying attempt ${attempt + 1} in ${delay}ms...`);
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return NextResponse.json(
          { error: isTimeout ? "انتهت مهلة استدعاء Builder Webhook في n8n (Fast ACK)." : `فشل استدعاء n8n: ${lastError}` },
          { status: 503 }
        );
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
