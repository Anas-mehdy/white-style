"use client";

import React, { useState } from "react";
import { ChatbotNav } from "./chatbot-nav";
import { AdMappingViewModel, CampaignProfitability } from "@/types/chatbot";
import { saveAdProductMappingAction } from "@/lib/chatbot-actions";
import { ToastContainer, Toast } from "./ui";
import {
  Link2,
  TrendingUp,
  AlertTriangle,
  Search,
  Plus,
  CheckCircle2,
  HelpCircle,
  Award,
  DollarSign
} from "lucide-react";

const formatILS = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

const formatUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function ChatbotAttributionClient({
  initialMappings = [],
  unmappedAdsCount = 0,
  initialProfitability = []
}: {
  initialMappings: AdMappingViewModel[];
  unmappedAdsCount?: number;
  initialProfitability: CampaignProfitability[];
}) {
  const [activeTab, setActiveTab] = useState<"mappings" | "profitability">("mappings");
  const [mappings] = useState<AdMappingViewModel[]>(initialMappings);
  const [profitability] = useState<CampaignProfitability[]>(initialProfitability);
  const [search, setSearch] = useState("");

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [adIdInput, setAdIdInput] = useState("");
  const [productIdInput, setProductIdInput] = useState("");
  const [priorityInput, setPriorityInput] = useState(1);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adIdInput || !productIdInput) {
      addToast("error", "معرّف الإعلان ومعرّف المنتج مطلوبان");
      return;
    }

    const res = await saveAdProductMappingAction(adIdInput, productIdInput, priorityInput);
    if (res.success) {
      addToast("success", "تم ربط الإعلان بالمنتج بنجاح (يدعم الإعلانات الدوارة/متعددة المنتجات)");
      setIsMapModalOpen(false);
      window.location.reload();
    } else {
      addToast("error", res.message || "تعذر ربط الإعلان بالمنتج");
    }
  };

  const filteredMappings = mappings.filter(
    (m) =>
      !search ||
      (m.ad_name && m.ad_name.toLowerCase().includes(search.toLowerCase())) ||
      (m.product?.name_ar && m.product.name_ar.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ padding: "8px 0" }}>
      <ToastContainer toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      <ChatbotNav subtitle="ربط إعلانات Meta بالمنتجات وتحليل الربحية المنسوبة بصافي الأرباح" />

      {/* Warning Box for Unmapped Ads with Conversations */}
      {unmappedAdsCount > 0 && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "14px",
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            color: "#fbbf24",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={20} />
            <span style={{ fontSize: "14px", fontWeight: 600 }}>
              تنبيه: يوجد {unmappedAdsCount} إعلانات نشطة تتلقى محادثات ولكنها غير مرتبطة بمنتجات في الكتالوج بعد!
            </span>
          </div>

          <button onClick={() => setIsMapModalOpen(true)} className="btn" style={{ background: "rgba(245,158,11,0.2)", color: "#fff", border: "none", fontSize: "13px" }}>
            ربط إعلان الآن
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "24px" }}>
        <button
          onClick={() => setActiveTab("mappings")}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: activeTab === "mappings" ? 700 : 500,
            color: activeTab === "mappings" ? "#fff" : "var(--muted)",
            borderBottom: activeTab === "mappings" ? "2px solid var(--accent-glow)" : "none",
            background: "none",
            border: "none",
            cursor: "pointer"
          }}
        >
          جدول ربط الإعلانات بالمنتجات ({mappings.length})
        </button>
        <button
          onClick={() => setActiveTab("profitability")}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: activeTab === "profitability" ? 700 : 500,
            color: activeTab === "profitability" ? "#fff" : "var(--muted)",
            borderBottom: activeTab === "profitability" ? "2px solid var(--accent-glow)" : "none",
            background: "none",
            border: "none",
            cursor: "pointer"
          }}
        >
          تحليل الربحية المنسوبة للـ (POAS & Profitability)
        </button>
      </div>

      {/* Tab 1: Ad-Product Mappings */}
      {activeTab === "mappings" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(15, 23, 42, 0.6)", padding: "8px 14px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)", width: "320px" }}>
              <Search size={16} style={{ color: "var(--muted)" }} />
              <input
                type="text"
                placeholder="البحث بالإعلان أو اسم المنتج..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: "none", border: "none", color: "#fff", fontSize: "13px", outline: "none", width: "100%" }}
              />
            </div>

            <button onClick={() => setIsMapModalOpen(true)} className="btn primary-btn" style={{ gap: "6px", fontSize: "13px" }}>
              <Plus size={16} /> ربط إعلان بمنتج جديد
            </button>
          </div>

          <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ padding: "12px 16px", color: "var(--muted)" }}>اسم الإعلان / المعرّف</th>
                  <th style={{ padding: "12px 16px", color: "var(--muted)" }}>الحملة والـ Account</th>
                  <th style={{ padding: "12px 16px", color: "var(--muted)" }}>المنتج المربوط</th>
                  <th style={{ padding: "12px 16px", color: "var(--muted)" }}>الأولوية (Priority)</th>
                  <th style={{ padding: "12px 16px", color: "var(--muted)" }}>المصدر</th>
                  <th style={{ padding: "12px 16px", color: "var(--muted)" }}>مؤشرات CTWA</th>
                </tr>
              </thead>
              <tbody>
                {filteredMappings.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                      لا توجد عمليات ربط مسجلة بعد.
                    </td>
                  </tr>
                ) : (
                  filteredMappings.map((m) => (
                    <tr key={m.mapping.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#fff" }}>
                        <div>{m.ad_name}</div>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>{m.mapping.ad_id}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--fg)", fontSize: "13px" }}>
                        <div>{m.campaign_name}</div>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>{m.account_name}</span>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#38bdf8" }}>
                        {m.product?.name_ar || "منتج غير معروف"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", background: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc" }}>
                          أولوية #{m.mapping.priority || 1}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "12px" }}>
                        {m.mapping.mapping_source || "يدوي"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: "11px", color: "#34d399", background: "rgba(16,185,129,0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                          متوفر
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Profitability Breakdown */}
      {activeTab === "profitability" && (
        <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>الحملة الإعلانية / الحساب</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>الطلبات المؤكدة (Pipeline)</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>الطلبات المُستلمة (Delivered)</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>إيراد التوصيل الفعلي</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>COGS + الشحن الفعلي</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>الربح الإجمالي (Gross Profit)</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>صرف Meta</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>ربح المساهمة (Contribution Profit)</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>عائد الربح (POAS)</th>
              </tr>
            </thead>
            <tbody>
              {profitability.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                    لا توجد بيانات ربحية منسوبة للنطاق الزمني المحدد.
                  </td>
                </tr>
              ) : (
                profitability.map((prof) => (
                  <tr key={prof.campaignId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#fff" }}>
                      <div>{prof.campaignName}</div>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>{prof.accountName}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#60a5fa" }}>
                      {prof.confirmedOrders} طلبات ({formatILS(prof.confirmedValue)})
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#34d399" }}>
                      {prof.deliveredOrders} طلبات
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#10b981" }}>
                      {formatILS(prof.deliveredRevenue)}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted)" }}>
                      {formatILS(prof.cogs + prof.actualShippingCost)}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: prof.grossProfit >= 0 ? "#a7f3d0" : "#f87171" }}>
                      {formatILS(prof.grossProfit)}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#f43f5e" }}>
                      {formatUSD(prof.metaSpend)}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 800, color: prof.contributionProfit >= 0 ? "#6ee7b7" : "#fda4af" }}>
                      {formatILS(prof.contributionProfit)}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 800 }}>
                      {prof.poas !== null ? `${prof.poas.toFixed(2)}x` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Map Modal */}
      {isMapModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", display: "grid", placeItems: "center", padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "480px", background: "#0f172a", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255,255,255,0.15)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "16px" }}>ربط إعلان Meta بمنتج في الكتالوج</h3>
            <form onSubmit={handleCreateMapping} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>معرّف الإعلان (Meta Ad ID) *</label>
                <input type="text" required value={adIdInput} onChange={(e) => setAdIdInput(e.target.value)} placeholder="مثال: ad_123456789" style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", direction: "ltr" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>معرّف المنتج (Product ID) *</label>
                <input type="text" required value={productIdInput} onChange={(e) => setProductIdInput(e.target.value)} placeholder="أدخل معرّف المنتج..." style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", direction: "ltr" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>الأولوية (Priority - للإعلانات الدوارة/Carousel)</label>
                <input type="number" value={priorityInput} onChange={(e) => setPriorityInput(Number(e.target.value))} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <button type="button" onClick={() => setIsMapModalOpen(false)} className="btn" style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>إلغاء</button>
                <button type="submit" className="btn primary-btn">تأكيد الربط</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
