import { NextResponse } from "next/server";
import { getConversationMessages } from "@/lib/chatbot-data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ messages: [] });
    }

    const messages = await getConversationMessages(conversationId);
    return NextResponse.json({ messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "خطأ في خادم الرسائل";
    return NextResponse.json({ messages: [], error: message }, { status: 500 });
  }
}
