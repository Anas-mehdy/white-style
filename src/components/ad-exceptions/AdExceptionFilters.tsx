"use client";

import { RotateCcw, X } from "lucide-react";

interface AccountOption {
  id: string;
  name: string;
}

interface AdExceptionFiltersProps {
  accounts: AccountOption[];
  accountFilter: string;
  setAccountFilter: (val: string) => void;
  modeFilter: string;
  setModeFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onReset: () => void;
}

export function AdExceptionFilters({
  accounts,
  accountFilter,
  setAccountFilter,
  modeFilter,
  setModeFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  onReset,
}: AdExceptionFiltersProps) {
  return (
    <section className="compact-filters">
      {/* Search Filter */}
      <div className="filter-item filter-item--search">
        <label>البحث</label>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الإعلان أو Meta Ad ID..."
            className="filter-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: 0,
                color: "var(--muted)",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Account Filter */}
      <div className="filter-item">
        <label>الحساب الإعلاني</label>
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="filter-input"
        >
          <option value="all">جميع الحسابات</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Exception Mode Filter */}
      <div className="filter-item">
        <label>نوع الاستثناء</label>
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="filter-input"
        >
          <option value="all">الكل</option>
          <option value="never_pause">عدم الإيقاف نهائيًا</option>
          <option value="custom_limit">حد مخصص</option>
        </select>
      </div>

      {/* Active Status Filter */}
      <div className="filter-item">
        <label>الحالة</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-input"
        >
          <option value="all">الكل</option>
          <option value="active">فعال</option>
          <option value="inactive">معطل</option>
        </select>
      </div>

      {/* Reset Button */}
      <button type="button" className="reset-btn" onClick={onReset}>
        <RotateCcw size={13} />
        <span>إعادة ضبط الفلاتر</span>
      </button>
    </section>
  );
}
