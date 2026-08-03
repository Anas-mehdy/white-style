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

    // Download the binary file directly from Supabase Storage
    const { data: fileBlob, error: downloadErr } = await supabase.storage
      .from("image-agent")
      .download(item.result_image_path);

    if (downloadErr || !fileBlob) {
      return NextResponse.json(
        { error: "تعذر تحميل ملف الصورة" },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const contentType = item.result_mime_type || fileBlob.type || "image/png";
    const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
    const fileName = `generated-image-${id.slice(0, 8)}.${ext}`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
