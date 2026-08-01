import { NextResponse } from "next/server";
import { getInboxConversations } from "@/lib/chatbot-data";

export async function GET() {
  try {
    const data = await getInboxConversations();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "خطأ غير متوقع في خادم المحادثات";
    return NextResponse.json({ conversations: [], handoffs: {}, error: message }, { status: 500 });
  }
}
