"use client";

import React, { useState } from "react";
import { ChatbotNav } from "./chatbot-nav";
import { ChatbotKpiMetrics, ChatbotDailyTrend } from "@/types/chatbot";
import {
  MessageSquare,
  UserCheck,
  CheckCircle,
  Truck,
  DollarSign,
  TrendingUp,
  Award,
  Percent,
  Calendar,
  Filter
} from "lucide-react";

const formatILS = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

const formatUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function ChatbotOverviewClient({
  initialKpis,
  initialTrends,
  initialDays = 30,
  adAccounts = []
}: {
  initialKpis: ChatbotKpiMetrics;
  initialTrends: ChatbotDailyTrend[];
  initialDays?: number;
  adAccounts?: { id: string; name: string }[];
}) {
  const [days, setDays] = useState(initialDays);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");

  const kpis = initialKpis;

  return (
    <div style={{ padding: "8px 0" }}>
      <ChatbotNav subtitle="نظرة عامة على أداء ومؤشرات الشات بوت الذكي والربحية" />

      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          padding: "16px 20px",
          borderRadius: "16px",
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          marginBottom: "24px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--muted)", fontSize: "14px", fontWeight: 600 }}>
            <Calendar size={16} />
            <span>النطاق الزمني:</span>
          </div>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className="btn"
              style={{
                padding: "6px 14px",
                fontSize: "13px",
                borderRadius: "8px",
                background: days === d ? "var(--accent-glow)" : "rgba(255, 255, 255, 0.06)",
                color: days === d ? "#fff" : "var(--fg)",
                border: "none",
                fontWeight: days === d ? 700 : 500
              }}
            >
              آخر {d} يوم
            </button>
          ))}
        </div>

        {adAccounts.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={16} style={{ color: "var(--muted)" }} />
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#0f172a",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                fontSize: "13px"
              }}
            >
              <option value="all">جميع الحسابات الإعلانية</option>
              {adAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "32px"
        }}
      >
        <KpiCard
          title="محادثات البوت المفتوحة"
          value={kpis.openBotConversations}
          icon={MessageSquare}
          color="#818cf8"
          subtitle="محادثات نشطة بالرد الآلي"
        />
        <KpiCard
          title="بانتظار التدخل البشري"
          value={kpis.waitingHandoffs}
          icon={UserCheck}
          color="#f59e0b"
          subtitle="محادثات محولة للموظف"
        />
        <KpiCard
          title="الطلبات المؤكدة"
          value={kpis.confirmedOrders}
          icon={CheckCircle}
          color="#38bdf8"
          subtitle="طلبات في مرحلة التأكيد"
        />
        <KpiCard
          title="الطلبات المُستلمة"
          value={kpis.deliveredOrders}
          icon={Truck}
          color="#34d399"
          subtitle="طلبات تم تسليمها بنجاح"
        />
        <KpiCard
          title="إيرادات الطلبات المُستلمة"
          value={formatILS(kpis.deliveredRevenue)}
          icon={DollarSign}
          color="#10b981"
          subtitle="الإيراد الفعلي (المُستلم فقط)"
          isHighlight
        />
        <KpiCard
          title="الربح الإجمالي (Gross Profit)"
          value={formatILS(kpis.grossProfit)}
          icon={TrendingUp}
          color="#a7f3d0"
          subtitle="الربح بعد خصم التكلفة والشحن"
        />
        <KpiCard
          title="إنفاق إعلانات Meta"
          value={formatUSD(kpis.metaSpend)}
          icon={Award}
          color="#f43f5e"
          subtitle="مجموع الصرف الإعلاني المنسوب"
        />
        <KpiCard
          title="ربح المساهمة (Contribution Profit)"
          value={formatILS(kpis.contributionProfit)}
          icon={TrendingUp}
          color={kpis.contributionProfit >= 0 ? "#6ee7b7" : "#fda4af"}
          subtitle="الربح الإجمالي - صرف Meta"
          isHighlight
        />
        <KpiCard
          title="معدل التحويل (مؤكدة)"
          value={`${kpis.conversionConfirmedPct}%`}
          icon={Percent}
          color="#c084fc"
          subtitle="نسبة المحادثات إلى طلبات مؤكدة"
        />
        <KpiCard
          title="معدل التحويل (مُستلمة)"
          value={`${kpis.conversionDeliveredPct}%`}
          icon={Percent}
          color="#e879f9"
          subtitle="نسبة المحادثات إلى طلبات مُستلمة"
        />
      </div>

      {/* Daily Trends Section */}
      <div
        style={{
          padding: "24px",
          borderRadius: "16px",
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}
      >
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--fg)", marginBottom: "16px" }}>
          اتجاه المحادثات والطلبات اليومي (آخر {days} يوم)
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {initialTrends.map((trend) => {
            const maxVal = Math.max(...initialTrends.map((t) => t.conversations || 1));
            const barWidth = Math.min(100, Math.max(5, (trend.conversations / maxVal) * 100));

            return (
              <div key={trend.date} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ width: "90px", fontSize: "12px", color: "var(--muted)", direction: "ltr" }}>
                  {trend.date}
                </span>
                <div style={{ flex: 1, background: "rgba(255, 255, 255, 0.05)", height: "24px", borderRadius: "6px", overflow: "hidden", display: "flex", alignItems: "center", position: "relative" }}>
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #6366f1, #818cf8)",
                      borderRadius: "6px",
                      transition: "width 0.3s ease"
                    }}
                  />
                  <span style={{ position: "absolute", right: "12px", fontSize: "11px", fontWeight: 600, color: "#fff" }}>
                    {trend.conversations} محادثات / {trend.orders} طلبات ({formatILS(trend.deliveredRevenue)})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  isHighlight = false
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  isHighlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "16px",
        background: isHighlight ? "rgba(30, 41, 59, 0.8)" : "rgba(15, 23, 42, 0.6)",
        border: isHighlight ? `1px solid ${color}` : "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: isHighlight ? `0 4px 20px ${color}22` : "none"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>{title}</span>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${color}18`, display: "grid", placeItems: "center", color }}>
          <Icon size={18} />
        </div>
      </div>

      <div>
        <div style={{ fontSize: "24px", fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
