import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_SUBMISSION_FILES = 5;
const TOTAL_TRIAL_LIMIT = 20;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: batches, error } = await supabase
      .from("image_agent_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ batches: batches || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.IMAGE_AGENT_INTERNAL_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Configuration Error: IMAGE_AGENT_INTERNAL_SECRET is not configured on the server." },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // Check remaining balance from image_agent_usage
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

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "لم يتم اختيار أي صور" },
        { status: 400 }
      );
    }

    if (files.length > MAX_SUBMISSION_FILES) {
      return NextResponse.json(
        { error: `عدد الصور المحددة يتجاوز الحد الأقصى (${MAX_SUBMISSION_FILES} صور)` },
        { status: 400 }
      );
    }

    if (files.length > remainingCount) {
      return NextResponse.json(
        { error: "عدد الصور المحددة أكبر من الرصيد المتبقي" },
        { status: 400 }
      );
    }

    // Validate files
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
        return NextResponse.json(
          { error: `نوع الملف غير مدعوم (${file.name})` },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `حجم الصورة يجب ألا يتجاوز 10 ميغابايت (${file.name})` },
          { status: 400 }
        );
      }
    }

    const batchId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // Insert batch row
    const { error: batchErr } = await supabase
      .from("image_agent_batches")
      .insert({
        id: batchId,
        created_by: "11111111-1111-4111-8111-111111111111",
        status: "queued",
        total_items: files.length,
        completed_items: 0,
        failed_items: 0,
        created_at: nowIso,
      });

    if (batchErr) {
      console.error("Failed to create batch:", batchErr);
      return NextResponse.json({ error: batchErr.message }, { status: 500 });
    }

    // Process each file
    const itemsToInsert = [];
    const usageToInsert = [];

    for (const file of files) {
      const itemId = crypto.randomUUID();
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const storagePath = `products/${batchId}/${itemId}/source.${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());

      // Upload source image to storage bucket 'image-agent'
      const { error: uploadErr } = await supabase.storage
        .from("image-agent")
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadErr) {
        console.error(`Failed to upload image ${file.name}:`, uploadErr);
        // Rollback batch status to failed if upload fails completely
        await supabase
          .from("image_agent_batches")
          .update({ status: "failed" })
          .eq("id", batchId);
        return NextResponse.json(
          { error: `فشل رفع الصورة: ${file.name}` },
          { status: 500 }
        );
      }

      itemsToInsert.push({
        id: itemId,
        batch_id: batchId,
        source_image_path: storagePath,
        status: "queued",
        attempt_count: 0,
        created_at: nowIso,
      });

      usageToInsert.push({
        batch_id: batchId,
        item_id: itemId,
        created_at: nowIso,
      });
    }

    const { error: itemsErr } = await supabase
      .from("image_agent_items")
      .insert(itemsToInsert);

    if (itemsErr) {
      console.error("Failed to insert items:", itemsErr);
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    // Record trial consumption in image_agent_usage
    // Try RPC image_agent_consume_trial_generation first, fallback to table insert if RPC not matching signature
    try {
      await supabase.rpc("image_agent_consume_trial_generation", {
        p_batch_id: batchId,
        p_count: files.length,
      });
    } catch {
      await supabase.from("image_agent_usage").insert(usageToInsert);
    }

    // Call n8n webhook securely
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
        body: JSON.stringify({ batchId }),
      });

      if (!webhookRes.ok) {
        console.error(`n8n webhook error status: ${webhookRes.status}`);
        // Per Rule 7: Keep batch and items queued, return clear error message
        return NextResponse.json(
          {
            success: true,
            batchId,
            warning: "تعذر بدء عملية إنشاء الصور، يرجى المحاولة مرة أخرى",
          },
          { status: 202 }
        );
      }
    } catch (whErr) {
      console.error("n8n webhook call failed:", whErr);
      // Per Rule 7: Keep batch and items queued, return clear error message
      return NextResponse.json(
        {
          success: true,
          batchId,
          warning: "تعذر بدء عملية إنشاء الصور، يرجى المحاولة مرة أخرى",
        },
        { status: 202 }
      );
    }

    return NextResponse.json({
      success: true,
      batchId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
