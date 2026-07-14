"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

interface ContentToolbarProps {
  onSearch: (term: string) => void;
  onFilterChange: (filters: {
    platform: string;
    contentType: string;
    status: string;
  }) => void;
  onSortChange: (sort: string) => void;
  isLoading: boolean;
}

export function ContentToolbar({
  onSearch,
  onFilterChange,
  onSortChange,
  isLoading,
}: ContentToolbarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activePlatform, setActivePlatform] = useState("all"); // all, instagram, facebook
  const [activeType, setActiveType] = useState("all"); // all, post, reel, video, carousel
  const [activeStatus, setActiveStatus] = useState("all"); // all, promoted, unpromoted
  const [activeSort, setActiveSort] = useState("newest"); // newest, oldest, engagement

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handlePlatformChange = (platform: string) => {
    setActivePlatform(platform);
    onFilterChange({ platform, contentType: activeType, status: activeStatus });
  };

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    onFilterChange({ platform: activePlatform, contentType: type, status: activeStatus });
  };

  const handleStatusChange = (status: string) => {
    setActiveStatus(status);
    onFilterChange({ platform: activePlatform, contentType: activeType, status });
  };

  const handleSortChange = (sort: string) => {
    setActiveSort(sort);
    onSortChange(sort);
  };

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px", marginBottom: "20px" }}>
      {/* Search and Sort row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", alignItems: "center" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", flex: 1, minWidth: "260px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              placeholder="البحث في شرح المنشور..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              style={{ width: "100%", paddingLeft: "12px", paddingRight: "40px", height: "40px" }}
            />
            <Search
              size={18}
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="sync-button"
            style={{ height: "40px", padding: "0 16px", background: "var(--border)", border: "1px solid var(--border)" }}
          >
            بحث
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "var(--muted)" }}>ترتيب حسب:</span>
          <select
            value={activeSort}
            onChange={(e) => handleSortChange(e.target.value)}
            disabled={isLoading}
            style={{ height: "40px", width: "150px" }}
          >
            <option value="newest">الأحدث</option>
            <option value="oldest">الأقدم</option>
            <option value="engagement">الأكثر تفاعلًا</option>
          </select>
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
        {/* Platform Filter */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: "600" }}>المنصة</span>
          <div className="tabs" style={{ display: "inline-flex", background: "rgba(255,255,255,0.03)", padding: "2px", borderRadius: "8px", border: "1px solid var(--border)" }}>
            {[
              { id: "all", label: "الكل" },
              { id: "instagram", label: "Instagram" },
              { id: "facebook", label: "Facebook" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={isLoading}
                onClick={() => handlePlatformChange(p.id)}
                className={`tab ${activePlatform === p.id ? "active" : ""}`}
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  border: 0,
                  borderRadius: "6px",
                  background: activePlatform === p.id ? "var(--surface)" : "transparent",
                  color: activePlatform === p.id ? "var(--foreground)" : "var(--muted)",
                  cursor: isLoading ? "wait" : "pointer"
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Type Filter */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: "600" }}>نوع المحتوى</span>
          <div className="tabs" style={{ display: "inline-flex", background: "rgba(255,255,255,0.03)", padding: "2px", borderRadius: "8px", border: "1px solid var(--border)" }}>
            {[
              { id: "all", label: "الكل" },
              { id: "post", label: "منشور" },
              { id: "reel", label: "Reel" },
              { id: "video", label: "فيديو" },
              { id: "carousel", label: "Carousel" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={isLoading}
                onClick={() => handleTypeChange(t.id)}
                className={`tab ${activeType === t.id ? "active" : ""}`}
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  border: 0,
                  borderRadius: "6px",
                  background: activeType === t.id ? "var(--surface)" : "transparent",
                  color: activeType === t.id ? "var(--foreground)" : "var(--muted)",
                  cursor: isLoading ? "wait" : "pointer"
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Promotion Status Filter */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: "600" }}>حالة الترويج</span>
          <div className="tabs" style={{ display: "inline-flex", background: "rgba(255,255,255,0.03)", padding: "2px", borderRadius: "8px", border: "1px solid var(--border)" }}>
            {[
              { id: "all", label: "الكل" },
              { id: "promoted", label: "تم الترويج له" },
              { id: "unpromoted", label: "لم يتم الترويج له" },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={isLoading}
                onClick={() => handleStatusChange(s.id)}
                className={`tab ${activeStatus === s.id ? "active" : ""}`}
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  border: 0,
                  borderRadius: "6px",
                  background: activeStatus === s.id ? "var(--surface)" : "transparent",
                  color: activeStatus === s.id ? "var(--foreground)" : "var(--muted)",
                  cursor: isLoading ? "wait" : "pointer"
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
