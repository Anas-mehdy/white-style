"use client";

import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import type { AdPauseExceptionMode } from "@/types/ad-exceptions";

interface AdExceptionBadgeProps {
  mode: AdPauseExceptionMode;
  customLimit?: number | null;
  showTooltip?: boolean;
}

export function AdExceptionBadge({ mode, customLimit, showTooltip = true }: AdExceptionBadgeProps) {
  const tooltipText = "هذا الاستثناء يمنع أو يتحكم بإيقاف المجموعة الإعلانية التابعة لهذا الإعلان.";

  if (mode === "never_pause") {
    return (
      <span 
        className="badge badge--success" 
        title={showTooltip ? tooltipText : undefined}
        style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
      >
        <ShieldCheck size={13} />
        <span>عدم الإيقاف نهائيًا</span>
      </span>
    );
  }

  const formattedLimit = customLimit ? `$${Number(customLimit).toFixed(2)}` : "—";

  return (
    <span 
      className="badge badge--info" 
      title={showTooltip ? tooltipText : undefined}
      style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
    >
      <Shield size={13} />
      <span>حد مخصص ({formattedLimit})</span>
    </span>
  );
}

export function AdExceptionStatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="badge badge--success" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" }}></span>
        <span>فعال</span>
      </span>
    );
  }

  return (
    <span className="badge badge--neutral" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" }}></span>
      <span>معطل</span>
    </span>
  );
}
