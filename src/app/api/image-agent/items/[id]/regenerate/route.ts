import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TOTAL_TRIAL_LIMIT = 20;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const secret = process.env.IMAGE_AGENT_INTERNAL_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Configuration Error: IMAGE_AGENT_INTERNAL_SECRET is not configured on the server." },
        { status: 500 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
    }

    const supabase = await createClient();

    // Check remaining balance
    const { data: usageData } = await supabase
      .from("image_agent_usage")
      .select("*");

    let usedCount = 0;
    if (usageData && Array.isArray(usageData)) {
      usedCount = usageData.reduce((sum, row) => {
        const val = row.amount ?? row.used_count ?? row.count ?? row.generations_used ?? 1;
        return sum + (typeof val === "number" ? val : 1);
      }, 0);
    }

    const remainingCount = Math.max(0, TOTAL_TRIAL_LIMIT - usedCount);
    if (remainingCount <= 0) {
      return NextResponse.json(
        { error: "انتهى الرصيد التجريبي" },
        { status: 400 }
      );
    }

    // Fetch original item to reuse source_image_path
    const { data: originalItem, error: itemErr } = await supabase
      .from("image_agent_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (itemErr || !originalItem) {
      return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });
    }

    const newBatchId = crypto.randomUUID();
    const newItemId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // Create a NEW batch containing exactly 1 item
    const { error: batchErr } = await supabase
      .from("image_agent_batches")
      .insert({
        id: newBatchId,
        created_by: "system",
        status: "queued",
        total_items: 1,
        completed_items: 0,
        failed_items: 0,
        created_at: nowIso,
      });

    if (batchErr) {
      return NextResponse.json({ error: batchErr.message }, { status: 500 });
    }

    // Insert NEW item with attempt_count = 0
    const { error: newInsertErr } = await supabase
      .from("image_agent_items")
      .insert({
        id: newItemId,
        batch_id: newBatchId,
        source_image_path: originalItem.source_image_path,
        status: "queued",
        attempt_count: 0,
        created_at: nowIso,
      });

    if (newInsertErr) {
      return NextResponse.json({ error: newInsertErr.message }, { status: 500 });
    }

    // Consume trial generation in image_agent_usage
    try {
      await supabase.rpc("image_agent_consume_trial_generation", {
        p_batch_id: newBatchId,
        p_count: 1,
      });
    } catch {
      await supabase.from("image_agent_usage").insert({
        batch_id: newBatchId,
        item_id: newItemId,
        created_at: nowIso,
      });
    }

    // Trigger n8n Start Batch webhook using new batch ID
    const webhookUrl =
      process.env.N8N_START_BATCH_WEBHOOK_URL ||
      "https://n8n.picelmedia.online/webhook/white-style/image-agent/start-no-env";

    try {
      const webhookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-image-agent-secret": secret,
        },
        body: JSON.stringify({ batchId: newBatchId }),
      });

      if (!webhookRes.ok) {
        return NextResponse.json(
          {
            success: true,
            newBatchId,
            newItemId,
            warning: "تعذر بدء عملية إعادة التوليد، يرجى المحاولة مرة أخرى",
          },
          { status: 202 }
        );
      }
    } catch (whErr) {
      console.error("n8n regenerate webhook call failed:", whErr);
      return NextResponse.json(
        {
          success: true,
          newBatchId,
          newItemId,
          warning: "تعذر بدء عملية إعادة التوليد، يرجى المحاولة مرة أخرى",
        },
        { status: 202 }
      );
    }

    return NextResponse.json({
      success: true,
      newBatchId,
      newItemId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
