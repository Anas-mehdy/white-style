import { NextResponse } from "next/server";
import {
  takeoverConversationAction,
  releaseConversationAction,
  closeConversationAction
} from "@/lib/chatbot-actions";
import { requireOperatorAuth, AuthError } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // Step 1: Verify authentication & operator authorization guard FIRST
    const { user, organizationId } = await requireOperatorAuth();

    // Step 2: Parse request body
    const body = await request.json();
    const { action, conversationId, reason, summary, eventKey } = body;

    // Security check: Ignore any browser-supplied organizationId, actorUserId, or role in body
    if (!conversationId || !action) {
      return NextResponse.json(
        { success: false, message: "معرّف المحادثة ونوع الإجراء مطلوبان" },
        { status: 400 }
      );
    }

    const finalEventKey = eventKey || `handoff-${action}-${conversationId}-${Date.now()}`;

    let result;
    if (action === "takeover") {
      result = await takeoverConversationAction(conversationId, finalEventKey, reason, summary);
    } else if (action === "release") {
      result = await releaseConversationAction(conversationId, finalEventKey, summary);
    } else if (action === "close") {
      result = await closeConversationAction(conversationId, finalEventKey, reason);
    } else {
      return NextResponse.json({ success: false, message: "نوع الإجراء غير معروف" }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({ ...result, organizationId, actorUserId: user.id });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }
    console.error("[/api/chatbot/inbox/handoff] Server Error:", error);
    return NextResponse.json({ success: false, message: "خطأ غير متوقع في خادم المعالجة" }, { status: 500 });
  }
}
