"use client";

import { X, Sparkles, AlertCircle, Copy, Check } from "lucide-react";
import { useState } from "react";
import { ContentLibraryItem } from "./types";
import { AnimatePresence, motion } from "framer-motion";

interface ContentAIEditorProps {
  item: ContentLibraryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContentAIEditor({ item, isOpen, onClose }: ContentAIEditorProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!item) return null;

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 999,
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "100%",
              maxWidth: "520px",
              height: "100vh",
              background: "var(--surface)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={18} style={{ color: "var(--blue)" }} />
                تحرير المحتوى بالذكاء الاصطناعي
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Unavailable Warning Banner */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "14px",
                  borderRadius: "8px",
                  background: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  color: "var(--blue)",
                  fontSize: "13px",
                  lineHeight: "1.6",
                }}
              >
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>ميزة تجريبية وقريباً بالكامل</strong>
                  <p style={{ marginTop: "4px", opacity: 0.9 }}>
                    ميزة التحرير بالذكاء الاصطناعي ستتوفر قريباً عند ربط API التحرير. في الوقت الحالي، يتم عرض هيكلية وتصميم لوحة التحرير فقط كنموذج أولي دون توليد محتوى فعلي.
                  </p>
                </div>
              </div>

              {/* Original Caption */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "12.5px", color: "var(--muted)", fontWeight: "600" }}>النص الأصلي</span>
                <div
                  className="panel"
                  style={{
                    padding: "12px",
                    background: "rgba(255,255,255,0.02)",
                    fontSize: "12.5px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-line",
                    maxHeight: "120px",
                    overflowY: "auto",
                  }}
                >
                  {item.caption || "لا يوجد نص شرح"}
                </div>
              </div>

              {/* AI Recommendations (Disabled Preview) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", opacity: 0.5, pointerEvents: "none" }}>
                {/* Improved Caption */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>النص المقترح المحسّن</span>
                    <button type="button" style={{ background: "transparent", border: 0, color: "var(--muted)", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Copy size={12} /> نسخ
                    </button>
                  </div>
                  <div className="panel" style={{ padding: "12px", background: "var(--surface-soft)", fontSize: "13px", lineHeight: "1.6" }}>
                    [سيتم توليد نص منشور محسّن وجذاب ذو صياغة تسويقية قوية هنا...]
                  </div>
                </div>

                {/* Hook and CTA */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>الخطاف المقترح (Hook)</span>
                    <div className="panel" style={{ padding: "12px", background: "var(--surface-soft)", fontSize: "12.5px" }}>
                      [عبارة أولى خاطفة للانتباه...]
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>دعوة اتخاذ إجراء (CTA)</span>
                    <div className="panel" style={{ padding: "12px", background: "var(--surface-soft)", fontSize: "12.5px" }}>
                      [زر اتخاذ إجراء واضح...]
                    </div>
                  </div>
                </div>

                {/* Offer Framing */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>صياغة العرض التسويقي</span>
                  <div className="panel" style={{ padding: "12px", background: "var(--surface-soft)", fontSize: "12.5px" }}>
                    [تأطير الميزات التنافسية وتسهيل آلية الطلب على العميل...]
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: "var(--green)", fontWeight: "600" }}>نقاط القوة بالمحتوى</span>
                    <ul style={{ margin: 0, paddingRight: "16px", fontSize: "12px", color: "var(--muted)" }}>
                      <li>استخدام ممتاز للرموز التعبيرية</li>
                      <li>الوضوح في تحديد لغة الجمهور</li>
                    </ul>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: "var(--red)", fontWeight: "600" }}>نقاط بحاجة لتحسين</span>
                    <ul style={{ margin: 0, paddingRight: "16px", fontSize: "12px", color: "var(--muted)" }}>
                      <li>السطر الأول يحتاج تشويق أكبر</li>
                      <li>توضيح سعر الشحن والتوصيل</li>
                    </ul>
                  </div>
                </div>

                {/* Compliance Notes */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "var(--amber)", fontWeight: "600" }}>ملاحظات ملاءمة سياسات Meta الإعلانية</span>
                  <div className="panel" style={{ padding: "12px", background: "var(--surface-soft)", fontSize: "12px" }}>
                    [تخلو القطعة من الكلمات المحظورة إعلانياً ومتوافقة مع معايير مجتمع Meta بنسبة 100%]
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div style={{ padding: "20px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px" }}>
              <button
                type="button"
                disabled
                className="sync-button"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  background: "var(--brand-gradient)",
                  color: "white",
                  border: 0,
                  opacity: 0.4,
                  cursor: "not-allowed"
                }}
              >
                حفظ كمسودة
              </button>
              <button
                type="button"
                disabled
                className="sync-button"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  background: "transparent",
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                  opacity: 0.4,
                  cursor: "not-allowed"
                }}
              >
                استخدام للتحليل
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
