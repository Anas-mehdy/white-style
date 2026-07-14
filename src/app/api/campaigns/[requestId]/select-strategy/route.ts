import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    const supabase = await createClient();

    // 1. Unselect all strategies for this request
    const { error: unselectErr } = await supabase
      .from("campaign_strategies")
      .update({ selected: false })
      .eq("request_id", requestId);

    if (unselectErr) {
      return NextResponse.json({ error: unselectErr.message }, { status: 500 });
    }

    // 2. Select the chosen strategy tier
    const { data, error: selectErr } = await supabase
      .from("campaign_strategies")
      .update({ selected: true })
      .eq("request_id", requestId)
      .eq("tier", tier)
      .select()
      .single();

    if (selectErr) {
      return NextResponse.json({ error: selectErr.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
