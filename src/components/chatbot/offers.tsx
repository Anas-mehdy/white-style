"use client";

import React, { useState } from "react";
import { ChatbotNav } from "./chatbot-nav";
import { ChatbotDiscountRule, ChatbotShippingZone, ChatbotShippingZoneAlias } from "@/types/chatbot";
import { saveDiscountRuleAction } from "@/lib/chatbot-actions";
import { ToastContainer, Toast } from "./ui";
import {
  Tag,
  Truck,
  Plus,
  AlertTriangle,
  Info,
  CheckCircle2,
  MapPin,
  Clock,
  ShieldCheck
} from "lucide-react";

const formatILS = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

const defaultShippingPresetRules = [
  { zone: "الضفة الغربية (West Bank)", fee: 20, delivery: "يومان (2 days)", carrier: "سابق ولاحق" },
  { zone: "القدس (Jerusalem)", fee: 35, delivery: "يومان (2 days)", carrier: "سابق ولاحق" },
  { zone: "أبو غوش (Abu Ghosh)", fee: 45, delivery: "يومان (2 days)", carrier: "سابق ولاحق" },
  { zone: "الداخل (Inside Israel)", fee: 80, delivery: "يومان (2 days)", carrier: "سابق ولاحق" },
  { zone: "إيلات (Eilat)", fee: 110, delivery: "يومان (2 days)", carrier: "سابق ولاحق" }
];

export function ChatbotOffersClient({
  initialRules = [],
  initialZones = [],
  initialAliases = []
}: {
  initialRules: ChatbotDiscountRule[];
  initialZones: ChatbotShippingZone[];
  initialAliases: ChatbotShippingZoneAlias[];
}) {
  const [rules, setRules] = useState<ChatbotDiscountRule[]>(initialRules);
  const [zones] = useState<ChatbotShippingZone[]>(initialZones);
  const [aliases] = useState<ChatbotShippingZoneAlias[]>(initialAliases);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    name: "",
    discount_type: "percentage",
    discount_value: 10,
    min_quantity: 1,
    product_id: ""
  });

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.name) {
      addToast("error", "اسم قاعدة الخصم مطلوب");
      return;
    }

    const res = await saveDiscountRuleAction(
      ruleForm.name,
      ruleForm.discount_type,
      ruleForm.discount_value,
      ruleForm.min_quantity,
      ruleForm.product_id || undefined
    );

    if (res.success) {
      addToast("success", "تم إضافة قاعدة الخصم بنجاح");
      setIsRuleModalOpen(false);
      window.location.reload();
    } else {
      addToast("error", res.message || "تعذر إضافة قاعدة الخصم");
    }
  };

  return (
    <div style={{ padding: "8px 0" }}>
      <ToastContainer toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      <ChatbotNav subtitle="إدارة قواعد الخصومات وسياسات وأسعار الشحن لمناطق التوصيل" />

      {/* Prominent Policy Warning Box */}
      <div
        style={{
          padding: "18px 24px",
          borderRadius: "16px",
          background: "rgba(99, 102, 241, 0.12)",
          border: "1px solid rgba(99, 102, 241, 0.35)",
          color: "#a5b4fc",
          marginBottom: "28px",
          display: "flex",
          alignItems: "flex-start",
          gap: "14px"
        }}
      >
        <ShieldCheck size={24} style={{ color: "var(--accent-glow)", flexShrink: 0, marginTop: "2px" }} />
        <div>
          <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", margin: "0 0 4px 0" }}>
            تنويه هام بشأن سياسة عرض الخصومات
          </h4>
          <p style={{ fontSize: "14px", margin: 0, lineHeight: 1.6, color: "#cbd5e1" }}>
            <strong>تنويه هام: لا يقدم البوت هذه الخصومات بشكل استباقي، بل يتحقق منها فقط بعد طلب الزبون.</strong> الحقل{" "}
            <code>requires_customer_request</code> مفعّل تلقائياً لمنع تقديم خصومات غير مبررة للزبائن قبل الاستفسار الصريح.
          </p>
        </div>
      </div>

      {/* Section 1: Discount Rules */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Tag size={20} style={{ color: "var(--accent-glow)" }} /> قواعد الخصومات الكترونية
            </h3>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>الخصومات النشطة المتاحة عند طلب الزبون</span>
          </div>

          <button onClick={() => setIsRuleModalOpen(true)} className="btn primary-btn" style={{ gap: "6px", fontSize: "13px" }}>
            <Plus size={16} /> إضافة قاعدة خصم جديدة
          </button>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>اسم القاعدة</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>نوع الخصم</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>قيمة الخصم</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>الحد الأدنى للكمية</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>طلب الزبون مطلوب؟</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                    لا توجد قواعد خصم مضافة بعد.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#fff" }}>{rule.name}</td>
                    <td style={{ padding: "12px 16px", color: "var(--fg)" }}>
                      {rule.discount_type === "percentage" ? "نسبة مئوية (%)" : rule.discount_type === "fixed" ? "خصم ثابت" : "سعر وحدة ثابت"}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#10b981" }}>
                      {rule.discount_type === "percentage" ? `${rule.discount_value}%` : formatILS(rule.discount_value)}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--fg)" }}>{rule.min_quantity || 1} قطعة</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: "12px", color: "#34d399", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "6px" }}>
                        نعم (طلب الزبون شرط)
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: "12px", color: rule.active ? "#34d399" : "#f87171" }}>
                        {rule.active ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Shipping Zones & Presets */}
      <div>
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Truck size={20} style={{ color: "#38bdf8" }} /> مناطق ورسوم الشحن المعتمدة
          </h3>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>تعريف مناطق التوصيل، التكلفة، مدة التسليم، وشركة الشحن المعتمدة</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {defaultShippingPresetRules.map((preset) => (
            <div
              key={preset.zone}
              style={{
                padding: "18px",
                borderRadius: "14px",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={16} style={{ color: "#38bdf8" }} /> {preset.zone}
                </span>
                <span style={{ fontSize: "16px", fontWeight: 800, color: "#10b981" }}>{formatILS(preset.fee)}</span>
              </div>

              <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div>شركة الشحن: <strong>{preset.carrier}</strong></div>
                <div>مدة التوصيل والمتوقعة: <strong>{preset.delivery}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Rule Modal */}
      {isRuleModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", display: "grid", placeItems: "center", padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "480px", background: "#0f172a", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255,255,255,0.15)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>إضافة قاعدة خصم جديدة</h3>
            <form onSubmit={handleCreateRule} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>اسم القاعدة *</label>
                <input type="text" required value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder="خصم الكميات، خصم 10%..." style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>نوع الخصم</label>
                  <select value={ruleForm.discount_type} onChange={(e) => setRuleForm({ ...ruleForm, discount_type: e.target.value })} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
                    <option value="percentage">نسبة مئوية (%)</option>
                    <option value="fixed">مبلغ ثابت (شيكل)</option>
                    <option value="fixed_unit_price">سعر وحدة ثابت</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>قيمة الخصم *</label>
                  <input type="number" required value={ruleForm.discount_value} onChange={(e) => setRuleForm({ ...ruleForm, discount_value: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>الحد الأدنى للكمية المطلوبة</label>
                <input type="number" value={ruleForm.min_quantity} onChange={(e) => setRuleForm({ ...ruleForm, min_quantity: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <button type="button" onClick={() => setIsRuleModalOpen(false)} className="btn" style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>إلغاء</button>
                <button type="submit" className="btn primary-btn">حفظ القاعدة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
