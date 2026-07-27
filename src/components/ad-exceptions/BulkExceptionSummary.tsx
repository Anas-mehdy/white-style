"use client";

import { AlertCircle, Info, RefreshCw, SkipForward } from "lucide-react";
import type { AdSummary } from "@/types/ad-exceptions";

interface BulkExceptionSummaryProps {
  selectedAds: AdSummary[];
  duplicateAction: "skip" | "update";
  setDuplicateAction: (action: "skip" | "update") => void;
}

export function BulkExceptionSummary({
  selectedAds,
  duplicateAction,
  setDuplicateAction,
}: BulkExceptionSummaryProps) {
  const existingCount = selectedAds.filter((a) => Boolean(a.existing_exception)).length;
  const newCount = selectedAds.length - existingCount;

  if (selectedAds.length <= 1 || existingCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--amber-soft)",
        border: "1px solid var(--amber)",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        fontSize: "12.5px",
        color: "var(--foreground)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--amber)" }}>
        <AlertCircle size={16} />
        <strong style={{ fontSize: "13px" }}>تحليل الاستثناءات القائمة</strong>
      </div>

      <div style={{ color: "var(--muted)", lineHeight: "1.5" }}>
        يوجد <strong>{selectedAds.length}</strong> إعلانات مختارة:{" "}
        <strong style={{ color: "var(--green-dark)" }}>{newCount}</strong> سيتم إنشاء استثناءات جديدة لها، و{" "}
        <strong style={{ color: "var(--amber)" }}>{existingCount}</strong> لديها استثناءات مسجلة مسبقاً.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "4px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            padding: "6px 10px",
            background: duplicateAction === "skip" ? "var(--surface)" : "transparent",
            borderRadius: "6px",
            border: `1px solid ${duplicateAction === "skip" ? "var(--amber)" : "transparent"}`,
          }}
        >
          <input
            type="radio"
            name="duplicateAction"
            value="skip"
            checked={duplicateAction === "skip"}
            onChange={() => setDuplicateAction("skip")}
          />
          <SkipForward size={14} style={{ color: "var(--amber)" }} />
          <span>
            <strong>تخطي الإعلانات التي لديها استثناء</strong> (إنشاء السجلات الجديدة فقط دون المساس بالقائمة)
          </span>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            padding: "6px 10px",
            background: duplicateAction === "update" ? "var(--surface)" : "transparent",
            borderRadius: "6px",
            border: `1px solid ${duplicateAction === "update" ? "var(--amber)" : "transparent"}`,
          }}
        >
          <input
            type="radio"
            name="duplicateAction"
            value="update"
            checked={duplicateAction === "update"}
            onChange={() => setDuplicateAction("update")}
          />
          <RefreshCw size={14} style={{ color: "var(--blue)" }} />
          <span>
            <strong>تحديث الاستثناءات الموجودة</strong> (تحديث الإعلانات الحالية بالإضافة لإنشاء السجلات الجديدة)
          </span>
        </label>
      </div>
    </div>
  );
}
