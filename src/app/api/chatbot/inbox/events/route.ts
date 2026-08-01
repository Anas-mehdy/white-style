import { NextResponse } from "next/server";
import { getConversationEvents } from "@/lib/chatbot-data";
import { requireOrgAuth, AuthError } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    await requireOrgAuth("viewer");

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ success: false, message: "conversationId مطلوب" }, { status: 400 });
    }

    const events = await getConversationEvents(conversationId);
    return NextResponse.json({ success: true, events });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, message: "خطأ في خادم المعالجة" }, { status: 500 });
  }
}
