import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const requested = Number(request.nextUrl.searchParams.get("days"));
  const days = [7, 14, 30].includes(requested) ? requested : 30;
  
  const hasRefreshParam = request.nextUrl.searchParams.get("refresh") === "true";
  const hasNoStoreHeader = request.headers.get("cache-control")?.includes("no-store");
  const bypassCache = hasRefreshParam || hasNoStoreHeader;

  try {
    const dashboard = await getDashboardData(days, bypassCache);
    
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
