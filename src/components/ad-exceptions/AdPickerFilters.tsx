"use client";

import type { AdStatusFilter, AdPeriodFilter } from "@/types/ad-exceptions";
import { Layers, List } from "lucide-react";

interface AdPickerFiltersProps {
  statusFilter: AdStatusFilter;
  setStatusFilter: (val: AdStatusFilter) => void;
  periodFilter: AdPeriodFilter;
  setPeriodFilter: (val: AdPeriodFilter) => void;
  includeInactive: boolean;
  setIncludeInactive: (val: boolean) => void;
  viewMode: "ads" | "creatives";
  setViewMode: (val: "ads" | "creatives") => void;
}

export function AdPickerFilters({
  statusFilter,
  setStatusFilter,
  periodFilter,
  setPeriodFilter,
  includeInactive,
  setIncludeInactive,
  viewMode,
  setViewMode,
}: AdPickerFiltersProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: "var(--surface-soft)",
        padding: "12px 14px",
        borderRadius: "12px",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Segmented Control for View Mode */}
        <div
          style={{
            display: "inline-flex",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "3px",
            gap: "3px",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("ads")}
            style={{
              background: viewMode === "ads" ? "var(--blue)" : "transparent",
              color: viewMode === "ads" ? "#ffffff" : "var(--muted)",
              border: 0,
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12.5px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
          >
            <List size={14} />
            <span>الإعلانات الفردية</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("creatives")}
            style={{
              background: viewMode === "creatives" ? "var(--blue)" : "transparent",
              color: viewMode === "creatives" ? "#ffffff" : "var(--muted)",
              border: 0,
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12.5px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
          >
            <Layers size={14} />
            <span>حسب المنتج / Creative</span>
          </button>
        </div>

        {/* Dropdowns Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Status Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "500" }}>الحالة:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AdStatusFilter)}
              className="filter-input"
              style={{ padding: "5px 8px", fontSize: "12px", height: "34px", minWidth: "110px" }}
            >
              <option value="active">الفعالة فقط</option>
              <option value="inactive">المتوقفة</option>
              <option value="all">جميع الحالات</option>
            </select>
          </div>

          {/* Period Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "500" }}>الفترة:</label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as AdPeriodFilter)}
              className="filter-input"
              style={{ padding: "5px 8px", fontSize: "12px", height: "34px", minWidth: "110px" }}
            >
              <option value="all">جميع الفترات</option>
              <option value="7d">آخر 7 أيام</option>
              <option value="30d">آخر 30 يومًا</option>
              <option value="90d">آخر 90 يومًا</option>
            </select>
          </div>
        </div>
      </div>

      {/* Show Inactive Toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => {
              const val = e.target.checked;
              setIncludeInactive(val);
              if (val && statusFilter === "active") {
                setStatusFilter("all");
              }
            }}
            style={{ width: "16px", height: "16px", accentColor: "var(--blue)" }}
          />
          <span style={{ fontSize: "12.5px", color: "var(--foreground)", fontWeight: "500" }}>
            إظهار الإعلانات المتوقفة والقديمة
          </span>
        </label>

        <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
          {includeInactive ? "يتم عرض الإعلانات بجميع الحالات" : "الافتراضي: عرض الإعلانات الفعالة فقط"}
        </span>
      </div>
    </div>
  );
}
