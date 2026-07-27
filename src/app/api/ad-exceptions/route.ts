import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const adId = searchParams.get("ad_id");
    const adAccountId = searchParams.get("ad_account_id");

    let query = supabase
      .from("ad_pause_exceptions")
      .select("*, meta_ad_accounts(id, name, meta_account_id)")
      .order("created_at", { ascending: false });

    if (adId) {
      query = query.eq("ad_id", adId);
    }
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    // Required basic checks
    if (!body.ad_account_id) {
      return NextResponse.json({ error: "يجب تحديد الحساب الإعلاني." }, { status: 400 });
    }
    if (!body.exception_mode || !["never_pause", "custom_limit"].includes(body.exception_mode)) {
      return NextResponse.json({ error: "يجب تحديد نوع الاستثناء." }, { status: 400 });
    }

    // Determine target ads (bulk vs single)
    const selectedAdsRaw: Array<{ ad_id: string; meta_ad_id?: string; ad_name?: string; ad_url?: string }> = 
      Array.isArray(body.selectedAds) && body.selectedAds.length > 0
        ? body.selectedAds
        : body.ad_id
        ? [{ ad_id: body.ad_id, meta_ad_id: body.meta_ad_id, ad_name: body.ad_name, ad_url: body.ad_url }]
        : [];

    if (selectedAdsRaw.length === 0) {
      return NextResponse.json({ error: "يجب تحديد إعلان واحد على الأقل." }, { status: 400 });
    }

    // Validate limit
    let customLimit: number | null = null;
    if (body.exception_mode === "never_pause") {
      customLimit = null;
    } else if (body.exception_mode === "custom_limit") {
      const numVal = Number(body.custom_cost_per_conversation);
      if (isNaN(numVal) || numVal <= 0) {
        return NextResponse.json({ error: "الحد المخصص يجب أن يكون أكبر من صفر." }, { status: 400 });
      }
      customLimit = numVal;
    }

    const duplicateAction: "skip" | "update" = body.duplicateAction === "update" ? "update" : "skip";

    // Extract all target ad_ids
    const targetAdIds = selectedAdsRaw.map((a) => a.ad_id).filter(Boolean);

    // Fetch meta_ads records
    const { data: dbMetaAds, error: metaAdsErr } = await supabase
      .from("meta_ads")
      .select("id, meta_ad_id, name, organization_id, ad_account_id")
      .in("id", targetAdIds);

    if (metaAdsErr || !dbMetaAds || dbMetaAds.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على الإعلانات المحددة في قاعدة البيانات." }, { status: 400 });
    }

    const metaAdsMap = new Map<string, typeof dbMetaAds[0]>();
    for (const ma of dbMetaAds) {
      metaAdsMap.set(ma.id, ma);
    }

    // Verify organization permissions
    const organizationId = dbMetaAds[0].organization_id;
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    if (user) {
      const { data: member } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (member && !["owner", "admin"].includes(member.role)) {
        return NextResponse.json(
          { error: "غير مصرح لك بإضافة استثناءات. يجب أن تكون owner أو admin في المؤسسة." },
          { status: 403 }
        );
      }
    }

    // Fetch existing exceptions for these ads
    const { data: existingExceptions } = await supabase
      .from("ad_pause_exceptions")
      .select("id, ad_id")
      .in("ad_id", targetAdIds);

    const existingMap = new Map<string, string>();
    if (existingExceptions) {
      for (const exc of existingExceptions) {
        existingMap.set(exc.ad_id, exc.id);
      }
    }

    // Single item special error for duplicates when not in bulk mode and skip chosen
    if (selectedAdsRaw.length === 1 && existingMap.has(selectedAdsRaw[0].ad_id) && !body.selectedAds) {
      if (duplicateAction === "skip") {
        return NextResponse.json(
          { error: "يوجد استثناء مسجل لهذا الإعلان بالفعل. يمكنك تعديله بدلًا من إنشاء استثناء جديد." },
          { status: 400 }
        );
      }
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const inserts: any[] = [];
    const updates: Array<{ id: string; payload: any }> = [];

    const now = new Date().toISOString();

    for (const item of selectedAdsRaw) {
      const adRecord = metaAdsMap.get(item.ad_id);
      if (!adRecord) continue;

      const existingId = existingMap.get(item.ad_id);

      const commonFields = {
        organization_id: adRecord.organization_id,
        ad_account_id: body.ad_account_id,
        ad_id: adRecord.id,
        meta_ad_id: adRecord.meta_ad_id,
        ad_name: item.ad_name || adRecord.name || null,
        ad_url: item.ad_url || null,
        exception_mode: body.exception_mode,
        custom_cost_per_conversation: customLimit,
        reason: body.reason || null,
        is_active: typeof body.is_active === "boolean" ? body.is_active : true,
        updated_at: now,
      };

      if (existingId) {
        if (duplicateAction === "skip") {
          skippedCount++;
        } else {
          updates.push({
            id: existingId,
            payload: commonFields,
          });
        }
      } else {
        inserts.push({
          ...commonFields,
          created_by: userId,
          created_at: now,
        });
      }
    }

    // Perform inserts
    if (inserts.length > 0) {
      const { error: insertErr } = await supabase.from("ad_pause_exceptions").insert(inserts);
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      createdCount = inserts.length;
    }

    // Perform updates
    if (updates.length > 0) {
      for (const up of updates) {
        await supabase.from("ad_pause_exceptions").update(up.payload).eq("id", up.id);
      }
      updatedCount = updates.length;
    }

    return NextResponse.json(
      {
        success: true,
        createdCount,
        updatedCount,
        skippedCount,
        totalProcessed: createdCount + updatedCount + skippedCount,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
