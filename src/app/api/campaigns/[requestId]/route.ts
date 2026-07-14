import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const supabase = await createClient();

    // Query the request joined with account
    const { data: requestData, error: requestError } = await supabase
      .from("campaign_creation_requests")
      .select("*, meta_ad_accounts(name)")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    if (!requestData) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    // Query its strategies
    const { data: strategies, error: strategiesError } = await supabase
      .from("campaign_strategies")
      .select("*")
      .eq("request_id", requestId);

    if (strategiesError) {
      return NextResponse.json({ error: strategiesError.message }, { status: 500 });
    }

    return NextResponse.json({
      request: requestData,
      strategies: strategies || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
