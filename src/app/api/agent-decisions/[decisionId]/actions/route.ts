import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ decisionId: string }> }
) {
  try {
    const { decisionId } = await params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(decisionId)) {
      return Response.json({ error: "Invalid UUID format" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify authorization: check if the decision is visible to the current user
    const { data: decision, error: decisionError } = await supabase
      .from("agent_decisions_final_status")
      .select("id")
      .eq("id", decisionId)
      .maybeSingle();

    if (decisionError) {
      return Response.json(
        { error: "Failed to authorize decision access" },
        { status: 500 }
      );
    }

    if (!decision) {
      return Response.json(
        { error: "Decision not found" },
        { status: 404 }
      );
    }

    // Authorization succeeded, fetch historical actions ordered deterministically
    const { data: actions, error: actionsError } = await supabase
      .from("agent_actions")
      .select("*")
      .eq("decision_id", decisionId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (actionsError) {
      return Response.json({ error: actionsError.message }, { status: 500 });
    }

    return Response.json(actions || []);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
