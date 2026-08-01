import { NextResponse } from "next/server";
import { setOrderStatusAction } from "@/lib/chatbot-actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, newStatus, idempotencyKey, actualShippingCost } = body;

    if (!orderId || !newStatus || !idempotencyKey) {
      return NextResponse.json(
        { success: false, message: "بيانات الإدخال غير مكتملة (orderId, newStatus, idempotencyKey مطلوبة)" },
        { status: 400 }
      );
    }

    if (newStatus === "delivered" && (actualShippingCost === undefined || actualShippingCost === null)) {
      return NextResponse.json(
        { success: false, message: "يلزم تحديد تكلفة الشحن الفعلية عند تحديد حالة الطلب كمُستلم" },
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
    const message = error instanceof Error ? error.message : "خطأ غير متوقع في خادم المعالجة";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
