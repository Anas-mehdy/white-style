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

    // Required fields check
    if (!body.ad_account_id) {
      return NextResponse.json({ error: "يجب تحديد الحساب الإعلاني." }, { status: 400 });
    }
    if (!body.ad_id) {
      return NextResponse.json({ error: "يجب تحديد الإعلان." }, { status: 400 });
    }
    if (!body.exception_mode || !["never_pause", "custom_limit"].includes(body.exception_mode)) {
      return NextResponse.json({ error: "يجب تحديد نوع الاستثناء." }, { status: 400 });
    }

    // Validate exception mode limit value
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

    // Server-side verification against meta_ads table
    const { data: adRecord, error: adErr } = await supabase
      .from("meta_ads")
      .select("id, meta_ad_id, name, organization_id, ad_account_id")
      .eq("id", body.ad_id)
      .maybeSingle();

    if (adErr || !adRecord) {
      return NextResponse.json({ error: "الإعلان المحدد غير موجود في النظام." }, { status: 400 });
    }

    if (adRecord.ad_account_id !== body.ad_account_id) {
      return NextResponse.json({ error: "الإعلان المحدد لا يتبع للحساب الإعلاني المختار." }, { status: 400 });
    }

    if (body.meta_ad_id && adRecord.meta_ad_id !== body.meta_ad_id) {
      return NextResponse.json({ error: "بيانات الإعلان غير متطابقة مع سجلات النظام." }, { status: 400 });
    }

    const organizationId = adRecord.organization_id;

    // Check user authentication & role permissions (owner / admin)
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
          { error: "غير مصرح لك بإضافة استثناء. يجب أن تكون owner أو admin في المؤسسة." },
          { status: 403 }
        );
      }
    }

    // Duplicate exception check for the same ad
    const { data: existingExc } = await supabase
      .from("ad_pause_exceptions")
      .select("id")
      .eq("ad_id", body.ad_id)
      .maybeSingle();

    if (existingExc) {
      return NextResponse.json(
        { error: "يوجد استثناء مسجل لهذا الإعلان بالفعل. يمكنك تعديله بدلًا من إنشاء استثناء جديد." },
        { status: 400 }
      );
    }

    // Insert payload precisely according to spec
    const insertPayload = {
      organization_id: organizationId,
      ad_account_id: body.ad_account_id,
      ad_id: adRecord.id,
      meta_ad_id: adRecord.meta_ad_id,
      ad_name: body.ad_name || adRecord.name || null,
      ad_url: body.ad_url || null,
      exception_mode: body.exception_mode,
      custom_cost_per_conversation: customLimit,
      reason: body.reason || null,
      is_active: typeof body.is_active === "boolean" ? body.is_active : true,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("ad_pause_exceptions")
      .insert(insertPayload)
      .select("*, meta_ad_accounts(id, name, meta_account_id)")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
