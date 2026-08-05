"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChatbotNav } from "./chatbot-nav";
import { ChatbotOrder, ChatbotOrderItem, OrderStatus } from "@/types/chatbot";
import { ToastContainer, Toast, EmptyState } from "./ui";
import {
  ShoppingBag,
  Columns,
  List,
  Filter,
  CheckCircle2,
  Truck,
  XCircle,
  RotateCcw,
  Clock,
  ChevronRight,
  ExternalLink
} from "lucide-react";

const formatILS = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "مسودة (Draft)", color: "#94a3b8", icon: Clock },
  collecting: { label: "جاري التجميع", color: "#60a5fa", icon: Clock },
  awaiting_confirmation: { label: "بانتظار التأكيد", color: "#f59e0b", icon: Clock },
  confirmed: { label: "مؤكد", color: "#38bdf8", icon: CheckCircle2 },
  shipped: { label: "تم الشحن", color: "#a7f3d0", icon: Truck },
  delivered: { label: "مُستلم", color: "#34d399", icon: CheckCircle2 },
  cancelled: { label: "ملغى", color: "#f87171", icon: XCircle },
  returned: { label: "مرجع", color: "#c084fc", icon: RotateCcw }
};

export function ChatbotOrdersClient({
  initialOrders = [],
  initialItems = []
}: {
  initialOrders: ChatbotOrder[];
  initialItems: ChatbotOrderItem[];
}) {
  const [orders, setOrders] = useState<ChatbotOrder[]>(initialOrders);
  const [items] = useState<ChatbotOrderItem[]>(initialItems);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const handleQuickStatusChange = async (order: ChatbotOrder, newStatus: string) => {
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

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = !search || 
      o.id.toLowerCase().includes(search.toLowerCase()) || 
      ((o as any).customer_name && (o as any).customer_name.includes(search)) || 
      ((o as any).customer_phone && (o as any).customer_phone.includes(search)) ||
      ((o as any).wa_phone && (o as any).wa_phone.includes(search));
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusesKeys: OrderStatus[] = [
    "draft",
    "collecting",
    "awaiting_confirmation",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
    "returned"
  ];

  return (
    <div style={{ padding: "8px 0" }}>
      <ToastContainer toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      <ChatbotNav subtitle="متابعة مسار الطلبات وحالاتها والتكاليف المنسوبة" />

      {/* Controls Bar */}
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
          <input
            type="text"
            placeholder="البحث برقم الطلب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#fff",
              fontSize: "14px",
              flex: 1
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "#0f172a",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              fontSize: "14px"
            }}
          >
            <option value="all">جميع الحالات</option>
            {statusesKeys.map((s) => (
              <option key={s} value={s}>
                {statusConfig[s]?.label || s}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.6)", padding: "4px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <button
            onClick={() => setViewMode("kanban")}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              background: viewMode === "kanban" ? "var(--accent-glow)" : "transparent",
              color: viewMode === "kanban" ? "#fff" : "var(--muted)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px"
            }}
          >
            <Columns size={16} /> كانبان
          </button>
          <button
            onClick={() => setViewMode("table")}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              background: viewMode === "table" ? "var(--accent-glow)" : "transparent",
              color: viewMode === "table" ? "#fff" : "var(--muted)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px"
            }}
          >
            <List size={16} /> جدول
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            alignItems: "start",
            overflowX: "auto"
          }}
        >
          {statusesKeys.map((st) => {
            const stOrders = filteredOrders.filter((o) => o.status === st);
            const cfg = statusConfig[st] || { label: st, color: "#fff", icon: Clock };
            const Icon = cfg.icon;

            return (
              <div
                key={st}
                style={{
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  minHeight: "400px"
                }}
              >
                {/* Column Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cfg.color }} />
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>{cfg.label}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: "10px", color: "var(--muted)" }}>
                    {stOrders.length}
                  </span>
                </div>

                {/* Cards */}
                {stOrders.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>
                    لا توجد طلبات في هذه الحالة
                  </div>
                ) : (
                  stOrders.map((order) => {
                    const orderItems = items.filter((i) => i.order_id === order.id);
                    const nextCfg = getNextStatusConfig(order.status);

                    return (
                      <div
                        key={order.id}
                        style={{
                          background: "rgba(30, 41, 59, 0.7)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "12px",
                          padding: "14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#a5b4fc" }}>
                            #{order.id.substring(0, 8)}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {new Date(order.created_at).toLocaleDateString("ar-EG")}
                          </span>
                        </div>

                        {/* Customer Name, WhatsApp Phone & Delivery Phone */}
                        <div style={{ fontSize: "12px", color: "#60a5fa", fontWeight: 600, display: "flex", flexDirection: "column", gap: "4px", background: "rgba(15, 23, 42, 0.6)", padding: "8px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>👤</span>
                            <span style={{ color: "#fff", fontWeight: 700 }}>{(order as any).customer_name || "زبون بدون اسم"}</span>
                          </div>

                          {(order as any).wa_phone && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#38bdf8", fontSize: "11px" }}>
                              <span>💬 واتساب:</span>
                              <span style={{ direction: "ltr", fontWeight: 700 }}>{(order as any).wa_phone}</span>
                            </div>
                          )}

                          {(order as any).customer_phone && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#a7f3d0", fontSize: "11px" }}>
                              <span>📞 للتثبيت:</span>
                              <span style={{ direction: "ltr", fontWeight: 700 }}>{(order as any).customer_phone}</span>
                            </div>
                          )}
                        </div>

                        <div style={{ fontSize: "13px", color: "#fff", fontWeight: 600 }}>
                          {orderItems.length ? `${orderItems.length} منتج (${orderItems[0].product_name_snapshot || "—"})` : "طلب بدون أصناف"}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "10px", color: "var(--muted)" }}>المجموع</span>
                            <span style={{ fontSize: "14px", fontWeight: 800, color: "#10b981" }}>
                              {formatILS(Number(order.total ?? 0))}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {nextCfg && (
                              <button
                                onClick={() => handleQuickStatusChange(order, nextCfg.nextStatus)}
                                disabled={isUpdating}
                                className="btn"
                                style={{ background: "rgba(56, 189, 248, 0.15)", color: nextCfg.color, border: "1px solid rgba(56, 189, 248, 0.3)", fontSize: "11px", padding: "5px 8px", flex: 1 }}
                              >
                                {nextCfg.label}
                              </button>
                            )}

                            <Link
                              href={`/chatbot/orders/${order.id}`}
                              className="btn"
                              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "none", fontSize: "11px", padding: "5px 10px" }}
                            >
                              التفاصيل
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>رقم الطلب</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>الحالة</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>المجموع الفرعي</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>رسوم الشحن للزبون</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>التكلفة الفعليه للشحن</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>المجموع الإجمالي</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>الربح الإجمالي</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>التاريخ</th>
                <th style={{ padding: "12px 16px", color: "var(--muted)" }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>
                    لا توجد طلبات مسجلة بهذه الفلاتر.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const cfg = statusConfig[order.status] || { label: order.status, color: "#fff" };

                  return (
                    <tr key={order.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#a5b4fc" }}>
                        #{order.id.substring(0, 8)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", background: `${cfg.color}20`, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--fg)" }}>{formatILS(Number(order.subtotal ?? 0))}</td>
                      <td style={{ padding: "12px 16px", color: "var(--fg)" }}>{formatILS(Number(order.shipping_fee ?? 0))}</td>
                      <td style={{ padding: "12px 16px", color: "var(--muted)" }}>
                        {order.actual_shipping_cost ? formatILS(Number(order.actual_shipping_cost)) : "غير مدخل"}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#10b981" }}>{formatILS(Number(order.total ?? 0))}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: Number(order.gross_profit ?? 0) >= 0 ? "#34d399" : "#f87171" }}>
                        {formatILS(Number(order.gross_profit ?? 0))}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "12px" }}>
                        {new Date(order.created_at).toLocaleDateString("ar-EG")}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Link href={`/chatbot/orders/${order.id}`} className="btn" style={{ background: "rgba(255,255,255,0.08)", color: "#fff", padding: "4px 10px", fontSize: "12px" }}>
                          التفاصيل
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
