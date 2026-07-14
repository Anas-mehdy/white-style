"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface ContentAnalysisProps {
  analysis: {
    platform: string;
    media_type: string;
    content_summary: string;
    detected_goal: string;
    detected_language: string;
    confidence: number;
  };
}

export function ContentAnalysis({ analysis }: ContentAnalysisProps) {
  const cards = [
    { label: "المنصة المستهدفة", value: analysis.platform || "—" },
    { label: "نوع الوسائط", value: analysis.media_type || "—" },
    { label: "ملخص المحتوى", value: analysis.content_summary || "—", fullWidth: true },
    { label: "الهدف المكتشف", value: analysis.detected_goal || "—" },
    { label: "اللغة المكتشفة", value: analysis.detected_language || "—" },
    { label: "مستوى الثقة", value: (analysis.confidence || 0) + "%", isConfidence: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <div className="panel-heading">
        <h2 style={{ fontSize: "15px", fontWeight: "600" }}>تحليل محتوى الذكاء الاصطناعي</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        {cards.map((card, idx) => {
          const isFullWidth = card.fullWidth;
          const isConfidence = card.isConfidence;

          return (
            <div
              key={idx}
              className="panel"
              style={{
                gridColumn: isFullWidth ? "span 3" : "auto",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                background: "var(--surface-soft)",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>{card.label}</span>
              <strong style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", whiteSpace: "pre-line", lineHeight: "1.5" }}>
                {card.value}
              </strong>

              {isConfidence && (
                <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden", marginTop: "4px" }}>
                  <div
                    style={{
                      height: "100%",
                      width: (analysis.confidence || 0) + "%",
                      background: "var(--green)",
                      borderRadius: "inherit",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
