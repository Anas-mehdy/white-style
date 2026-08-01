import { NextResponse } from "next/server";
import { setOrderStatusAction } from "@/lib/chatbot-actions";
import { requireOperatorAuth, AuthError } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // Step 1: Verify Authentication & Operator Authorization Guard
    await requireOperatorAuth();

    const body = await request.json();
    const { orderId, newStatus, eventKey, idempotencyKey, actualShippingCost, payload } = body;

    const finalEventKey = eventKey || idempotencyKey;

    if (!orderId || !newStatus || !finalEventKey) {
      return NextResponse.json(
        { success: false, message: "بيانات الإدخال غير مكتملة (orderId, newStatus, eventKey مطلوبة)" },
        { status: 400 }
      );
    }

    if (newStatus === "delivered" && (actualShippingCost === undefined || actualShippingCost === null || Number(actualShippingCost) < 0)) {
      return NextResponse.json(
        { success: false, message: "يلزم تحديد تكلفة الشحن الفعلية القابلة للحساب عند تحديد حالة الطلب كمُستلم" },
        { status: 400 }
      );
    }

    const result = await setOrderStatusAction(
      orderId,
      newStatus,
      finalEventKey,
      actualShippingCost !== undefined && actualShippingCost !== null ? Number(actualShippingCost) : undefined,
      payload
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }
    console.error("[/api/chatbot/orders/status] Server Error:", error);
    return NextResponse.json({ success: false, message: "خطأ غير متوقع في خادم المعالجة" }, { status: 500 });
  }
}
