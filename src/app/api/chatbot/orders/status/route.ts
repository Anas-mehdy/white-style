import { NextResponse } from "next/server";
import { setOrderStatusAction } from "@/lib/chatbot-actions";
import { requireAdminAuth, AuthError } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // Step 1 & 2: Verify Authentication & Authorization Guard
    await requireAdminAuth();

    const body = await request.json();
    const { orderId, newStatus, idempotencyKey, actualShippingCost } = body;

    if (!orderId || !newStatus || !idempotencyKey) {
      return NextResponse.json(
        { success: false, message: "بيانات الإدخال غير مكتملة (orderId, newStatus, idempotencyKey مطلوبة)" },
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
      idempotencyKey,
      actualShippingCost !== undefined ? Number(actualShippingCost) : undefined
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : "خطأ غير متوقع في خادم المعالجة";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
