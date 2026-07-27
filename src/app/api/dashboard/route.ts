import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard-data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestedDays = Number(searchParams.get("days") || searchParams.get("range")?.replace("d", ""));
  const days = [7, 14, 30].includes(requestedDays) ? requestedDays : 30;
  
  const adAccountId = searchParams.get("adAccountId");
  
  if (adAccountId !== null && adAccountId !== "") {
    if (!isValidUUID(adAccountId)) {
      return NextResponse.json(
        { error: "معرّف الحساب الإعلاني غير صالح" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: account, error: accountError } = await supabase
      .from("meta_ad_accounts")
      .select("id")
      .eq("id", adAccountId)
      .eq("organization_id", DEFAULT_ORGANIZATION_ID)
      .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "الحساب الإعلاني غير موجود أو لا ينتمي لهذه المؤسسة" },
        { status: 404 }
      );
    }
  }

  const hasRefreshParam = searchParams.get("refresh") === "true";
  const hasNoStoreHeader = request.headers.get("cache-control")?.includes("no-store");
  const bypassCache = hasRefreshParam || hasNoStoreHeader;

  try {
    const dashboard = await getDashboardData(days, bypassCache, adAccountId || null);
    
    const headers: Record<string, string> = {};
    if (bypassCache) {
      headers["cache-control"] = "no-store, no-cache, must-revalidate, proxy-revalidate";
      headers["pragma"] = "no-cache";
      headers["expires"] = "0";
    } else {
      headers["cache-control"] = "no-store"; // fallback default
    }

    return NextResponse.json(dashboard, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load dashboard" },
      { status: 500 }
    );
  }
}

