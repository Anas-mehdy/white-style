"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChatbotNav } from "./chatbot-nav";
import { OrderDetailViewModel } from "@/types/chatbot";
import { ToastContainer, Toast } from "./ui";
import {
  ArrowRight,
  ShoppingBag,
  User,
  DollarSign,
  Link2,
  Clock,
  MessageSquare
} from "lucide-react";

const formatILS = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

export function ChatbotOrderDetailClient({ initialData }: { initialData: OrderDetailViewModel }) {
  const { order, customer, items, shippingZone, attribution, events, conversation } = initialData;

  const [isUpdating, setIsUpdating] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const getNextStatusConfig = (currentStatus: string) => {
    switch (currentStatus) {
      case "draft":
      case "collecting":
      case "awaiting_confirmation":
        return { nextStatus: "confirmed", label: "تأكيد الطلب ونقله لمؤكد", color: "#38bdf8" };
      case "confirmed":
        return { nextStatus: "shipped", label: "تعيين الطلب إلى تم الشحن", color: "#a7f3d0" };
      case "shipped":
        return { nextStatus: "delivered", label: "تعيين الطلب إلى مُستلم", color: "#34d399" };
      default:
        return null;
    }
  };

  const nextCfg = getNextStatusConfig(order.status);

  const handleQuickStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    const idempotencyKey = `evt_${order.id}_${Date.now()}`;

    try {
      const res = await fetch("/api/chatbot/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          newStatus,
          idempotencyKey
        })
      });

      const data = await res.json();
      if (data.success) {
        addToast("success", data.message || "تم تحديث حالة الطلب بنجاح");
        window.location.reload();
      } else {
        addToast("error", data.message || "تعذر تغيير حالة الطلب");
      }
    } catch (err: unknown) {
      addToast("error", "حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ padding: "8px 0" }}>
      <ToastContainer toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      <ChatbotNav subtitle={`تفاصيل الطلب #${order.id.substring(0, 8)}`} />

      {/* Back Button */}
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/chatbot/orders"
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
          <ArrowRight size={14} /> العودة لمسار الطلبات
        </Link>

        {/* Top Order Summary Card */}
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
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: "6px",
                  background: order.status === "delivered" ? "rgba(16, 185, 129, 0.2)" : "rgba(99, 102, 241, 0.2)",
                  color: order.status === "delivered" ? "#34d399" : "#a5b4fc"
                }}
              >
                حالة الطلب: {order.status}
              </span>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                تاريخ الإنشاء: {new Date(order.created_at).toLocaleString("ar-EG")}
              </span>
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: 0 }}>
              طلب رقم #{order.id}
            </h2>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {nextCfg && (
              <button
                onClick={() => handleQuickStatusChange(nextCfg.nextStatus)}
                disabled={isUpdating}
                className="btn"
                style={{
                  background: "rgba(56, 189, 248, 0.2)",
                  color: nextCfg.color,
                  border: "1px solid rgba(56, 189, 248, 0.4)",
                  fontSize: "13px",
                  padding: "8px 16px"
                }}
              >
                {nextCfg.label}
              </button>
            )}

            {conversation && (
              <Link
                href={`/chatbot/inbox?conversationId=${conversation.id}`}
                className="btn primary-btn"
                style={{ gap: "8px", fontSize: "13px" }}
              >
                <MessageSquare size={16} /> الذهاب للمحادثة المرتطبة
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Grid Layout: Financial & Items Left / Customer Right */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        
        {/* Left Column: Items Snapshot & Financial breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Items Table */}
          <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShoppingBag size={18} style={{ color: "var(--accent-glow)" }} /> الأصناف المطلوبة
            </h3>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--muted)" }}>
                    <th style={{ padding: "8px" }}>المنتج</th>
                    <th style={{ padding: "8px" }}>SKU</th>
                    <th style={{ padding: "8px" }}>الكمية</th>
                    <th style={{ padding: "8px" }}>سعر الوحدة</th>
                    <th style={{ padding: "8px" }}>المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "var(--muted)" }}>
                        لا توجد أصناف في هذا الطلب.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "10px 8px", color: "#fff", fontWeight: 600 }}>{item.product_name_snapshot || "صنف بدون اسم"}</td>
                        <td style={{ padding: "10px 8px", color: "var(--muted)" }}>{item.sku_snapshot || "—"}</td>
                        <td style={{ padding: "10px 8px", color: "#fff" }}>{item.quantity}</td>
                        <td style={{ padding: "10px 8px", color: "#10b981" }}>{formatILS(Number(item.unit_price ?? 0))}</td>
                        <td style={{ padding: "10px 8px", color: "#10b981", fontWeight: 700 }}>
                          {formatILS(Number(item.unit_price ?? 0) * item.quantity)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <DollarSign size={18} style={{ color: "#34d399" }} /> إجمالي التكلفة والحساب
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--fg)" }}>
                <span>المجموع الفرعي للبضاعة (Subtotal):</span>
                <span>{formatILS(Number(order.subtotal ?? 0))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--fg)" }}>
                <span>رسوم التوصيل للشحن (Shipping Fee):</span>
                <span>{formatILS(Number(order.shipping_fee ?? 0))}</span>
              </div>
              <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "4px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "17px", color: "#10b981" }}>
                <span>المجموع الإجمالي للطلب:</span>
                <span>{formatILS(Number(order.total ?? 0))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Address / Attribution / Event Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Customer Details Card */}
          <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <User size={18} style={{ color: "#38bdf8" }} /> بيانات الزبون والتوصيل
            </h3>
            <div style={{ fontSize: "14px", color: "var(--fg)", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--muted)" }}>اسم الزبون:</span>
                <span style={{ fontWeight: 700, color: "#fff" }}>{(order as any).customer_name || (customer as any)?.full_name || (customer as any)?.display_name || "غير محدد"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--muted)" }}>رقم الواتساب (المحادثة):</span>
                <span style={{ fontWeight: 700, color: "#38bdf8", direction: "ltr" }}>
                  {(customer as any)?.phone_number || (customer as any)?.normalized_phone || (customer as any)?.external_key ? `+${((customer as any)?.phone_number || (customer as any)?.normalized_phone || (customer as any)?.external_key).replace(/^\+/, '')}` : "غير محدد"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--muted)" }}>رقم هاتف التثبيت/التوصيل:</span>
                <span style={{ fontWeight: 700, color: "#a7f3d0", direction: "ltr" }}>
                  {(order as any).customer_phone || "غير محدد"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--muted)" }}>العنوان الكامل:</span>
                <span style={{ fontWeight: 600, color: "#fff", maxWidth: "60%", textAlign: "left" }}>
                  {(order as any).address_line || (customer as any)?.address || order.customer_address || "غير محدد"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--muted)" }}>منطقة الشحن:</span>
                <span style={{ fontWeight: 600, color: "#fff" }}>
                  {shippingZone?.name_ar || "غير محدد"}
                </span>
              </div>

              {customer?.notes && (
                <div style={{ marginTop: "4px" }}>
                  <span style={{ color: "var(--muted)" }}>ملاحظات الزبون:</span>
                  <div style={{ marginTop: "2px", color: "#e2e8f0", fontSize: "13px" }}>{customer.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Attribution Chain Card */}
          <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Link2 size={18} style={{ color: "#c084fc" }} /> سلسلة النسبة الإعلانية (Attribution Chain)
            </h3>
            <div style={{ fontSize: "13px", color: "var(--fg)", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div><strong>الإعلان:</strong> {attribution?.ad_id || order.ad_id || "مباشر / غير منسوب"}</div>
              <div><strong>معرّف CTWA:</strong> {attribution?.ctwa_clid || "—"}</div>
              <div><strong>مصدر المزامنة:</strong> {attribution?.source_id || "—"}</div>
            </div>
          </div>

          {/* Event Timeline Card */}
          <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} style={{ color: "#f59e0b" }} /> سجل أحداث الطلب (Event Timeline)
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
              {events.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>لا توجد أحداث مسجلة في السجل.</div>
              ) : (
                events.map((evt) => (
                  <div key={evt.id} style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", borderRight: "3px solid var(--accent-glow)" }}>
                    <div style={{ fontWeight: 700, color: "#fff" }}>{evt.event_type}</div>
                    <div style={{ color: "var(--muted)", marginTop: "2px" }}>
                      من {evt.from_status || "—"} إلى {evt.to_status || "—"} | {new Date(evt.created_at).toLocaleString("ar-EG")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
