"use client";

import { RefreshCw } from "lucide-react";

interface ContentSyncButtonProps {
  onSync: () => void;
  isSyncing: boolean;
  lastSyncTime: string | null;
}

export function ContentSyncButton({ onSync, isSyncing, lastSyncTime }: ContentSyncButtonProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
      <button
        onClick={onSync}
        disabled={isSyncing}
        className="sync-button"
        style={{
          background: "var(--brand-gradient)",
          color: "white",
          border: 0,
          padding: "8px 18px",
          fontSize: "13px",
          fontWeight: "600",
          cursor: isSyncing ? "wait" : "pointer"
        }}
      >
        <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} style={{ marginLeft: "6px" }} />
        {isSyncing ? "جاري التحديث..." : "تحديث المحتوى"}
      </button>
      {lastSyncTime && (
        <span style={{ fontSize: "11px", color: "var(--green)" }}>
          آخر مزامنة ناجحة: {lastSyncTime}
        </span>
      )}
    </div>
  );
}
