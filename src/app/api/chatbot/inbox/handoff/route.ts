import { NextResponse } from "next/server";
import {
  takeoverConversationAction,
  releaseConversationAction,
  closeConversationAction
} from "@/lib/chatbot-actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, conversationId } = body;

    if (!conversationId || !action) {
      return NextResponse.json(
        { success: false, message: "معرّف المحادثة ونوع الإجراء مطلوبان" },
        { status: 400 }
      );
    }

    let result;
    if (action === "takeover") {
      result = await takeoverConversationAction(conversationId);
    } else if (action === "release") {
      result = await releaseConversationAction(conversationId);
    } else if (action === "close") {
      result = await closeConversationAction(conversationId);
    } else {
      return NextResponse.json({ success: false, message: "نوع الإجراء غير معروف" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "خطأ غير متوقع في خادم المعالجة";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
