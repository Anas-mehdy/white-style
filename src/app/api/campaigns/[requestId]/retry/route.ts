import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!requestId || !uuidRegex.test(requestId)) {
      return NextResponse.json({ error: "معرف الطلب غير صالح" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch current request
    const { data: req, error: fetchErr } = await supabase
      .from("campaign_creation_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!req) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

    // Validate status
    const allowedRetryStatuses = ["failed", "resolution_failed", "draft"];
    if (!allowedRetryStatuses.includes(req.status)) {
      return NextResponse.json({ error: "لا يمكن إعادة تشغيل هذا الطلب لأنه ليس في حالة فشل أو مسودة." }, { status: 400 });
    }

    // 2. Controlled reset:
    // A. Delete old campaign strategies
    const { error: deleteStratsErr } = await supabase
      .from("campaign_strategies")
      .delete()
      .eq("request_id", requestId);

    if (deleteStratsErr) {
      console.error("Error deleting old strategies:", deleteStratsErr);
    }

    // B. Clear request payload AI result fields
    const oldPayload = req.request_payload || {};
    const cleanPayload = {
      resolver_status: oldPayload.resolver_status,
      resolver_method: oldPayload.resolver_method,
      content_library_id: oldPayload.content_library_id,
      source_post_id: oldPayload.source_post_id,
      instagram_media_id: oldPayload.instagram_media_id,
      page_id: oldPayload.page_id,
      content_context: oldPayload.content_context,
    };

    // C. Append retry event to timeline
    const oldTimeline = req.execution_timeline || [];
    const attemptNumber = (oldTimeline.filter((e: any) => e.event === "Request Retry Started").length) + 2;
    
    const newTimeline = [
      ...oldTimeline,
      {
        event: "Request Retry Started",
        attempt: attemptNumber,
        timestamp: new Date().toISOString()
      }
    ];

    // D. Assign a new unique idempotency key
    const newAttemptId = crypto.randomUUID();
    const newIdempotencyKey = `campaign:11111111-1111-4111-8111-111111111111:${cleanPayload.content_library_id || "url"}:${newAttemptId}`;

    // E. Perform request record updates: status = 'draft', clear error_code, error_message, selected_strategy
    const { data: updatedReq, error: updateErr } = await supabase
      .from("campaign_creation_requests")
      .update({
        status: "draft",
        selected_strategy: null,
        error_code: null,
        error_message: null,
        idempotency_key: newIdempotencyKey,
        request_payload: cleanPayload,
        execution_timeline: newTimeline
      } as any)
      .eq("id", requestId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      request_id: requestId,
      status: "draft",
      message: "تمت إعادة تهيئة الطلب بنجاح."
    });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
