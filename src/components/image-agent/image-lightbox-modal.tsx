"use client";

import { X, Download, ArrowRightLeft } from "lucide-react";
import type { SignedImageItem } from "@/types/image-agent";

interface ImageLightboxModalProps {
  item: SignedImageItem | null;
  onClose: () => void;
}

export function ImageLightboxModal({ item, onClose }: ImageLightboxModalProps) {
  if (!item) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(9, 14, 26, 0.92)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
      }}
    >
      {/* Top Header Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              background: "var(--brand-gradient)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ArrowRightLeft size={16} />
            مقارنة الصورة مع الموديل الرسمي
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a
            href={`/api/image-agent/items/${item.id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            download
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              fontSize: "13px",
              fontWeight: "500",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none",
            }}
          >
            <Download size={16} />
            تنزيل الصورة
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              display: "grid",
              placeItems: "center",
            }}
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Comparison Workspace */}
      <div
        style={{
          flex: 1,
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          alignItems: "center",
          justifyContent: "center",
          overflowY: "auto",
        }}
      >
        {/* Original Product Image */}
        {item.source_url && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--muted)" }}>
              صورة المنتج الأصلية
            </span>
            <div
              style={{
                width: "100%",
                maxWidth: "500px",
                aspectRatio: "1 / 1",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <img
                src={item.source_url}
                alt="Original Product"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          </div>
        )}

        {/* Generated Result Image */}
        {item.result_url && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#60a5fa" }}>
              صورة الموديل النهائية (1:1)
            </span>
            <div
              style={{
                width: "100%",
                maxWidth: "500px",
                aspectRatio: "1 / 1",
                borderRadius: "16px",
                overflow: "hidden",
                border: "2px solid #3b82f6",
                background: "var(--surface)",
                boxShadow: "0 10px 30px rgba(59, 130, 246, 0.2)",
              }}
            >
              <img
                src={item.result_url}
                alt="Generated Result"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
