"use client";

import React, { useState } from "react";
import { ChatbotNav } from "./chatbot-nav";
import { ChatbotChannel, HealthCardStatus } from "@/types/chatbot";
import { ToastContainer, Toast } from "./ui";
import {
  Settings,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  Sliders,
  ShieldAlert,
  Server
} from "lucide-react";

export function ChatbotSettingsClient({
  initialChannel,
  healthCards = []
}: {
  initialChannel: ChatbotChannel;
  healthCards: HealthCardStatus[];
}) {
  const [channel, setChannel] = useState<ChatbotChannel>(initialChannel);
  const [textBuffer, setTextBuffer] = useState(8);
  const [mediaBuffer, setMediaBuffer] = useState(12);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    addToast("success", "تم حفظ إعدادات الشات بوت بنجاح");
  };

  return (
    <div style={{ padding: "8px 0" }}>
      <ToastContainer toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      <ChatbotNav subtitle="إعدادات القناة، الموقتات الزمانية للرسائل، وحالة صحة الشات بوت والنظام" />

      {/* Health Status Section */}
      <div style={{ marginBottom: "32px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Activity size={20} style={{ color: "#34d399" }} /> بطاقات صحة وجاهزية النظام (Health Cards)
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {healthCards.map((card, i) => {
            const isHealthy = card.status === "healthy";
            const isWarning = card.status === "warning";

            return (
              <div
                key={i}
                style={{
                  padding: "18px",
                  borderRadius: "16px",
                  background: "rgba(15, 23, 42, 0.6)",
                  border: isHealthy
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : isWarning
                    ? "1px solid rgba(245, 158, 11, 0.3)"
                    : "1px solid rgba(239, 68, 68, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)" }}>{card.title}</span>
                  {isHealthy ? (
                    <CheckCircle2 size={18} style={{ color: "#34d399" }} />
                  ) : isWarning ? (
                    <AlertTriangle size={18} style={{ color: "#fbbf24" }} />
                  ) : (
                    <ShieldAlert size={18} style={{ color: "#f87171" }} />
                  )}
                </div>

                <div style={{ fontSize: "20px", fontWeight: 800, color: "#fff" }}>{card.value}</div>
                <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>{card.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Channel Configuration Form */}
      <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "24px", maxWidth: "680px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Settings size={20} style={{ color: "var(--accent-glow)" }} /> إعدادات وتوقيت القناة (Channel Settings)
        </h3>

        <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Bot Enabled Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.04)" }}>
            <div>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff", display: "block" }}>تفعيل البوت الآلي (Bot Enabled)</span>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>تفعيل الرد التلقائي على محادثات الواتساب الواردة</span>
            </div>
            <input
              type="checkbox"
              checked={channel.bot_enabled ?? true}
              onChange={(e) => setChannel({ ...channel, bot_enabled: e.target.checked })}
              style={{ width: "20px", height: "20px", cursor: "pointer" }}
            />
          </div>

          {/* Buffers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg)", display: "block", marginBottom: "6px" }}>
                مؤقت تجميع الرسائل النصية (Text Buffer)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  value={textBuffer}
                  onChange={(e) => setTextBuffer(Number(e.target.value))}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
                <span style={{ fontSize: "13px", color: "var(--muted)" }}>ثواني (افتراضي 8s)</span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg)", display: "block", marginBottom: "6px" }}>
                مؤقت تجميع الوسائط والصور (Media Buffer)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  value={mediaBuffer}
                  onChange={(e) => setMediaBuffer(Number(e.target.value))}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
                <span style={{ fontSize: "13px", color: "var(--muted)" }}>ثواني (افتراضي 12s)</span>
              </div>
            </div>
          </div>

          {/* Default Language */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg)", display: "block", marginBottom: "6px" }}>
              اللغة الافتراضية للبوت
            </label>
            <select
              value="ar"
              disabled
              style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "14px" }}
            >
              <option value="ar">العربية (Arabic) - الافتراضية</option>
              <option value="he">العبرية (Hebrew)</option>
              <option value="en">الإنكليزية (English)</option>
            </select>
          </div>

          {/* Provider Info Read-only */}
          <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>مزود القناة والتواصل الحالي (Provider)</span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#a5b4fc" }}>
              اختبار داخلي نشط - سيتم إضافة الربط مع ناشر لاحقاً (Internal Testing Active - Nashir Connection Coming Later)
            </span>
          </div>

          <button type="submit" className="btn primary-btn" style={{ marginTop: "8px", alignSelf: "flex-end" }}>
            حفظ الإعدادات
          </button>
        </form>
      </div>
    </div>
  );
}
