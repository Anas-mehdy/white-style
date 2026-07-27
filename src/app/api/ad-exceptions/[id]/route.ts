import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();

    // Check existing record
    const { data: existing, error: getErr } = await supabase
      .from("ad_pause_exceptions")
      .select("*, meta_ads(organization_id)")
      .eq("id", id)
      .maybeSingle();

    if (getErr || !existing) {
      return NextResponse.json({ error: "سجل الاستثناء غير موجود." }, { status: 404 });
    }

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: member } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", existing.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (member && !["owner", "admin"].includes(member.role)) {
        return NextResponse.json(
          { error: "غير مصرح لك بتعديل الاستثناء. يجب أن تكون owner أو admin." },
          { status: 403 }
        );
      }
    }

    // Validate mode and limit
    const mode = body.exception_mode || existing.exception_mode;
    let customLimit: number | null = existing.custom_cost_per_conversation;

    if (mode === "never_pause") {
      customLimit = null;
    } else if (mode === "custom_limit") {
      const val = body.custom_cost_per_conversation !== undefined 
        ? body.custom_cost_per_conversation 
        : existing.custom_cost_per_conversation;
      
      const numVal = Number(val);
      if (val === null || val === undefined || isNaN(numVal) || numVal <= 0) {
        return NextResponse.json({ error: "الحد المخصص يجب أن يكون أكبر من صفر." }, { status: 400 });
      }
      customLimit = numVal;
    }

    const updatePayload: Record<string, unknown> = {
      exception_mode: mode,
      custom_cost_per_conversation: customLimit,
      updated_at: new Date().toISOString()
    };

    if (typeof body.reason !== "undefined") updatePayload.reason = body.reason || null;
    if (typeof body.ad_url !== "undefined") updatePayload.ad_url = body.ad_url || null;
    if (typeof body.is_active === "boolean") updatePayload.is_active = body.is_active;

    const { data: updated, error: updateErr } = await supabase
      .from("ad_pause_exceptions")
      .update(updatePayload)
      .eq("id", id)
      .select("*, meta_ad_accounts(id, name, meta_account_id)")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: existing, error: getErr } = await supabase
      .from("ad_pause_exceptions")
      .select("organization_id")
      .eq("id", id)
      .maybeSingle();

    if (getErr || !existing) {
      return NextResponse.json({ error: "سجل الاستثناء غير موجود." }, { status: 404 });
    }

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: member } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", existing.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (member && !["owner", "admin"].includes(member.role)) {
        return NextResponse.json(
          { error: "غير مصرح لك بحذف الاستثناء. يجب أن تكون owner أو admin." },
          { status: 403 }
        );
      }
    }

    const { error: delErr } = await supabase
      .from("ad_pause_exceptions")
      .delete()
      .eq("id", id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
