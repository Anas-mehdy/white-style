"use client";

import React, { useState, useEffect } from "react";
import {
  ChatbotProduct,
  ChatbotProductVariant,
  ChatbotProductMedia,
  ChatbotProductAlias,
  FullProductWizardPayload,
  VariantFormData,
  MediaFormData,
  AliasFormData,
  MaterialFormData,
  StructuredRpcResult
} from "@/types/chatbot";
import {
  saveProductBundleAction,
  uploadProductMediaAction,
  checkVariantActiveOrdersAction
} from "@/lib/chatbot-actions";
import {
  X,
  Plus,
  Trash2,
  Copy,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Sparkles,
  Tag,
  ShieldAlert,
  Loader2,
  Eye,
  Info
} from "lucide-react";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "FREE"];

const PRESET_COLORS = [
  { code: "#000000", ar: "أسود", he: "שחור", en: "Black" },
  { code: "#ffffff", ar: "أبيض", he: "לבן", en: "White" },
  { code: "#1e3a8a", ar: "كحلي", he: "כחול כהה", en: "Navy" },
  { code: "#ef4444", ar: "أحمر", he: "אדום", en: "Red" },
  { code: "#10b981", ar: "أخضر", he: "ירוק", en: "Green" },
  { code: "#f59e0b", ar: "بيج / خردلي", he: "בז'", en: "Beige" },
  { code: "#6b7280", ar: "رمادي", he: "אפור", en: "Grey" },
  { code: "#8b5cf6", ar: "بنفسجي", he: "סגול", en: "Purple" }
];

export function ProductWizardModal({
  initialProduct,
  initialVariants = [],
  initialMedia = [],
  initialAliases = [],
  isOpen,
  onClose,
  onSaved
}: {
  initialProduct?: ChatbotProduct | null;
  initialVariants?: ChatbotProductVariant[];
  initialMedia?: ChatbotProductMedia[];
  initialAliases?: ChatbotProductAlias[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate / reserve product UUID server-side before upload
  const [productId] = useState<string>(() => initialProduct?.id || crypto.randomUUID());

  // Step 1: Basic Info & Material
  const [sku, setSku] = useState(initialProduct?.sku || "");
  const [nameAr, setNameAr] = useState(initialProduct?.name_ar || "");
  const [nameHe, setNameHe] = useState(initialProduct?.name_he || "");
  const [nameEn, setNameEn] = useState(initialProduct?.name_en || "");
  const [descAr, setDescAr] = useState(initialProduct?.description_ar || "");
  const [descHe, setDescHe] = useState(initialProduct?.description_he || "");
  const [descEn, setDescEn] = useState(initialProduct?.description_en || "");
  const [category, setCategory] = useState(initialProduct?.category || "");
  const [sourceId, setSourceId] = useState(initialProduct?.source_id || "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Parse initial material safely
  const initialMatObj = typeof initialProduct?.material === "object" && initialProduct?.material !== null
    ? (initialProduct.material as Record<string, string>)
    : {};

  const [material, setMaterial] = useState<MaterialFormData>({
    fabric_ar: initialMatObj.fabric_ar || "",
    fabric_he: initialMatObj.fabric_he || "",
    fabric_en: initialMatObj.fabric_en || "",
    composition: initialMatObj.composition || "",
    fit: initialMatObj.fit || "",
    season: initialMatObj.season || "",
    care_notes: initialMatObj.care_notes || ""
  });

  // Step 2: Variants & Fast Batch Generator
  const [variants, setVariants] = useState<VariantFormData[]>(() => {
    if (initialVariants.length > 0) {
      return initialVariants.map((v) => ({
        id: v.id,
        client_key: `v_${v.id}`,
        sku: v.sku || "",
        color_code: v.color_code || "#000000",
        color_ar: v.color_ar || "",
        color_he: v.color_he || "",
        color_en: v.color_en || "",
        size_code: v.size_code || v.size || "",
        price: Number(v.price ?? 0),
        compare_at_price: v.compare_at_price !== null && v.compare_at_price !== undefined ? Number(v.compare_at_price) : null,
        unit_cost: Number(v.unit_cost ?? 0),
        stock_quantity: v.stock_quantity !== null && v.stock_quantity !== undefined ? Number(v.stock_quantity) : null,
        availability: (v.availability as any) || "in_stock",
        active: v.active ?? true,
        attributes: (v.attributes as Record<string, unknown>) || {}
      }));
    }
    return [];
  });

  const [deactivateVariantIds, setDeactivateVariantIds] = useState<string[]>([]);
  const [ackDeactivations, setAckDeactivations] = useState<string[]>([]);

  // Fast Batch Generator Controls
  const [batchColor, setBatchColor] = useState(PRESET_COLORS[0]);
  const [batchSizes, setBatchSizes] = useState<string[]>(["S", "M", "L", "XL"]);
  const [batchPrice, setBatchPrice] = useState<number>(150);
  const [batchComparePrice, setBatchComparePrice] = useState<number | "">("");
  const [batchCost, setBatchCost] = useState<number>(50);
  const [batchStock, setBatchStock] = useState<number | "">("");

  // Step 3: Media
  const [media, setMedia] = useState<MediaFormData[]>(() => {
    if (initialMedia.length > 0) {
      return initialMedia.map((m) => ({
        id: m.id,
        variant_id: m.variant_id || null,
        variant_client_key: m.variant_id ? `v_${m.variant_id}` : null,
        media_url: m.media_url || null,
        storage_path: m.storage_path || null,
        media_type: (m.media_type as "image" | "video") || "image",
        option_number: Number(m.option_number ?? 1),
        sort_order: Number(m.sort_order ?? 0),
        alt_ar: m.alt_ar || "",
        alt_he: m.alt_he || "",
        alt_en: m.alt_en || "",
        preview_url: m.media_url || undefined
      }));
    }
    return [];
  });

  const [deleteMediaIds, setDeleteMediaIds] = useState<string[]>([]);
  const [newlyUploadedPaths, setNewlyUploadedPaths] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Step 4: Aliases
  const [aliases, setAliases] = useState<AliasFormData[]>(() => {
    if (initialAliases.length > 0) {
      return initialAliases.map((a) => ({
        id: a.id,
        alias: a.alias,
        language: a.language || "ar"
      }));
    }
    return [];
  });

  const [deleteAliasIds, setDeleteAliasIds] = useState<string[]>([]);
  const [newAliasText, setNewAliasText] = useState("");
  const [newAliasLang, setNewAliasLang] = useState<"ar" | "he" | "en">("ar");

  // Active Orders Conflict State
  const [conflictState, setConflictState] = useState<{
    variantIds: string[];
    orderIds: string[];
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  // --- Handlers ---
  const handleBatchGenerate = () => {
    if (batchSizes.length === 0) {
      alert("يرجى اختيار قياس واحد على الأقل للأنواع");
      return;
    }
    const newItems: VariantFormData[] = batchSizes.map((sz, idx) => {
      const clientKey = `v_tmp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      const formattedSku = sku ? `${sku}-${batchColor.en.substring(0, 3).toUpperCase()}-${sz}` : "";
      return {
        client_key: clientKey,
        sku: formattedSku,
        color_code: batchColor.code,
        color_ar: batchColor.ar,
        color_he: batchColor.he,
        color_en: batchColor.en,
        size_code: sz,
        price: Number(batchPrice) || 0,
        compare_at_price: batchComparePrice !== "" ? Number(batchComparePrice) : null,
        unit_cost: Number(batchCost) || 0,
        stock_quantity: batchStock !== "" ? Number(batchStock) : null,
        availability: "in_stock",
        active: true,
        attributes: {}
      };
    });

    setVariants((prev) => [...prev, ...newItems]);
  };

  const handleDuplicateVariant = (v: VariantFormData) => {
    const newClientKey = `v_tmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const copy: VariantFormData = {
      ...v,
      id: undefined,
      client_key: newClientKey,
      sku: v.sku ? `${v.sku}-COPY` : ""
    };
    setVariants((prev) => [...prev, copy]);
  };

  const handleDuplicateColor = (colorCode: string) => {
    const colorVars = variants.filter((x) => x.color_code === colorCode);
    if (colorVars.length === 0) return;

    const newColor = PRESET_COLORS.find((c) => c.code !== colorCode) || PRESET_COLORS[1];
    const newItems: VariantFormData[] = colorVars.map((v) => ({
      ...v,
      id: undefined,
      client_key: `v_tmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      color_code: newColor.code,
      color_ar: newColor.ar,
      color_he: newColor.he,
      color_en: newColor.en,
      sku: v.sku ? v.sku.replace(v.color_en.substring(0, 3).toUpperCase(), newColor.en.substring(0, 3).toUpperCase()) : ""
    }));

    setVariants((prev) => [...prev, ...newItems]);
  };

  const handleRemoveVariant = async (idx: number) => {
    const target = variants[idx];
    if (target.id) {
      // Check active orders before removing
      const res = await checkVariantActiveOrdersAction(target.id);
      if (res.success && res.data && res.data.count > 0) {
        setConflictState({
          variantIds: [target.id],
          orderIds: res.data.orderIds,
          message: `هذا النوع مرتبط بعدد (${res.data.count}) طلبات نشطة قيد التجهيز. لا يمكن حذفه بل سيتم تعطيله عند الحفظ.`
        });
      }
      setDeactivateVariantIds((prev) => [...prev, target.id!]);
    }
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    setErrorMsg(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await uploadProductMediaAction(productId, fd);
    setUploadingMedia(false);

    if (res.success && res.data) {
      setNewlyUploadedPaths((prev) => [...prev, res.data!.storage_path]);
      const newMediaItem: MediaFormData = {
        storage_path: res.data.storage_path,
        media_url: null,
        media_type: file.type.startsWith("video") ? "video" : "image",
        option_number: media.length + 1,
        sort_order: media.length,
        alt_ar: "",
        alt_he: "",
        alt_en: "",
        preview_url: res.data.signed_url
      };
      setMedia((prev) => [...prev, newMediaItem]);
    } else {
      setErrorMsg(res.message || "تعذر رفع الملف");
    }
  };

  const handleAddUrlMedia = () => {
    const url = prompt("أدخل رابط الوسيط (صورة أو فيديو):");
    if (!url || !url.trim()) return;

    const newMediaItem: MediaFormData = {
      media_url: url.trim(),
      storage_path: null,
      media_type: "image",
      option_number: media.length + 1,
      sort_order: media.length,
      alt_ar: "",
      alt_he: "",
      alt_en: "",
      preview_url: url.trim()
    };
    setMedia((prev) => [...prev, newMediaItem]);
  };

  const handleRemoveMedia = (idx: number) => {
    const target = media[idx];
    if (target.id) {
      setDeleteMediaIds((prev) => [...prev, target.id!]);
    }
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddAlias = () => {
    if (!newAliasText.trim()) return;
    setAliases((prev) => [
      ...prev,
      { alias: newAliasText.trim(), language: newAliasLang }
    ]);
    setNewAliasText("");
  };

  const handleRemoveAlias = (idx: number) => {
    const target = aliases[idx];
    if (target.id) {
      setDeleteAliasIds((prev) => [...prev, target.id!]);
    }
    setAliases((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- Final Save Handler ---
  const handleSave = async (activate: boolean) => {
    if (!nameAr.trim()) {
      alert("اسم المنتج بالعربية مطلوب في الخطوة الأولى");
      setStep(1);
      return;
    }

    if (!sku.trim()) {
      alert("رمز ה-SKU الرئيسي مطلوب في الخطوة الأولى");
      setStep(1);
      return;
    }

    // Material Object construction
    const hasMatValues = Object.values(material).some((v) => v.trim() !== "");
    const materialPayload = hasMatValues
      ? {
          fabric_ar: material.fabric_ar.trim() || null,
          fabric_he: material.fabric_he.trim() || null,
          fabric_en: material.fabric_en.trim() || null,
          composition: material.composition.trim() || null,
          fit: material.fit.trim() || null,
          season: material.season.trim() || null,
          care_notes: material.care_notes.trim() || null
        }
      : {};

    const payload: FullProductWizardPayload = {
      product: {
        id: productId,
        sku: sku.trim(),
        name_ar: nameAr.trim(),
        name_he: nameHe.trim() || undefined,
        name_en: nameEn.trim() || undefined,
        description_ar: descAr.trim() || undefined,
        description_he: descHe.trim() || undefined,
        description_en: descEn.trim() || undefined,
        category: category.trim() || undefined,
        material: materialPayload,
        metadata: {},
        source_system: "dashboard",
        source_id: sourceId.trim() || undefined,
        active: activate
      },
      variants: variants.map((v) => ({
        id: v.id,
        client_key: v.client_key,
        sku: v.sku.trim(),
        size_code: v.size_code.trim(),
        color_code: v.color_code,
        color_ar: v.color_ar.trim(),
        color_he: v.color_he.trim(),
        color_en: v.color_en.trim(),
        price: Number(v.price),
        compare_at_price: v.compare_at_price !== null ? Number(v.compare_at_price) : null,
        unit_cost: Number(v.unit_cost || 0),
        stock_quantity: v.stock_quantity !== null ? Number(v.stock_quantity) : null,
        availability: v.availability,
        active: v.active,
        attributes: v.attributes || {}
      })),
      media: media.map((m) => ({
        id: m.id,
        variant_id: m.variant_id || null,
        variant_client_key: m.variant_client_key || null,
        media_url: m.media_url || null,
        storage_path: m.storage_path || null,
        media_type: m.media_type,
        option_number: Number(m.option_number || 1),
        sort_order: Number(m.sort_order || 0),
        alt_ar: m.alt_ar.trim(),
        alt_he: m.alt_he.trim(),
        alt_en: m.alt_en.trim()
      })),
      aliases: aliases.map((a) => ({
        id: a.id,
        alias: a.alias.trim(),
        language: a.language
      })),
      deactivate_variant_ids: deactivateVariantIds,
      delete_media_ids: deleteMediaIds,
      delete_alias_ids: deleteAliasIds,
      acknowledged_variant_deactivations: ackDeactivations
    };

    setSubmitting(true);
    setErrorMsg(null);

    const idempotencyKey = `prod_wizard_${productId}_${Date.now()}`;
    const res = await saveProductBundleAction(payload, idempotencyKey, newlyUploadedPaths);

    setSubmitting(false);

    if (res.success) {
      alert("تم حفظ بيانات المنتج بنجاح!");
      onSaved();
      onClose();
    } else {
      if (res.code === "VARIANT_HAS_ACTIVE_ORDERS" && res.details?.variant_ids) {
        setConflictState({
          variantIds: res.details.variant_ids,
          orderIds: res.details.order_ids || [],
          message: res.message || "توجد أنواع مرتبطة بطلبات نشطة."
        });
      } else {
        setErrorMsg(res.message || "حدث خطأ أثناء حفظ المنتج.");
      }
    }
  };

  const activeSellableVariantsCount = variants.filter(
    (v) => v.active && Number(v.price) >= 0 && ["in_stock", "low_stock", "preorder"].includes(v.availability)
  ).length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "920px",
          background: "#0f172a",
          border: "1px solid rgba(148, 163, 184, 0.15)",
          borderRadius: "24px",
          padding: "28px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          direction: "rtl",
          color: "#f8fafc"
        }}
      >
        {/* Header Title & Close */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
              {initialProduct ? "تعديل المنتج والأنواع" : "إضافة منتج جديد"}
            </span>
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "2px 0 0", color: "#fff" }}>
              {nameAr || "معالج إدارة المنتج الشامل (RTL Wizard)"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              color: "#94a3b8",
              borderRadius: "12px",
              width: "36px",
              height: "36px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          {[
            { s: 1, label: "1. البيانات والنسيج" },
            { s: 2, label: "2. الأنواع والأسعار" },
            { s: 3, label: "3. صور ووسائط المنتج" },
            { s: 4, label: "4. الأسماء والمراجعة" }
          ].map((item) => (
            <button
              key={item.s}
              onClick={() => setStep(item.s as any)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: "12px",
                fontSize: "12.5px",
                fontWeight: step === item.s ? 700 : 500,
                background: step === item.s ? "linear-gradient(135deg, #3b82f6, #1d4ed8)" : "rgba(255,255,255,0.05)",
                color: step === item.s ? "#fff" : "var(--muted)",
                border: step === item.s ? "none" : "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
                textAlign: "center"
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "#f87171",
              fontSize: "13.5px"
            }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* --- STEP 1: Basic Product Information --- */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                  رمز ה-SKU الرئيسي للمنتج *
                </label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="مثال: WS-DR-001"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    direction: "ltr",
                    textAlign: "right"
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                  الفئة (Category)
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="مثال: فساتين نسائية، أطقم..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff"
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                اسم المنتج بالعربية *
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="اسم المنتج الكامل بالعربية..."
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff"
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                  الاسم بالعبرية (Hebrew)
                </label>
                <input
                  type="text"
                  value={nameHe}
                  onChange={(e) => setNameHe(e.target.value)}
                  placeholder="שם המוצר בעברית..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    direction: "rtl"
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                  الاسم بالإنجليزية (English)
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Product name in English..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    direction: "ltr"
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                الوصف بالعربية
              </label>
              <textarea
                rows={3}
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                placeholder="وصف تفصيلي للمنتج والمميزات بالعربية..."
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff"
                }}
              />
            </div>

            {/* Material User-Friendly Input Card */}
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                padding: "16px"
              }}
            >
              <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px 0", color: "#60a5fa" }}>
                مواصفات النسيج والخامة (Material & Care)
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ fontSize: "11.5px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    الخامة الأساسية (عربي)
                  </label>
                  <input
                    type="text"
                    value={material.fabric_ar}
                    onChange={(e) => setMaterial({ ...material, fabric_ar: e.target.value })}
                    placeholder="مثال: قطن طبيعي"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11.5px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    الخامة (عبري)
                  </label>
                  <input
                    type="text"
                    value={material.fabric_he}
                    onChange={(e) => setMaterial({ ...material, fabric_he: e.target.value })}
                    placeholder="כותנה"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11.5px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    الخامة (إنجليزي)
                  </label>
                  <input
                    type="text"
                    value={material.fabric_en}
                    onChange={(e) => setMaterial({ ...material, fabric_en: e.target.value })}
                    placeholder="Cotton"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11.5px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    نسبة التكريب / التركيب
                  </label>
                  <input
                    type="text"
                    value={material.composition}
                    onChange={(e) => setMaterial({ ...material, composition: e.target.value })}
                    placeholder="95% قطن، 5% ليكرا"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11.5px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    نوع القصة (Fit)
                  </label>
                  <input
                    type="text"
                    value={material.fit}
                    onChange={(e) => setMaterial({ ...material, fit: e.target.value })}
                    placeholder="قصة واسعة / Regular"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11.5px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    تعليمات العناية (Care)
                  </label>
                  <input
                    type="text"
                    value={material.care_notes}
                    onChange={(e) => setMaterial({ ...material, care_notes: e.target.value })}
                    placeholder="غسيل بارد 30°C"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px" }}
                  />
                </div>
              </div>
            </div>

            {/* Advanced Section Fold */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: "13px", padding: 0 }}
              >
                {showAdvanced ? "▲ إخفاء الإعدادات المتقدمة" : "▼ إعدادات متقدمة (Source ID)"}
              </button>
              {showAdvanced && (
                <div style={{ marginTop: "10px", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "10px" }}>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    معرف المصدر الخارجي (Source ID)
                  </label>
                  <input
                    type="text"
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    placeholder="مثال: shopify_102938"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- STEP 2: Sellable Variants & Fast Batch Generator --- */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Fast Batch Generator Card */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(15, 23, 42, 0.8))",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "18px",
                padding: "20px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <Sparkles size={20} style={{ color: "#60a5fa" }} />
                <h4 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#fff" }}>
                  مولّد الأنواع السريع (Fast Batch Generator)
                </h4>
              </div>

              {/* Color Presets Picker */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12.5px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                  1. اختر اللون:
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setBatchColor(c)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "10px",
                        border: batchColor.code === c.code ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.15)",
                        background: batchColor.code === c.code ? "rgba(59, 130, 246, 0.2)" : "#090e1a",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: c.code, display: "inline-block", border: "1px solid #fff" }} />
                      <span>{c.ar}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-Size Selector */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12.5px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                  2. حدد القياسات المطلوبة للإنشاء:
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {STANDARD_SIZES.map((sz) => {
                    const selected = batchSizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() =>
                          setBatchSizes((prev) => (selected ? prev.filter((x) => x !== sz) : [...prev, sz]))
                        }
                        style={{
                          padding: "6px 14px",
                          borderRadius: "8px",
                          border: selected ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)",
                          background: selected ? "rgba(16, 185, 129, 0.2)" : "#090e1a",
                          color: selected ? "#34d399" : "var(--muted)",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "12px"
                        }}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price & Cost Defaults */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "11.5px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>السعر (ILS) *</label>
                  <input
                    type="number"
                    value={batchPrice}
                    onChange={(e) => setBatchPrice(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11.5px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>سعر المقارنة (اختياري)</label>
                  <input
                    type="number"
                    value={batchComparePrice}
                    onChange={(e) => setBatchComparePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="مثال: 200"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11.5px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>التكلفة (ILS)</label>
                  <input
                    type="number"
                    value={batchCost}
                    onChange={(e) => setBatchCost(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11.5px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>المخزون (فارغ = غير محدد)</label>
                  <input
                    type="number"
                    value={batchStock}
                    onChange={(e) => setBatchStock(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="غير محدد"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px" }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleBatchGenerate}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <Plus size={16} />
                <span>توليد {batchSizes.length} أنواع لهذا اللون</span>
              </button>
            </div>

            {/* Compact Variants Table */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <h4 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#fff" }}>
                  جدول الأنواع المضافة ({variants.length})
                </h4>
              </div>

              {variants.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", background: "rgba(255,255,255,0.02)", borderRadius: "14px", color: "var(--muted)", fontSize: "13px" }}>
                  لم يتم إضافة أنواع بعد. استخدم المولد السريع أعلاه لتوليد أنواع المنتج بسهولة.
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "var(--muted)" }}>
                        <th style={{ padding: "10px", textAlign: "right" }}>رمز SKU</th>
                        <th style={{ padding: "10px", textAlign: "right" }}>اللون</th>
                        <th style={{ padding: "10px", textAlign: "center" }}>القياس</th>
                        <th style={{ padding: "10px", textAlign: "right" }}>السعر</th>
                        <th style={{ padding: "10px", textAlign: "right" }}>المقارنة</th>
                        <th style={{ padding: "10px", textAlign: "center" }}>المخزون</th>
                        <th style={{ padding: "10px", textAlign: "center" }}>الحالة</th>
                        <th style={{ padding: "10px", textAlign: "center" }}>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, idx) => (
                        <tr key={v.client_key || v.id || idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "10px", direction: "ltr", textAlign: "right" }}>
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => {
                                const val = e.target.value;
                                setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, sku: val } : x)));
                              }}
                              style={{ width: "110px", padding: "4px 6px", borderRadius: "6px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "11.5px" }}
                            />
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: v.color_code, display: "inline-block", border: "1px solid #fff" }} />
                              <span>{v.color_ar || v.color_en}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: 700 }}>{v.size_code}</td>
                          <td style={{ padding: "10px" }}>
                            <input
                              type="number"
                              value={v.price}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, price: val } : x)));
                              }}
                              style={{ width: "70px", padding: "4px 6px", borderRadius: "6px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#10b981", fontSize: "12px", fontWeight: 700 }}
                            />
                          </td>
                          <td style={{ padding: "10px" }}>
                            <input
                              type="number"
                              value={v.compare_at_price ?? ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? null : Number(e.target.value);
                                setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, compare_at_price: val } : x)));
                              }}
                              placeholder="—"
                              style={{ width: "70px", padding: "4px 6px", borderRadius: "6px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "var(--muted)", fontSize: "11.5px" }}
                            />
                          </td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            {v.stock_quantity !== null ? v.stock_quantity : <span style={{ color: "var(--muted)", fontSize: "11px" }}>غير محدد</span>}
                          </td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <select
                              value={v.availability}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, availability: val } : x)));
                              }}
                              style={{ padding: "4px 6px", borderRadius: "6px", background: "#090e1a", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", fontSize: "11px" }}
                            >
                              <option value="in_stock">متاح (In Stock)</option>
                              <option value="low_stock">مخزون منخفض</option>
                              <option value="out_of_stock">نفذ المخزون</option>
                              <option value="preorder">طلب مسبق</option>
                            </select>
                          </td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => handleDuplicateVariant(v)}
                                title="نسخ النوع"
                                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(idx)}
                                title="حذف/تعطيل"
                                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- STEP 3: Product Media --- */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Upload / Add Media Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px"
              }}
            >
              <label
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: uploadingMedia ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {uploadingMedia ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={16} />}
                <span>{uploadingMedia ? "جارٍ الرفع..." : "رفع صورة أو فيديو"}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4" onChange={handleFileUpload} disabled={uploadingMedia} style={{ display: "none" }} />
              </label>

              <button
                type="button"
                onClick={handleAddUrlMedia}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.12)",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                + إضافة رابط خارجي
              </button>
            </div>

            {/* Media Gallery List */}
            {media.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", background: "rgba(255,255,255,0.02)", borderRadius: "16px", color: "var(--muted)", fontSize: "13.5px" }}>
                لم يتم إضافة صور أو مقاطع فيديو للمنتج بعد.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
                {media.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    style={{
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "16px",
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px"
                    }}
                  >
                    {/* Media Preview */}
                    <div style={{ height: "140px", borderRadius: "10px", background: "#090e1a", overflow: "hidden", display: "grid", placeItems: "center", position: "relative" }}>
                      {m.preview_url ? (
                        m.media_type === "video" ? (
                          <video src={m.preview_url} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <img src={m.preview_url} alt={m.alt_ar || "وسيط"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )
                      ) : (
                        <ImageIcon size={32} style={{ color: "var(--muted)" }} />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(idx)}
                        style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(239, 68, 68, 0.8)", border: "none", color: "#fff", width: "26px", height: "26px", borderRadius: "6px", cursor: "pointer", display: "grid", placeItems: "center" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Variant Link Dropdown */}
                    <div>
                      <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>ربط بالنوع (Variant)</label>
                      <select
                        value={m.variant_client_key || m.variant_id || "all"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMedia((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    variant_id: val.startsWith("v_tmp") ? null : val === "all" ? null : val,
                                    variant_client_key: val.startsWith("v_tmp") ? val : null
                                  }
                                : x
                            )
                          );
                        }}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "12px" }}
                      >
                        <option value="all">جميع الأنواع (عام)</option>
                        {variants.map((v) => (
                          <option key={v.client_key || v.id} value={v.client_key || v.id}>
                            {v.color_ar} - {v.size_code} ({v.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div>
                        <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "2px" }}>رقم الخيار (Option #)</label>
                        <input
                          type="number"
                          value={m.option_number}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setMedia((prev) => prev.map((x, i) => (i === idx ? { ...x, option_number: val } : x)));
                          }}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "12px" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "2px" }}>الترتيب</label>
                        <input
                          type="number"
                          value={m.sort_order}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setMedia((prev) => prev.map((x, i) => (i === idx ? { ...x, sort_order: val } : x)));
                          }}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "12px" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- STEP 4: Searchable Aliases & Review --- */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Searchable Aliases Manager */}
            <div style={{ padding: "18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px" }}>
              <h4 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 12px 0", color: "#60a5fa" }}>
                الأسماء المستعارة المترادفة (Searchable Aliases)
              </h4>
              <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                <input
                  type="text"
                  value={newAliasText}
                  onChange={(e) => setNewAliasText(e.target.value)}
                  placeholder="أدخل اسماً مستعاراً جديداً (مثال: فستان كحلي طويل)..."
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", background: "#090e1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px" }}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAlias())}
                />
                <select
                  value={newAliasLang}
                  onChange={(e) => setNewAliasLang(e.target.value as any)}
                  style={{ padding: "8px 12px", borderRadius: "8px", background: "#090e1a", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", fontSize: "13px" }}
                >
                  <option value="ar">عربي</option>
                  <option value="he">עברית</option>
                  <option value="en">English</option>
                </select>
                <button type="button" onClick={handleAddAlias} style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                  إضافة
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {aliases.map((a, idx) => (
                  <span
                    key={a.id || idx}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      background: "rgba(59, 130, 246, 0.15)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      color: "#93c5fd",
                      fontSize: "12.5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <Tag size={12} />
                    <span>{a.alias} ({a.language})</span>
                    <button type="button" onClick={() => handleRemoveAlias(idx)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0 }}>
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Validation Warnings Summary */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {variants.length === 0 && (
                <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <AlertTriangle size={18} />
                  <span>تنبيه: لا يوجد أنواع (Variants) مضافة لهذا المنتج. يمكن حفظه كمسودة فقط.</span>
                </div>
              )}

              {variants.length > 0 && activeSellableVariantsCount === 0 && (
                <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShieldAlert size={18} />
                  <span>تحذير: لا يوجد أي نوع (Variant) نشط ومتاح. لن يتم التفعيل حتى توفير نوع نشط واحد على الأقل.</span>
                </div>
              )}

              {media.length === 0 && (
                <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Info size={18} />
                  <span>تنبيه: لم يتم رفع صور للمنتج. يفضل إضافة وسيط واحد على الأقل للعرض في الشات بوت.</span>
                </div>
              )}
            </div>

            {/* Complete Product Review Summary Card */}
            <div style={{ padding: "18px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px" }}>
              <h4 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 12px 0", color: "#fff" }}>
                مراجعة ملخص المنتج النهائي
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>الاسم العربي:</span>
                  <strong>{nameAr || "—"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>رمز ה-SKU:</span>
                  <strong style={{ direction: "ltr" }}>{sku || "—"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>الفئة:</span>
                  <strong>{category || "—"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>عدد الأنواع:</span>
                  <strong>{variants.length} أنواع ({activeSellableVariantsCount} نشط)</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>عدد الوسائط:</span>
                  <strong>{media.length} وسائط</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>الأسماء المستعارة:</span>
                  <strong>{aliases.length} مترادفات</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Order Deactivation Confirmation Dialog */}
        {conflictState && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.85)", display: "grid", placeItems: "center", padding: "16px" }}>
            <div style={{ maxWidth: "480px", background: "#0f172a", border: "1px solid #ef4444", borderRadius: "20px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#ef4444", marginBottom: "12px" }}>
                <ShieldAlert size={24} />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>تحذير تعطيل أنواع مرتبطة بطلبات</h3>
              </div>
              <p style={{ fontSize: "13.5px", color: "#cbd5e1", lineHeight: 1.6, marginBottom: "16px" }}>
                {conflictState.message}
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setConflictState(null)} style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "13px" }}>
                  إلغاء الإجراء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAckDeactivations((prev) => Array.from(new Set([...prev, ...conflictState.variantIds])));
                    setConflictState(null);
                  }}
                  style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 700 }}
                >
                  تأكيد التعطيل ومتابعة الحفظ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "28px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            type="button"
            disabled={step === 1 || submitting}
            onClick={() => setStep((s) => (s - 1) as any)}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: step === 1 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: step === 1 ? 0.5 : 1
            }}
          >
            <ChevronRight size={18} />
            <span>السابق</span>
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "12px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>التالي</span>
                <ChevronLeft size={18} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSave(false)}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.15)",
                    padding: "10px 18px",
                    borderRadius: "12px",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer"
                  }}
                >
                  حفظ كمسودة (Draft)
                </button>

                <button
                  type="button"
                  disabled={submitting || activeSellableVariantsCount === 0}
                  onClick={() => handleSave(true)}
                  style={{
                    background: activeSellableVariantsCount > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "gray",
                    color: "#fff",
                    border: "none",
                    padding: "10px 22px",
                    borderRadius: "12px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: submitting || activeSellableVariantsCount === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 8px 20px rgba(16, 185, 129, 0.2)"
                  }}
                >
                  {submitting ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={18} />}
                  <span>{submitting ? "جارٍ الحفظ والتحقق..." : "حفظ المنتج وتفعيله"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
