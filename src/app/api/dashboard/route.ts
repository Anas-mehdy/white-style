import { NextRequest, NextResponse } from "next/server";
import { getDashboardData, InvalidAccountError, AccountNotFoundError } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestedDays = Number(searchParams.get("days") || searchParams.get("range")?.replace("d", ""));
  const days = [7, 14, 30].includes(requestedDays) ? requestedDays : 30;
  
  const adAccountId = searchParams.get("adAccountId");

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
    if (error instanceof InvalidAccountError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AccountNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load dashboard" },
      { status: 500 }
    );
  }
}

