import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const adAccountId = searchParams.get("ad_account_id");

    let query = supabase
      .from("meta_ads")
      .select("id, meta_ad_id, name, organization_id, ad_account_id, effective_status")
      .order("name", { ascending: true });

    if (adAccountId) {
      query = query.eq("ad_account_id", adAccountId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
