"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChatbotNav } from "./chatbot-nav";
import { ProductDetailViewModel, VariantFormData, MediaFormData } from "@/types/chatbot";
import { saveVariantAction, saveMediaAction } from "@/lib/chatbot-actions";
import { ToastContainer, Toast } from "./ui";
import {
  ArrowRight,
  Package,
  Layers,
  Image as ImageIcon,
  Tag,
  Link2,
  ShoppingBag,
  Plus,
  CheckCircle2,
  Edit2
} from "lucide-react";

const formatILS = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

export function ChatbotProductDetailClient({ initialData }: { initialData: ProductDetailViewModel }) {
  const { product, variants: initVariants, media: initMedia, aliases, adMappings, recentOrders } = initialData;

  const [activeTab, setActiveTab] = useState<"variants" | "media" | "aliases" | "adMappings" | "recentOrders">("variants");
  const [variants, setVariants] = useState(initVariants);
  const [media, setMedia] = useState(initMedia);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const [variantForm, setVariantForm] = useState<VariantFormData>({
    sku: "",
    color_code: "#ffffff",
    color_ar: "",
    color_he: "",
    color_en: "",
    price: 100,
    compare_at_price: null,
    unit_cost: 30,
    stock_quantity: 10,
    active: true
  });

  const [mediaForm, setMediaForm] = useState<MediaFormData>({
    variant_id: null,
    media_url: "",
    storage_path: "",
    media_type: "image",
    option_number: (media.length + 1),
    sort_order: (media.length + 1),
    alt_ar: "",
    alt_he: "",
    alt_en: ""
  });

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveVariantAction(product.id, variantForm);
    if (res.success) {
      addToast("success", "تم إضافة النوع بنجاح");
      setIsVariantModalOpen(false);
      window.location.reload();
    } else {
      addToast("error", res.message || "تعذر إضافة النوع");
    }
  };

  const handleCreateMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaForm.media_url) {
      addToast("error", "رابط الصورة/الفيديو مطلوب");
      return;
    }
    const res = await saveMediaAction(product.id, mediaForm);
    if (res.success) {
      addToast("success", "تم إضافة الوسيط بنجاح");
      setIsMediaModalOpen(false);
      window.location.reload();
    } else {
      addToast("error", res.message || "تعذر إضافة الوسيط");
    }
  };

  return (
    <div style={{ padding: "8px 0" }}>
      <ToastContainer toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      <ChatbotNav subtitle={`تفاصيل المنتج: ${product.name_ar || "منتج بدون اسم"}`} />

      {/* Back Button & Title Header */}
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/chatbot/products"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "var(--muted)",
            textDecoration: "none",
            marginBottom: "12px"
          }}
        >
          <ArrowRight size={14} /> العودة لجميع المنتجات
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            padding: "20px",
            borderRadius: "16px",
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: product.active ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: product.active ? "#34d399" : "#f87171"
                }}
              >
                {product.active ? "نشط في البوت" : "غير نشط"}
              </span>
              {product.category && (
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc" }}>
                  {product.category}
                </span>
              )}
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#fff", margin: 0 }}>
              {product.name_ar || "منتج غير معنون"}
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0 0" }}>
              SKU الرئيسي: {product.sku || "—"} | النظام المصدر: {product.source_system || "يدوي"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setIsVariantModalOpen(true)} className="btn primary-btn" style={{ gap: "6px", fontSize: "13px" }}>
              <Plus size={16} /> إضافة نوع (Variant)
            </button>
            <button onClick={() => setIsMediaModalOpen(true)} className="btn" style={{ background: "rgba(255,255,255,0.08)", color: "#fff", gap: "6px", fontSize: "13px" }}>
              <ImageIcon size={16} /> إضافة صورة/وسيط
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("variants")}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: activeTab === "variants" ? 700 : 500,
            color: activeTab === "variants" ? "#fff" : "var(--muted)",
            borderBottom: activeTab === "variants" ? "2px solid var(--accent-glow)" : "none",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer"
          }}
        >
          أنواع المنتج ({variants.length})
        </button>
        <button
          onClick={() => setActiveTab("media")}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: activeTab === "media" ? 700 : 500,
            color: activeTab === "media" ? "#fff" : "var(--muted)",
            borderBottom: activeTab === "media" ? "2px solid var(--accent-glow)" : "none",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer"
          }}
        >
          الوسائط والصور ({media.length})
        </button>
        <button
          onClick={() => setActiveTab("aliases")}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: activeTab === "aliases" ? 700 : 500,
            color: activeTab === "aliases" ? "#fff" : "var(--muted)",
            borderBottom: activeTab === "aliases" ? "2px solid var(--accent-glow)" : "none",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer"
          }}
        >
          الأسماء المستعارة ({aliases.length})
        </button>
        <button
          onClick={() => setActiveTab("adMappings")}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: activeTab === "adMappings" ? 700 : 500,
            color: activeTab === "adMappings" ? "#fff" : "var(--muted)",
            borderBottom: activeTab === "adMappings" ? "2px solid var(--accent-glow)" : "none",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer"
          }}
        >
          الإعلانات المرتبطة ({adMappings.length})
        </button>
        <button
          onClick={() => setActiveTab("recentOrders")}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: activeTab === "recentOrders" ? 700 : 500,
            color: activeTab === "recentOrders" ? "#fff" : "var(--muted)",
            borderBottom: activeTab === "recentOrders" ? "2px solid var(--accent-glow)" : "none",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer"
          }}
        >
          الطلبات الحديثة ({recentOrders.length})
        </button>
      </div>

      {/* Tab 1: Variants */}
      {activeTab === "variants" && (
        <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>SKU النوع</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>اللون / الاسم</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>السعر الحالي</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>السعر قبل الخصم</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>التكلفة (Unit Cost)</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>المخزون</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {variants.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                    لا توجد أنواع (variants) معرفة لهذا المنتج بعد.
                  </td>
                </tr>
              ) : (
                variants.map((v) => (
                  <tr key={v.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#fff" }}>{v.sku || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--fg)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {v.color_code && (
                          <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: v.color_code, border: "1px solid rgba(255,255,255,0.3)" }} />
                        )}
                        <span>{v.color_ar || v.color_en || "—"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#10b981" }}>{formatILS(Number(v.price ?? 0))}</td>
                    <td style={{ padding: "12px 16px", color: "var(--muted)", textDecoration: "line-through" }}>
                      {v.compare_at_price ? formatILS(Number(v.compare_at_price)) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--fg)" }}>{formatILS(Number(v.unit_cost ?? 0))}</td>
                    <td style={{ padding: "12px 16px", color: "var(--fg)" }}>{v.stock_quantity ?? 0} قطعة</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: "12px", color: v.active ? "#34d399" : "#f87171" }}>
                        {v.active ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Media */}
      {activeTab === "media" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
          {media.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", padding: "32px", textAlign: "center", color: "var(--muted)" }}>
              لا توجد صور أو وسائط مضافة لهذا المنتج بعد.
            </div>
          ) : (
            media.map((m) => (
              <div
                key={m.id}
                style={{
                  borderRadius: "12px",
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                <div style={{ width: "100%", height: "140px", borderRadius: "8px", background: "rgba(0,0,0,0.4)", overflow: "hidden", display: "grid", placeItems: "center" }}>
                  {m.media_url ? (
                    <img src={m.media_url} alt={m.alt_ar || "صورة المنتج"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <ImageIcon size={32} style={{ color: "var(--muted)" }} />
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ fontWeight: 700, color: "var(--accent-glow)" }}>رقم الاختيار #{m.option_number || 1}</span>
                  <span style={{ color: "var(--muted)" }}>الترتيب: {m.sort_order || 1}</span>
                </div>
                {m.alt_ar && <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0 }}>{m.alt_ar}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Variant Modal */}
      {isVariantModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", display: "grid", placeItems: "center", padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "500px", background: "#0f172a", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255,255,255,0.15)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>إضافة نوع (Variant) جديد</h3>
            <form onSubmit={handleCreateVariant} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>SKU النوع</label>
                <input type="text" value={variantForm.sku} onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })} placeholder="مثال: WS-DR-001-RED-S" style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>اللون بالعربية</label>
                  <input type="text" value={variantForm.color_ar} onChange={(e) => setVariantForm({ ...variantForm, color_ar: e.target.value })} placeholder="أحمر، أسود..." style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>رمز اللون (Hex)</label>
                  <input type="color" value={variantForm.color_code} onChange={(e) => setVariantForm({ ...variantForm, color_code: e.target.value })} style={{ width: "100%", height: "38px", borderRadius: "8px", background: "none", border: "none", cursor: "pointer" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>السعر (شيكل)</label>
                  <input type="number" value={variantForm.price} onChange={(e) => setVariantForm({ ...variantForm, price: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>التكلفة (Unit Cost)</label>
                  <input type="number" value={variantForm.unit_cost} onChange={(e) => setVariantForm({ ...variantForm, unit_cost: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>الكمية المخزنة</label>
                  <input type="number" value={variantForm.stock_quantity} onChange={(e) => setVariantForm({ ...variantForm, stock_quantity: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <button type="button" onClick={() => setIsVariantModalOpen(false)} className="btn" style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>إلغاء</button>
                <button type="submit" className="btn primary-btn">حفظ النوع</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Media Modal */}
      {isMediaModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", display: "grid", placeItems: "center", padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "500px", background: "#0f172a", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255,255,255,0.15)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>إضافة وسيط / صورة للمنتج</h3>
            <form onSubmit={handleCreateMedia} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>رابط الصورة أو الفيديو (URL) *</label>
                <input type="url" required value={mediaForm.media_url} onChange={(e) => setMediaForm({ ...mediaForm, media_url: e.target.value })} placeholder="https://..." style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", direction: "ltr" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>رقم الاختيار (Option #) *</label>
                  <input type="number" value={mediaForm.option_number} onChange={(e) => setMediaForm({ ...mediaForm, option_number: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>النص التوضيحي (Alt AR)</label>
                  <input type="text" value={mediaForm.alt_ar} onChange={(e) => setMediaForm({ ...mediaForm, alt_ar: e.target.value })} placeholder="وصف الصورة..." style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <button type="button" onClick={() => setIsMediaModalOpen(false)} className="btn" style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>إلغاء</button>
                <button type="submit" className="btn primary-btn">حفظ الوسيط</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
