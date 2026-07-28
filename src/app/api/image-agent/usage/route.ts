import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Query usage strictly from image_agent_usage table
    const { data, error } = await supabase
      .from("image_agent_usage")
      .select("*");

    if (error) {
      // If table empty or query fails, return standard error
      console.error("Error fetching image_agent_usage:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let usedCount = 0;
    if (data && Array.isArray(data)) {
      usedCount = data.reduce((sum, row) => {
        const val = row.amount ?? row.used_count ?? row.count ?? row.generations_used ?? 1;
        return sum + (typeof val === "number" ? val : 1);
      }, 0);
    }

    const totalLimit = 20;
    const remainingCount = Math.max(0, totalLimit - usedCount);

    return NextResponse.json({
      totalLimit,
      usedCount,
      remainingCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
