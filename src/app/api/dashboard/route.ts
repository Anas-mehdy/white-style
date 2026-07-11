import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard-data";
export async function GET(request: NextRequest) { const requested=Number(request.nextUrl.searchParams.get("days")); const days=[7,14,30].includes(requested)?requested:30; try{return NextResponse.json(await getDashboardData(days));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to load dashboard"},{status:500});} }
