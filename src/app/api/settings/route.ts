import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_settings")
      .select("*")
      .eq("organization_id", "11111111-1111-4111-8111-111111111111")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no settings exist yet, return clean defaults
    if (!data) {
      return NextResponse.json({
        expert_mode: false,
        default_ad_account: "",
        default_execution_mode: "live",
        language: "ar",
        theme: "dark"
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    const { data: currentSettings } = await supabase
      .from("organization_settings")
      .select("id")
      .eq("organization_id", "11111111-1111-4111-8111-111111111111")
      .maybeSingle();

    let result;
    if (currentSettings) {
      result = await supabase
        .from("organization_settings")
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq("organization_id", "11111111-1111-4111-8111-111111111111")
        .select()
        .single();
    } else {
      result = await supabase
        .from("organization_settings")
        .insert({
          organization_id: "11111111-1111-4111-8111-111111111111",
          expert_mode: body.expert_mode ?? false,
          default_ad_account: body.default_ad_account ?? null,
          default_execution_mode: body.default_execution_mode ?? "live",
          language: body.language ?? "ar",
          theme: body.theme ?? "dark",
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
