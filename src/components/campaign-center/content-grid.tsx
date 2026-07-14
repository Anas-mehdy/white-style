"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { ContentLibraryItem } from "./types";
import { ContentCard } from "./content-card";

interface ContentGridProps {
  items: ContentLibraryItem[];
  isLoading: boolean;
  onSelectForCampaign: (item: ContentLibraryItem) => void;
  onShowDetails: (item: ContentLibraryItem) => void;
  onShowAIEditor: (item: ContentLibraryItem) => void;
  onSyncTrigger: () => void;
  isSyncing: boolean;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  onPageChange: (newOffset: number) => void;
}

export function ContentGrid({
  items,
  isLoading,
  onSelectForCampaign,
  onShowDetails,
  onShowAIEditor,
  onSyncTrigger,
  isSyncing,
  pagination,
  onPageChange,
}: ContentGridProps) {
  
  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", width: "100%" }}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="panel animate-pulse"
            style={{ height: "420px", display: "flex", flexDirection: "column", padding: 0 }}
          >
            <div style={{ width: "100%", height: "180px", background: "rgba(255,255,255,0.03)" }} />
            <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ height: "14px", width: "60%", background: "rgba(255,255,255,0.03)", borderRadius: "4px" }} />
              <div style={{ height: "40px", width: "100%", background: "rgba(255,255,255,0.03)", borderRadius: "4px" }} />
              <div style={{ height: "14px", width: "40%", background: "rgba(255,255,255,0.03)", borderRadius: "4px", marginTop: "auto" }} />
              <div style={{ height: "38px", width: "100%", background: "rgba(255,255,255,0.03)", borderRadius: "4px" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="panel"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
          textAlign: "center",
          gap: "16px",
          background: "var(--surface)",
          border: "1px dashed var(--border)",
        }}
      >
        <AlertCircle size={48} style={{ color: "var(--muted)" }} />
        <h3 style={{ fontSize: "18px", fontWeight: "600" }}>لا يوجد محتوى متزامن بعد</h3>
        <p style={{ color: "var(--muted)", fontSize: "14px", maxWidth: "400px", lineHeight: "1.6" }}>
          اضغط تحديث المحتوى لجلب منشورات Instagram وFacebook ومقاطع الـ Reels الخاصة بك للمزامنة التلقائية.
        </p>
        <button
          onClick={onSyncTrigger}
          disabled={isSyncing}
          className="sync-button"
          style={{
            background: "var(--brand-gradient)",
            color: "white",
            border: 0,
            padding: "10px 24px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: isSyncing ? "wait" : "pointer"
          }}
        >
          <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} style={{ marginLeft: "6px" }} />
          {isSyncing ? "جاري مزامنة المحتوى..." : "تحديث المحتوى"}
        </button>
      </div>
    );
  }

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            onSelectForCampaign={onSelectForCampaign}
            onShowDetails={onShowDetails}
            onShowAIEditor={onShowAIEditor}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "12px" }}>
          <button
            disabled={pagination.offset === 0}
            onClick={() => onPageChange(pagination.offset - pagination.limit)}
            className="sync-button"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              background: "rgba(255,255,255,0.03)",
              borderColor: "var(--border)",
              cursor: pagination.offset === 0 ? "not-allowed" : "pointer"
            }}
          >
            السابق
          </button>
          
          <span style={{ fontSize: "13px", color: "var(--muted)" }}>
            صفحة {currentPage} من {totalPages} (إجمالي {pagination.total})
          </span>

          <button
            disabled={pagination.offset + pagination.limit >= pagination.total}
            onClick={() => onPageChange(pagination.offset + pagination.limit)}
            className="sync-button"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              background: "rgba(255,255,255,0.03)",
              borderColor: "var(--border)",
              cursor: pagination.offset + pagination.limit >= pagination.total ? "not-allowed" : "pointer"
            }}
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
