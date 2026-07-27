import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const adAccountId = searchParams.get("adAccountId");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "active"; // "active" | "inactive" | "all"
    const dateRange = searchParams.get("dateRange") || "all"; // "7d" | "30d" | "90d" | "all"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "30", 10)));
    const includeInactive = searchParams.get("includeInactive") === "true";

    if (!adAccountId) {
      return NextResponse.json({ error: "معرف الحساب الإعلاني (adAccountId) مطلوب." }, { status: 400 });
    }

    // First fetch existing exceptions for this ad account to embed into result
    const { data: exceptions } = await supabase
      .from("ad_pause_exceptions")
      .select("id, ad_id, meta_ad_id, exception_mode, custom_cost_per_conversation, is_active")
      .eq("ad_account_id", adAccountId);

    const existingMap = new Map<string, any>();
    if (exceptions) {
      for (const exc of exceptions) {
        if (exc.ad_id) existingMap.set(exc.ad_id, exc);
        if (exc.meta_ad_id) existingMap.set(exc.meta_ad_id, exc);
      }
    }

    // Build query for meta_ads
    let query = supabase
      .from("meta_ads")
      .select(
        `
        id,
        meta_ad_id,
        name,
        effective_status,
        synced_at,
        organization_id,
        ad_account_id,
        raw_payload,
        meta_campaigns (name),
        meta_ad_sets (name)
      `,
        { count: "exact" }
      )
      .eq("ad_account_id", adAccountId);

    // Status filter
    if (status === "active" && !includeInactive) {
      query = query.eq("effective_status", "ACTIVE");
    } else if (status === "inactive") {
      query = query.neq("effective_status", "ACTIVE");
    }
    // If status === "all" or includeInactive is true -> no status filter enforced

    // Search filter (Server-side)
    if (search.trim()) {
      const q = search.trim();
      query = query.or(`name.ilike.%${q}%,meta_ad_id.ilike.%${q}%`);
    }

    // Date range filter
    if (dateRange !== "all") {
      const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("synced_at", sinceDate);
    }

    // Sorting: synced_at DESC
    query = query.order("synced_at", { ascending: false });

    // Pagination bounds
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: ads, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process & transform items
    const formattedAds = (ads || []).map((ad: any) => {
      const raw = ad.raw_payload || {};
      const creative = raw.creative || {};

      const creativeId = creative.id || raw.creative_id || null;
      const thumbnailUrl = creative.thumbnail_url || creative.image_url || raw.image_url || null;

      const pageId =
        creative.page_id ||
        raw.page_id ||
        (raw.effective_object_story_id ? String(raw.effective_object_story_id).split("_")[0] : null);
      const pageName = raw.page_name || creative.page_name || (pageId ? `Page ${pageId}` : null);

      const instagramId = raw.instagram_actor_id || raw.instagram_user_id || creative.instagram_actor_id || null;
      const instagramName = raw.instagram_username || (instagramId ? `@${instagramId}` : null);

      const existingExc = existingMap.get(ad.id) || existingMap.get(ad.meta_ad_id) || null;

      return {
        id: ad.id,
        ad_account_id: ad.ad_account_id,
        meta_ad_id: ad.meta_ad_id,
        name: ad.name || "إعلان غير مسمى",
        effective_status: ad.effective_status || "UNKNOWN",
        creative_id: creativeId,
        synced_at: ad.synced_at || new Date().toISOString(),
        campaign_name: ad.meta_campaigns?.name || null,
        ad_set_name: ad.meta_ad_sets?.name || null,
        page_id: pageId,
        page_name: pageName,
        instagram_id: instagramId,
        instagram_name: instagramName,
        thumbnail_url: thumbnailUrl,
        existing_exception: existingExc
          ? {
              id: existingExc.id,
              exception_mode: existingExc.exception_mode,
              custom_cost_per_conversation: existingExc.custom_cost_per_conversation,
              is_active: existingExc.is_active,
            }
          : null,
      };
    });

    const totalCount = count || 0;
    const hasMore = from + formattedAds.length < totalCount;

    return NextResponse.json({
      ads: formattedAds,
      page,
      limit,
      totalCount,
      hasMore,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
