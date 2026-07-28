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
      return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: item, error: itemErr } = await supabase
      .from("image_agent_items")
      .select("result_image_path, result_mime_type")
      .eq("id", id)
      .maybeSingle();

    if (itemErr || !item || !item.result_image_path) {
      return NextResponse.json(
        { error: "الصورة الناتجة غير متوفرة" },
        { status: 404 }
      );
    }

    const { data, error: signedErr } = await supabase.storage
      .from("image-agent")
      .createSignedUrl(item.result_image_path, 300, { download: true });

    if (signedErr || !data?.signedUrl) {
      return NextResponse.json(
        { error: "تعذر إنتاج رابط التنزيل" },
        { status: 500 }
      );
    }

    return NextResponse.json({ downloadUrl: data.signedUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
