"use client";

import { Sparkles, Image as ImageIcon, Layers, CheckCircle2 } from "lucide-react";
import type { ImageAgentUsage } from "@/types/image-agent";

interface SummaryCardsProps {
  usage: ImageAgentUsage | null;
  loading: boolean;
}

export function SummaryCards({ usage, loading }: SummaryCardsProps) {
  const totalLimit = usage?.totalLimit ?? 20;
  const usedCount = usage?.usedCount ?? 0;
  const remainingCount = usage?.remainingCount ?? (totalLimit - usedCount);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
      {/* Card 1: Total Trial Balance */}
      <div 
        className="card-container"
        style={{
          background: "var(--surface-soft)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "var(--shadow)"
        }}
      >
        <div 
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(59, 130, 246, 0.12)",
            color: "#60a5fa",
            display: "grid",
            placeItems: "center"
          }}
        >
          <Sparkles size={24} />
        </div>
        <div>
          <span style={{ fontSize: "13px", color: "var(--muted)", display: "block" }}>
            إجمالي الرصيد التجريبي
          </span>
          <strong style={{ fontSize: "24px", fontWeight: "700", color: "var(--foreground)" }}>
            {loading ? "..." : totalLimit}
          </strong>
        </div>
      </div>

      {/* Card 2: Used Images */}
      <div 
        className="card-container"
        style={{
          background: "var(--surface-soft)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "var(--shadow)"
        }}
      >
        <div 
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(245, 158, 11, 0.12)",
            color: "#f59e0b",
            display: "grid",
            placeItems: "center"
          }}
        >
          <Layers size={24} />
        </div>
        <div>
          <span style={{ fontSize: "13px", color: "var(--muted)", display: "block" }}>
            الصور المستخدمة
          </span>
          <strong style={{ fontSize: "24px", fontWeight: "700", color: "var(--foreground)" }}>
            {loading ? "..." : usedCount}
          </strong>
        </div>
      </div>

      {/* Card 3: Remaining Images */}
      <div 
        className="card-container"
        style={{
          background: "var(--surface-soft)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "var(--shadow)"
        }}
      >
        <div 
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(16, 185, 129, 0.12)",
            color: "#10b981",
            display: "grid",
            placeItems: "center"
          }}
        >
          <CheckCircle2 size={24} />
        </div>
        <div>
          <span style={{ fontSize: "13px", color: "var(--muted)", display: "block" }}>
            الصور المتبقية
          </span>
          <strong style={{ fontSize: "24px", fontWeight: "700", color: "var(--foreground)" }}>
            {loading ? "..." : remainingCount}
          </strong>
        </div>
      </div>
    </div>
  );
}
