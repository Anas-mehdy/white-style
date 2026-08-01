"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChatbotNav } from "./chatbot-nav";
import { ChatbotProduct, ChatbotProductVariant, ChatbotProductMedia, ProductFormData, VariantFormData } from "@/types/chatbot";
import { saveProductAction, saveVariantAction } from "@/lib/chatbot-actions";
import { ToastContainer, Toast, EmptyState } from "./ui";
import {
  Search,
  Plus,
  Package,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  Edit2,
  CheckCircle2,
  XCircle,
  ChevronRight
} from "lucide-react";

const formatILS = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

export function ChatbotProductsClient({
  initialProducts = [],
  initialVariants = [],
  initialMedia = []
}: {
  initialProducts: ChatbotProduct[];
  initialVariants: ChatbotProductVariant[];
  initialMedia: ChatbotProductMedia[];
}) {
  const [products, setProducts] = useState<ChatbotProduct[]>(initialProducts);
  const [variants] = useState<ChatbotProductVariant[]>(initialVariants);
  const [media] = useState<ChatbotProductMedia[]>(initialMedia);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ChatbotProduct | null>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    sku: "",
    name_ar: "",
    name_he: "",
    name_en: "",
    description_ar: "",
    description_he: "",
    description_en: "",
    category: "",
    material: "",
    source_system: "manual",
    source_id: "",
    active: true
  });

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      sku: "",
      name_ar: "",
      name_he: "",
      name_en: "",
      description_ar: "",
      description_he: "",
      description_en: "",
      category: "",
      material: "",
      source_system: "manual",
      source_id: "",
      active: true
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (p: ChatbotProduct) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku || "",
      name_ar: p.name_ar || "",
      name_he: p.name_he || "",
      name_en: p.name_en || "",
      description_ar: p.description_ar || "",
      description_he: p.description_he || "",
      description_en: p.description_en || "",
      category: p.category || "",
      material: p.material || "",
      source_system: p.source_system || "manual",
      source_id: p.source_id || "",
      active: p.active ?? true
    });
    setIsProductModalOpen(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_ar) {
      addToast("error", "اسم المنتج بالعربية مطلوب");
      return;
    }

    const res = await saveProductAction(formData, editingProduct?.id);
    if (res.success) {
      addToast("success", res.message || "تم حفظ المنتج بنجاح");
      setIsProductModalOpen(false);
      // Local state refresh
      window.location.reload();
    } else {
      addToast("error", res.message || "تعذر حفظ المنتج");
    }
  };

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  const filteredProducts = products.filter((p) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      (p.name_ar && p.name_ar.toLowerCase().includes(query)) ||
      (p.name_en && p.name_en.toLowerCase().includes(query)) ||
      (p.sku && p.sku.toLowerCase().includes(query));
    const matchesCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ padding: "8px 0" }}>
      <ToastContainer toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      <ChatbotNav subtitle="إدارة كتالوج المنتجات والأنواع والوسائط والربط مع الإعلانات" />

      {/* Header Actions & Search Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "280px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: 1,
              padding: "10px 14px",
              borderRadius: "12px",
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
          >
            <Search size={18} style={{ color: "var(--muted)" }} />
            <input
              type="text"
              placeholder="البحث بالاسم العربي، الإنجليزي، أو رمز الـ SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "14px",
                width: "100%",
                outline: "none"
              }}
            />
          </div>

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                background: "#0f172a",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                fontSize: "14px"
              }}
            >
              <option value="all">جميع الفئات</option>
              {categories.map((c) => (
                <option key={c} value={c!}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        <button onClick={handleOpenCreateModal} className="btn primary-btn" style={{ gap: "8px" }}>
          <Plus size={18} /> إضافة منتج جديد
        </button>
      </div>

      {/* Product List Grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title="لا توجد منتجات مطابقة"
          description="لم يتم العثور على منتجات في الكتالوج بناءً على محددات البحث الحالية."
          actionText="إضافة منتج جديد"
          onAction={handleOpenCreateModal}
          icon={Package}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "20px"
          }}
        >
          {filteredProducts.map((product) => {
            const pVariants = variants.filter((v) => v.product_id === product.id);
            const pMedia = media.filter((m) => m.product_id === product.id);
            const minPrice = pVariants.length
              ? Math.min(...pVariants.map((v) => Number(v.price ?? 0)))
              : null;

            return (
              <div
                key={product.id}
                style={{
                  padding: "20px",
                  borderRadius: "16px",
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: product.active ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: product.active ? "#34d399" : "#f87171",
                          marginBottom: "6px",
                          display: "inline-block"
                        }}
                      >
                        {product.active ? "نشط" : "غير نشط"}
                      </span>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--fg)", margin: 0 }}>
                        {product.name_ar || "منتج غير معنون"}
                      </h3>
                      {product.name_en && (
                        <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0 0", direction: "ltr", textAlign: "right" }}>
                          {product.name_en}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenEditModal(product)}
                      style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: "4px" }}
                      title="تعديل المنتج"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>

                  <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px", lineHeight: 1.5 }}>
                    {product.description_ar ? product.description_ar.substring(0, 90) + "..." : "لا يوجد وصف مدخل..."}
                  </div>

                  {/* Metadata Chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                    {product.sku && (
                      <span style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", color: "var(--fg)" }}>
                        SKU: {product.sku}
                      </span>
                    )}
                    {product.category && (
                      <span style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc" }}>
                        {product.category}
                      </span>
                    )}
                    <span style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}>
                      {pVariants.length} أنواع (Variants)
                    </span>
                    <span style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}>
                      {pMedia.length} وسائط
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>السعر المبدئي</span>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: "#10b981" }}>
                      {minPrice !== null ? formatILS(minPrice) : "—"}
                    </span>
                  </div>

                  <Link
                    href={`/chatbot/products/${product.id}`}
                    className="btn"
                    style={{ background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc", border: "none", fontSize: "13px", gap: "6px" }}
                  >
                    <span>تفاصيل المنتج والأنواع</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Create/Edit Modal */}
      {isProductModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: "16px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "20px",
              padding: "24px",
              maxHeight: "90vh",
              overflowY: "auto"
            }}
          >
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>
              {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد للكتالوج"}
            </h3>

            <form onSubmit={handleSubmitProduct} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>رمز الـ SKU الرئيسي</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="مثال: WS-DR-001"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>الفئة (Category)</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="مثال: فساتين، أطقم..."
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>اسم المنتج بالعربية *</label>
                <input
                  type="text"
                  required
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="اسم المنتج بالعربية..."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>الاسم بالأنبرية (Hebrew)</label>
                  <input
                    type="text"
                    value={formData.name_he}
                    onChange={(e) => setFormData({ ...formData, name_he: e.target.value })}
                    placeholder="اسم المنتج بالعبرية..."
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", direction: "rtl" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>الاسم بالإنجليزية (English)</label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="Product name in English..."
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", direction: "ltr" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>الوصف بالعربية</label>
                <textarea
                  rows={3}
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  placeholder="تفاصيل ووصف المنتج بالعربية..."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <label htmlFor="activeCheck" style={{ fontSize: "14px", color: "#fff", cursor: "pointer" }}>
                  منتج نشط ومتاح في الشات بوت
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="btn" style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>
                  إلغاء
                </button>
                <button type="submit" className="btn primary-btn">
                  حفظ المنتج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
