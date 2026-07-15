import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!contentId || !uuidRegex.test(contentId)) {
      return NextResponse.json({ error: "معرف المحتوى غير صالح (UUID format required)" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch previously used account for this content from campaign_creation_requests
    let previousAdAccountId: string | null = null;
    let existingRequestId: string | null = null;
    let existingStatus: string | null = null;
    let alreadyPromoted = false;

    const { data: prevReq, error: prevErr } = await supabase
      .from("campaign_creation_requests")
      .select("id, target_ad_account_id, status")
      .eq("request_payload->>content_library_id", contentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevErr) {
      console.error("[PROMOTION_CONTEXT] Error fetching previous request:", prevErr);
    }

    if (prevReq) {
      previousAdAccountId = prevReq.target_ad_account_id;
      existingRequestId = prevReq.id;
      existingStatus = prevReq.status;
      
      const promotedStatuses = ["building", "ready_for_review", "approved", "published"];
      if (promotedStatuses.includes(prevReq.status)) {
        alreadyPromoted = true;
      }
    }

    // 2. Fetch Default Ad Account from settings
    let defaultAdAccountId: string | null = null;
    const { data: settings, error: settingsErr } = await supabase
      .from("organization_settings")
      .select("default_ad_account")
      .eq("organization_id", "11111111-1111-4111-8111-111111111111")
      .maybeSingle();

    if (settingsErr) {
      console.error("[PROMOTION_CONTEXT] Error fetching organization settings:", settingsErr);
    }

    if (settings?.default_ad_account) {
      defaultAdAccountId = settings.default_ad_account;
    }

    // 3. Fetch first connected meta_ad_accounts row
    let firstConnectedAccountId: string | null = null;
    const { data: accounts, error: accountsErr } = await supabase
      .from("meta_ad_accounts")
      .select("id")
      .eq("connection_status", "connected")
      .limit(1);

    if (accountsErr) {
      console.error("[PROMOTION_CONTEXT] Error fetching connected ad accounts:", accountsErr);
    }

    if (accounts && accounts.length > 0) {
      firstConnectedAccountId = accounts[0].id;
    } else {
      // Fallback: fetch any meta_ad_account if none are connected
      const { data: fallbackAccounts } = await supabase
        .from("meta_ad_accounts")
        .select("id")
        .limit(1);
      if (fallbackAccounts && fallbackAccounts.length > 0) {
        firstConnectedAccountId = fallbackAccounts[0].id;
      }
    }

    // Smart account selection strategy priority:
    // 1. Previous ad account
    // 2. Default ad account from settings
    // 3. First connected meta ad account
    const recommendedAdAccountId = previousAdAccountId || defaultAdAccountId || firstConnectedAccountId || "";

    if (!recommendedAdAccountId) {
      return NextResponse.json({
        error: "لم يتم العثور على حساب إعلاني متصل لبدء الحملة. يرجى تهيئة حساب إعلاني في الإعدادات."
      }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      content_id: contentId,
      previous_ad_account_id: previousAdAccountId,
      default_ad_account_id: defaultAdAccountId,
      recommended_ad_account_id: recommendedAdAccountId,
      already_promoted: alreadyPromoted,
      existing_request_id: existingRequestId,
      existing_status: existingStatus
    });

  } catch (err) {
    console.error("[PROMOTION_CONTEXT] Internal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
