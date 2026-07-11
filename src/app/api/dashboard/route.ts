import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard-data";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET(request: NextRequest) { const requested=Number(request.nextUrl.searchParams.get("days")); const days=[7,14,30].includes(requested)?requested:30; try{const dashboard=await getDashboardData(days);console.info("[dashboard-data]",{...dashboard.debugCounts,errors:dashboard.debugErrors});return NextResponse.json(dashboard,{headers:{"cache-control":"no-store"}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to load dashboard"},{status:500});} }
