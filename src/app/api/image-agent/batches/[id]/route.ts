import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing batch ID" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch batch
    const { data: batch, error: batchErr } = await supabase
      .from("image_agent_batches")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (batchErr || !batch) {
      return NextResponse.json(
        { error: "الدفعة غير موجودة" },
        { status: 404 }
      );
    }

    // Fetch items
    const { data: items, error: itemsErr } = await supabase
      .from("image_agent_items")
      .select("*")
      .eq("batch_id", id)
      .order("created_at", { ascending: true });

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    // Generate signed URLs for private storage files
    const signedItems = await Promise.all(
      (items || []).map(async (item) => {
        let source_url: string | null = null;
        let result_url: string | null = null;

        if (item.source_image_path) {
          const { data: sData } = await supabase.storage
            .from("image-agent")
            .createSignedUrl(item.source_image_path, 3600);
          source_url = sData?.signedUrl || null;
        }

        if (item.result_image_path) {
          const { data: rData } = await supabase.storage
            .from("image-agent")
            .createSignedUrl(item.result_image_path, 3600);
          result_url = rData?.signedUrl || null;
        }

        return {
          ...item,
          source_url,
          result_url,
        };
      })
    );

    return NextResponse.json({
      batch,
      items: signedItems,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
