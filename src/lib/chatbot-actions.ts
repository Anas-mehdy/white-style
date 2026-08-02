"use server";

import { requireAdminAuth, requireOperatorAuth, AuthError } from "@/lib/supabase/server";
import {
  ProductFormData,
  VariantFormData,
  MediaFormData,
  FullProductWizardPayload,
  StructuredRpcResult
} from "@/types/chatbot";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  blockedReason?: string;
  code?: string;
  details?: {
    variant_ids?: string[];
    order_ids?: string[];
  };
}

/**
 * 1. Operational Action: Order Status RPC Mutation
 */
export async function setOrderStatusAction(
  orderId: string,
  newStatus: string,
  eventKey: string,
  actualShippingCost?: number,
  payload?: Record<string, unknown>
): Promise<ActionResult> {
  try {
    const { adminClient } = await requireOperatorAuth();
    const clientWithRpc = adminClient as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
    };
    
    const { data, error } = await clientWithRpc.rpc("ws_chatbot_set_order_status", {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_event_key: eventKey,
      p_actual_shipping_cost: actualShippingCost !== undefined ? actualShippingCost : null,
      p_payload: payload ?? {}
    });

    if (error) {
      console.error("[setOrderStatusAction] RPC error:", error);
      return { success: false, message: error.message };
    }

    return { success: true, message: "تم تحديث حالة الطلب بنجاح", data };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `خطأ في خادم المعالجة: ${errorMsg}` };
  }
}

/**
 * 2. Operational Actions: Atomic Handoff Actions
 */
export async function takeoverConversationAction(
  conversationId: string,
  eventKey?: string,
  reason?: string,
  summary?: string
): Promise<ActionResult> {
  try {
    const { adminClient, organizationId, user } = await requireOperatorAuth();
    const clientWithRpc = adminClient as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
    };

    const finalEventKey = eventKey || `takeover-${conversationId}-${Date.now()}`;
    const { data, error } = await clientWithRpc.rpc("ws_chatbot_takeover_conversation", {
      p_organization_id: organizationId,
      p_conversation_id: conversationId,
      p_actor_user_id: user.id,
      p_event_key: finalEventKey,
      p_reason: reason || null,
      p_summary: summary || null
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: "تم استلام المحادثة وتحويلها للموظف بنجاح", data };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg };
  }
}

export async function releaseConversationAction(
  conversationId: string,
  eventKey?: string,
  summary?: string
): Promise<ActionResult> {
  try {
    const { adminClient, organizationId, user } = await requireOperatorAuth();
    const clientWithRpc = adminClient as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
    };

    const finalEventKey = eventKey || `release-${conversationId}-${Date.now()}`;
    const { data, error } = await clientWithRpc.rpc("ws_chatbot_release_conversation", {
      p_organization_id: organizationId,
      p_conversation_id: conversationId,
      p_actor_user_id: user.id,
      p_event_key: finalEventKey,
      p_summary: summary || null
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: "تم إعادة المحادثة للبوت الآلي بنجاح", data };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg };
  }
}

export async function closeConversationAction(
  conversationId: string,
  eventKey?: string,
  reason?: string
): Promise<ActionResult> {
  try {
    const { adminClient, organizationId, user } = await requireOperatorAuth();
    const clientWithRpc = adminClient as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
    };

    const finalEventKey = eventKey || `close-${conversationId}-${Date.now()}`;
    const { data, error } = await clientWithRpc.rpc("ws_chatbot_close_conversation", {
      p_organization_id: organizationId,
      p_conversation_id: conversationId,
      p_actor_user_id: user.id,
      p_event_key: finalEventKey,
      p_reason: reason || null
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: "تم إغلاق المحادثة بنجاح", data };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg };
  }
}

/**
 * 3. Media Upload & Signed URL Server Actions
 */
export async function uploadProductMediaAction(
  productId: string,
  formData: FormData
): Promise<ActionResult<{ storage_path: string; signed_url?: string }>> {
  try {
    const { adminClient, organizationId } = await requireAdminAuth();
    
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, message: "ملف الوسائط غير موجود" };
    }

    // Validate MIME types
    const allowedImages = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const allowedVideos = ["video/mp4", "video/webm", "video/quicktime"];
    const isImage = allowedImages.includes(file.type);
    const isVideo = allowedVideos.includes(file.type);

    if (!isImage && !isVideo) {
      return { success: false, message: "نوع الملف غير مدعوم. يرجى اختيار صورة (JPG, PNG, WEBP) أو فيديو (MP4)" };
    }

    // Validate Max Sizes (10MB for images, 50MB for video)
    const maxSizeBytes = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        success: false,
        message: isImage ? "حجم الصورة يتجاوز الحد المسموح (10 ميجابايت)" : "حجم الفيديو يتجاوز الحد المسموح (50 ميجابايت)"
      };
    }

    // Generate filename server-side
    const fileId = crypto.randomUUID();
    const rawExt = file.name.split(".").pop() || (isImage ? "png" : "mp4");
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "");
    const fileName = `${fileId}.${ext}`;
    const storagePath = `${organizationId}/${productId}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from("ws-chatbot-products")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error("[uploadProductMediaAction] Storage error:", uploadError);
      return { success: false, message: `تعذر رفع الملف إلى التخزين: ${uploadError.message}` };
    }

    // Generate short-lived signed URL for display/preview (3600 seconds = 1 hour)
    const { data: signedData } = await adminClient.storage
      .from("ws-chatbot-products")
      .createSignedUrl(storagePath, 3600);

    return {
      success: true,
      message: "تم رفع الوسيط بنجاح",
      data: {
        storage_path: storagePath,
        signed_url: signedData?.signedUrl
      }
    };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg };
  }
}

export async function getSignedMediaUrlAction(storagePath: string): Promise<ActionResult<{ signed_url: string }>> {
  try {
    const { adminClient } = await requireAdminAuth();
    const { data, error } = await adminClient.storage
      .from("ws-chatbot-products")
      .createSignedUrl(storagePath, 3600);

    if (error || !data?.signedUrl) {
      return { success: false, message: "تعذر إنشاء رابط العرض للوسيط" };
    }

    return { success: true, data: { signed_url: data.signedUrl } };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "خطأ في إنشاء رابط العرض" };
  }
}

/**
 * 4. Active Orders Check Action (UI Feedback)
 */
export async function checkVariantActiveOrdersAction(
  variantId: string
): Promise<ActionResult<{ count: number; orderIds: string[] }>> {
  try {
    const { adminClient, organizationId } = await requireAdminAuth();
    
    const { data, error } = await adminClient
      .from("ws_chatbot_order_items")
      .select("order_id, ws_chatbot_orders!inner(id, status)")
      .eq("organization_id", organizationId)
      .eq("variant_id", variantId)
      .in("ws_chatbot_orders.status", ["draft", "collecting", "awaiting_confirmation", "confirmed", "shipped"]);

    if (error) {
      return { success: false, message: error.message };
    }

    const orderIds = Array.from(new Set((data || []).map((row: any) => row.order_id)));
    return {
      success: true,
      data: {
        count: orderIds.length,
        orderIds
      }
    };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "تعذر التحقق من الطلبات النشطة" };
  }
}

/**
 * 5. Transactional Product Bundle Save Server Action
 */
export async function saveProductBundleAction(
  payload: FullProductWizardPayload,
  idempotencyKey?: string,
  newlyUploadedStoragePaths?: string[]
): Promise<ActionResult<StructuredRpcResult>> {
  try {
    const { adminClient, organizationId, user } = await requireAdminAuth();

    const fullRpcPayload = {
      ...payload,
      organization_id: organizationId,
      actor_user_id: user.id,
      product_id: payload.product.id || null,
      idempotency_key: idempotencyKey || null
    };

    const clientWithRpc = adminClient as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: StructuredRpcResult | null; error: { code?: string; message: string } | null }>;
    };

    const { data, error } = await clientWithRpc.rpc("ws_chatbot_save_product_bundle", {
      p_payload: fullRpcPayload
    });

    if (error) {
      console.error("[saveProductBundleAction] Database RPC error:", error);
      // Clean up newly uploaded files on RPC error
      if (newlyUploadedStoragePaths && newlyUploadedStoragePaths.length > 0) {
        await adminClient.storage.from("ws-chatbot-products").remove(newlyUploadedStoragePaths).catch(() => {});
      }
      return {
        success: false,
        message: `خطأ في حفظ بيانات المنتج: ${error.message}`
      };
    }

    if (!data || data.success === false) {
      // Clean up newly uploaded files on validation failure
      if (newlyUploadedStoragePaths && newlyUploadedStoragePaths.length > 0) {
        await adminClient.storage.from("ws-chatbot-products").remove(newlyUploadedStoragePaths).catch(() => {});
      }

      const code = data?.code;
      const message = data?.message || "تعذر حفظ المنتج";

      return {
        success: false,
        code,
        message,
        details: data?.details
      };
    }

    return {
      success: true,
      message: "تم حفظ بيانات المنتج والأنواع والوسائط بنجاح",
      data
    };
  } catch (err: unknown) {
    // Clean up newly uploaded files on exception
    if (newlyUploadedStoragePaths && newlyUploadedStoragePaths.length > 0) {
      try {
        const { adminClient } = await requireAdminAuth();
        await adminClient.storage.from("ws-chatbot-products").remove(newlyUploadedStoragePaths).catch(() => {});
      } catch {}
    }

    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `خطأ أثناء المعالجة: ${errorMsg}` };
  }
}

/**
 * Backwards compatibility CRUD actions
 */
export async function saveProductAction(formData: ProductFormData, id?: string): Promise<ActionResult> {
  const payload: FullProductWizardPayload = {
    product: {
      id,
      sku: formData.sku,
      name_ar: formData.name_ar,
      name_he: formData.name_he,
      name_en: formData.name_en,
      description_ar: formData.description_ar,
      description_he: formData.description_he,
      description_en: formData.description_en,
      category: formData.category,
      material: formData.material as unknown as Record<string, unknown>,
      source_system: formData.source_system,
      source_id: formData.source_id,
      active: formData.active
    },
    variants: [],
    media: [],
    aliases: []
  };

  return saveProductBundleAction(payload);
}

export async function saveVariantAction(productId: string, formData: VariantFormData, id?: string): Promise<ActionResult> {
  const payload: FullProductWizardPayload = {
    product: { id, name_ar: "محدث" },
    variants: [{ ...formData, id }],
    media: [],
    aliases: []
  };
  return saveProductBundleAction(payload);
}

export async function saveMediaAction(productId: string, formData: MediaFormData): Promise<ActionResult> {
  const payload: FullProductWizardPayload = {
    product: { id: productId, name_ar: "محدث" },
    variants: [],
    media: [formData],
    aliases: []
  };
  return saveProductBundleAction(payload);
}

export async function saveDiscountRuleAction(ruleName: string, type: string, val: number, minQty: number, prodId?: string): Promise<ActionResult> {
  try {
    const { adminClient, organizationId } = await requireAdminAuth();

    const { error } = await adminClient
      .from("ws_chatbot_discount_rules")
      .insert({
        organization_id: organizationId,
        name: ruleName,
        discount_type: type,
        discount_value: val,
        min_quantity: minQty,
        product_id: prodId || null,
        requires_customer_request: true,
        active: true
      });

    if (error) return { success: false, message: error.message };
    return { success: true, message: "تم إضافة قاعدة الخصم بنجاح" };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg };
  }
}

export async function saveAdProductMappingAction(adId: string, productId: string, priority = 1): Promise<ActionResult> {
  try {
    const { adminClient, organizationId } = await requireAdminAuth();

    const { error } = await adminClient
      .from("ws_chatbot_ad_product_mappings")
      .insert({
        organization_id: organizationId,
        ad_id: adId,
        product_id: productId,
        priority: priority,
        active: true,
        mapping_source: "dashboard_manual"
      });

    if (error) return { success: false, message: error.message };
    return { success: true, message: "تم ربط الإعلان بالمنتج بنجاح" };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg };
  }
}
