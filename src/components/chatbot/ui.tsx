"use client";

import React, { useState } from "react";
import { AlertTriangle, RefreshCw, Inbox, CheckCircle2, XCircle, Info } from "lucide-react";

/**
 * 1. Loading Skeleton Component
 */
export function SkeletonLoader({ count = 3, height = "60px" }: { count?: number; height?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            width: "100%",
            borderRadius: "12px",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            animation: "pulse 1.5s infinite ease-in-out"
          }}
        />
      ))}
    </div>
  );
}

/**
 * 2. Empty State Component with Action CTA
 */
export function EmptyState({
  title,
  description,
  actionText,
  onAction,
  icon: Icon = Inbox
}: {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ElementType;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
        borderRadius: "16px",
        border: "1px stroke var(--border)",
        background: "rgba(15, 23, 42, 0.4)",
        marginTop: "16px"
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "rgba(99, 102, 241, 0.1)",
          display: "grid",
          placeItems: "center",
          color: "var(--accent-glow)",
          marginBottom: "16px"
        }}
      >
        <Icon size={28} />
      </div>
      <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--fg)", marginBottom: "8px" }}>
        {title}
      </h3>
      <p style={{ fontSize: "14px", color: "var(--muted)", maxWidth: "420px", marginBottom: "20px", lineHeight: 1.5 }}>
        {description}
      </p>
      {actionText && onAction && (
        <button onClick={onAction} className="btn primary-btn" style={{ gap: "8px" }}>
          {actionText}
        </button>
      )}
    </div>
  );
}

/**
 * 3. Error Retry Component
 */
export function ErrorState({
  message = "حدث خطأ أثناء تحميل البيانات.",
  onRetry
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderRadius: "12px",
        background: "rgba(239, 68, 68, 0.1)",
        border: "1px solid rgba(239, 68, 68, 0.3)",
        color: "#f87171",
        margin: "16px 0"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <AlertTriangle size={20} />
        <span style={{ fontSize: "14px", fontWeight: 500 }}>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn"
          style={{
            background: "rgba(239, 68, 68, 0.2)",
            color: "#fff",
            border: "none",
            gap: "6px",
            fontSize: "13px"
          }}
        >
          <RefreshCw size={14} /> إعادة المحاولة
        </button>
      )}
    </div>
  );
}

/**
 * 4. Confirmation Dialog Modal
 */
export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  isDanger = false,
  onConfirm,
  onCancel,
  children
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: "16px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#0f172a",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
        }}
      >
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--fg)", marginBottom: "12px" }}>
          {title}
        </h3>
        <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "20px", lineHeight: 1.5 }}>
          {message}
        </p>
        {children}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
          <button
            onClick={onCancel}
            className="btn"
            style={{ background: "rgba(255,255,255,0.08)", color: "var(--fg)" }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="btn"
            style={{
              background: isDanger ? "#ef4444" : "var(--accent-glow)",
              color: "#fff",
              border: "none"
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 5. Toast Notifications System
 */
export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "24px",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "360px"
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 500,
            background:
              t.type === "success"
                ? "rgba(16, 185, 129, 0.95)"
                : t.type === "error"
                ? "rgba(239, 68, 68, 0.95)"
                : "rgba(59, 130, 246, 0.95)",
            color: "#fff",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)"
          }}
        >
          {t.type === "success" && <CheckCircle2 size={18} />}
          {t.type === "error" && <XCircle size={18} />}
          {t.type === "info" && <Info size={18} />}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => onClose(t.id)}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
