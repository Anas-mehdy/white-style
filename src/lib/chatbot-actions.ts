"use server";

import { requireAdminAuth, requireOperatorAuth, AuthError } from "@/lib/supabase/server";
import { ProductFormData, VariantFormData, MediaFormData } from "@/types/chatbot";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  blockedReason?: string;
}

/**
 * 1. Operational Action: Order Status RPC Mutation
 * Allowed for: owner, admin, operator (via requireOperatorAuth)
 */
export async function setOrderStatusAction(
  orderId: string,
  newStatus: string,
  idempotencyKey: string,
  actualShippingCost?: number
): Promise<ActionResult> {
  try {
    const { adminClient } = await requireOperatorAuth();
    
    // Call existing PostgreSQL RPC via admin client
    const { data, error } = await adminClient.rpc("ws_chatbot_set_order_status", {
      p_order_id: orderId,
      p_status: newStatus,
      p_idempotency_key: idempotencyKey,
      p_actual_shipping_cost: actualShippingCost
    });

    if (error) {
      console.error("[setOrderStatusAction] RPC error:", error);
      return { success: false, message: `تعذر تحديث حالة الطلب: ${error.message}` };
    }

    return { success: true, message: "تم تحديث حالة الطلب بنجاح", data };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `خطأ في خادم التنفيذ: ${errorMsg}` };
  }
}

/**
 * 2. Operational Actions: Atomic Handoff Actions
 * Allowed for: owner, admin, operator (via requireOperatorAuth)
 */
export async function takeoverConversationAction(conversationId: string): Promise<ActionResult> {
  try {
    const { adminClient, organizationId } = await requireOperatorAuth();
    const clientWithRpc = adminClient as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
    };
    const { data, error } = await clientWithRpc.rpc("ws_chatbot_takeover_conversation", {
      p_conversation_id: conversationId,
      p_organization_id: organizationId
    });

    if (error) {
      if (error.code === "42883" || error.message.includes("function") || error.message.includes("does not exist")) {
        return {
          success: false,
          blockedReason: "إجراء قيد الانتظار: الدالة الذرية ws_chatbot_takeover_conversation غير متوفرة في قاعدة البيانات حالياً."
        };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: "تم استلام المحادثة وتحويلها للموظف بنجاح", data };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    return {
      success: false,
      blockedReason: "إجراء قيد الانتظار: يتطلب هذا الإجراء تطبيق الهجرة الذرية لقاعدة البيانات."
    };
  }
}

export async function releaseConversationAction(conversationId: string): Promise<ActionResult> {
  try {
    const { adminClient, organizationId } = await requireOperatorAuth();
    const clientWithRpc = adminClient as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
    };
    const { data, error } = await clientWithRpc.rpc("ws_chatbot_release_conversation", {
      p_conversation_id: conversationId,
      p_organization_id: organizationId
    });

    if (error) {
      if (error.code === "42883" || error.message.includes("function") || error.message.includes("does not exist")) {
        return {
          success: false,
          blockedReason: "إجراء قيد الانتظار: الدالة الذرية ws_chatbot_release_conversation غير متوفرة في قاعدة البيانات حالياً."
        };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: "تم إعادة المحادثة للبوت الآلي بنجاح", data };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    return {
      success: false,
      blockedReason: "إجراء قيد الانتظار: يتطلب هذا الإجراء تطبيق الهجرة الذرية لقاعدة البيانات."
    };
  }
}

export async function closeConversationAction(conversationId: string): Promise<ActionResult> {
  try {
    const { adminClient, organizationId } = await requireOperatorAuth();
    const clientWithRpc = adminClient as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
    };
    const { data, error } = await clientWithRpc.rpc("ws_chatbot_close_conversation", {
      p_conversation_id: conversationId,
      p_organization_id: organizationId
    });

    if (error) {
      if (error.code === "42883" || error.message.includes("function") || error.message.includes("does not exist")) {
        return {
          success: false,
          blockedReason: "إجراء قيد الانتظار: الدالة الذرية ws_chatbot_close_conversation غير متوفرة في قاعدة البيانات حالياً."
        };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: "تم إغلاق المحادثة بنجاح", data };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    return {
      success: false,
      blockedReason: "إجراء قيد الانتظار: يتطلب هذا الإجراء تطبيق الهجرة الذرية لقاعدة البيانات."
    };
  }
}

/**
 * 3. Admin-Only Action: Product CRUD (Requires role 'owner' or 'admin')
 * Any organization_id provided in input is ignored; uses verified organizationId from membership.
 */
export async function saveProductAction(formData: ProductFormData, id?: string): Promise<ActionResult> {
  try {
    const { adminClient, organizationId } = await requireAdminAuth();

    if (id) {
      const { error } = await adminClient
        .from("ws_chatbot_products")
        .update({
          sku: formData.sku || null,
          name_ar: formData.name_ar || null,
          name_he: formData.name_he || null,
          name_en: formData.name_en || null,
          description_ar: formData.description_ar || null,
          description_he: formData.description_he || null,
          description_en: formData.description_en || null,
          category: formData.category || null,
          material: formData.material || null,
          source_system: formData.source_system || null,
          source_id: formData.source_id || null,
          active: formData.active,
          updated_at: new Date().toISOString()
        })
        .eq("organization_id", organizationId)
        .eq("id", id);
      if (error) return { success: false, message: error.message };
      return { success: true, message: "تم تحديث بيانات المنتج بنجاح" };
    } else {
      const { data, error } = await adminClient
        .from("ws_chatbot_products")
        .insert({
          organization_id: organizationId,
          sku: formData.sku || null,
          name_ar: formData.name_ar || null,
          name_he: formData.name_he || null,
          name_en: formData.name_en || null,
          description_ar: formData.description_ar || null,
          description_he: formData.description_he || null,
          description_en: formData.description_en || null,
          category: formData.category || null,
          material: formData.material || null,
          source_system: formData.source_system || null,
          source_id: formData.source_id || null,
          active: formData.active
        })
        .select("id")
        .single();
      if (error) return { success: false, message: error.message };
      return { success: true, message: "تم إنشاء المنتج بنجاح", data };
    }
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg };
  }
}

/**
 * 4. Admin-Only Action: Variant CRUD (Requires role 'owner' or 'admin')
 */
export async function saveVariantAction(productId: string, formData: VariantFormData, id?: string): Promise<ActionResult> {
  try {
    const { adminClient, organizationId } = await requireAdminAuth();

    if (id) {
      const { error } = await adminClient
        .from("ws_chatbot_product_variants")
        .update({
          sku: formData.sku || null,
          color_code: formData.color_code || null,
          color_ar: formData.color_ar || null,
          color_he: formData.color_he || null,
          color_en: formData.color_en || null,
          price: formData.price,
          compare_at_price: formData.compare_at_price,
          unit_cost: formData.unit_cost,
          stock_quantity: formData.stock_quantity,
          active: formData.active,
          updated_at: new Date().toISOString()
        })
        .eq("organization_id", organizationId)
        .eq("id", id);
      if (error) return { success: false, message: error.message };
      return { success: true, message: "تم تحديث نوع المنتج بنجاح" };
    } else {
      const { error } = await adminClient
        .from("ws_chatbot_product_variants")
        .insert({
          organization_id: organizationId,
          product_id: productId,
          sku: formData.sku || null,
          color_code: formData.color_code || null,
          color_ar: formData.color_ar || null,
          color_he: formData.color_he || null,
          color_en: formData.color_en || null,
          price: formData.price,
          compare_at_price: formData.compare_at_price,
          unit_cost: formData.unit_cost,
          stock_quantity: formData.stock_quantity,
          active: formData.active
        });
      if (error) return { success: false, message: error.message };
      return { success: true, message: "تم إضافة نوع جديد للمنتج بنجاح" };
    }
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg };
  }
}

/**
 * 5. Admin-Only Action: Media CRUD (Requires role 'owner' or 'admin')
 */
export async function saveMediaAction(productId: string, formData: MediaFormData): Promise<ActionResult> {
  try {
    const { adminClient, organizationId } = await requireAdminAuth();

    const { error } = await adminClient
      .from("ws_chatbot_product_media")
      .insert({
        organization_id: organizationId,
        product_id: productId,
        variant_id: formData.variant_id || null,
        media_url: formData.media_url,
        storage_path: formData.storage_path || null,
        media_type: formData.media_type,
        option_number: formData.option_number,
        sort_order: formData.sort_order,
        alt_ar: formData.alt_ar || null,
        alt_he: formData.alt_he || null,
        alt_en: formData.alt_en || null
      });

    if (error) return { success: false, message: error.message };
    return { success: true, message: "تم إضافة الوسيط بنجاح" };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg };
  }
}

/**
 * 6. Admin-Only Action: Discount Rules CRUD (Requires role 'owner' or 'admin')
 */
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

/**
 * 7. Admin-Only Action: Ad Product Mapping (Requires role 'owner' or 'admin')
 */
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
