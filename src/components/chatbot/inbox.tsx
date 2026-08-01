"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChatbotNav } from "./chatbot-nav";
import { ChatbotConversation, ChatbotMessage } from "@/types/chatbot";
import { ToastContainer, Toast, EmptyState } from "./ui";
import {
  MessageSquare,
  Search,
  UserCheck,
  Bot,
  Send,
  AlertTriangle,
  Clock,
  Phone,
  User,
  ShoppingBag,
  RefreshCw,
  XCircle,
  CheckCircle2
} from "lucide-react";

export function ChatbotInboxClient({
  initialConversations = [],
  initialHandoffs = {}
}: {
  initialConversations: ChatbotConversation[];
  initialHandoffs: Record<string, string>;
}) {
  const [conversations, setConversations] = useState<ChatbotConversation[]>(initialConversations);
  const [handoffs, setHandoffs] = useState<Record<string, string>>(initialHandoffs);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].id : null
  );
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "bot" | "human">("all");
  const [isPolling, setIsPolling] = useState(true);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [actionBlockedMessage, setActionBlockedMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/chatbot/inbox/messages?conversationId=${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // Quiet fail on background poll
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
    }
  }, [selectedConvId]);

  // Requirement #9: Polling every 5–10 seconds with visibility-aware pausing and unmount cleanup
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      if (document.hidden) return; // Pause polling when tab is hidden

      // Poll conversations & current thread messages
      fetch("/api/chatbot/inbox/conversations")
        .then((res) => res.json())
        .then((data) => {
          if (data.conversations) {
            setConversations(data.conversations);
            setHandoffs(data.handoffs || {});
          }
        })
        .catch(() => {});

      if (selectedConvId) {
        fetchMessages(selectedConvId);
      }
    }, 7000); // 7-second polling interval

    return () => clearInterval(interval); // Clean up on unmount
  }, [selectedConvId, isPolling]);

  // Handoff Actions ("استلام المحادثة", "إعادة للبوت", "إغلاق المحادثة")
  const handleHandoffAction = async (action: "takeover" | "release" | "close") => {
    if (!selectedConvId) return;

    setIsMutating(true);
    setActionBlockedMessage(null);

    try {
      const res = await fetch("/api/chatbot/inbox/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, conversationId: selectedConvId })
      });

      const data = await res.json();
      if (data.blockedReason) {
        setActionBlockedMessage(data.blockedReason);
      } else if (data.success) {
        addToast("success", data.message || "تم تنفيذ الإجراء بنجاح");
        // Refresh local state
        window.location.reload();
      } else {
        addToast("error", data.message || "تعذر تنفيذ الإجراء");
      }
    } catch {
      addToast("error", "حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setIsMutating(false);
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  const filteredConvs = conversations.filter((c) => {
    const matchesSearch = !search || c.id.toLowerCase().includes(search.toLowerCase());
    const matchesMode = filterMode === "all" || c.mode === filterMode;
    return matchesSearch && matchesMode;
  });

  return (
    <div style={{ padding: "8px 0" }}>
      <ToastContainer toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      <ChatbotNav subtitle="صندوق محادثات الزبائن، متابعة الرد الآلي والاستلام البشري" />

      {/* Warning banner if action is blocked by missing RPC */}
      {actionBlockedMessage && (
        <div style={{ padding: "14px 18px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#fbbf24", fontSize: "14px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertTriangle size={20} />
          <span>{actionBlockedMessage}</span>
        </div>
      )}

      {/* 3-Column Inbox Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr 280px",
          gap: "16px",
          height: "calc(100vh - 220px)",
          minHeight: "550px"
        }}
      >
        {/* Column 1: Conversations List */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          
          {/* List Header & Filters */}
          <div style={{ padding: "14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(0,0,0,0.3)", padding: "8px 12px", borderRadius: "8px", marginBottom: "10px" }}>
              <Search size={16} style={{ color: "var(--muted)" }} />
              <input
                type="text"
                placeholder="البحث بالمحادثة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: "none", border: "none", color: "#fff", fontSize: "13px", outline: "none", width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", gap: "4px" }}>
              {(["all", "bot", "human"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setFilterMode(m)}
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: filterMode === m ? 700 : 500,
                    background: filterMode === m ? "var(--accent-glow)" : "transparent",
                    color: filterMode === m ? "#fff" : "var(--muted)",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  {m === "all" ? "الكل" : m === "bot" ? "البوت" : "بشري"}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Items List */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {filteredConvs.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                لا توجد محادثات مطابقة.
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const isHuman = conv.mode === "human";

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    style={{
                      padding: "14px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      background: isSelected ? "rgba(99, 102, 241, 0.15)" : "transparent",
                      borderRight: isSelected ? "4px solid var(--accent-glow)" : "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
                        محادثة #{conv.id.substring(0, 8)}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: isHuman ? "rgba(245, 158, 11, 0.2)" : "rgba(129, 140, 248, 0.2)",
                          color: isHuman ? "#fbbf24" : "#818cf8"
                        }}
                      >
                        {isHuman ? "بشري" : "البوت"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "var(--muted)" }}>
                      <span>اللغة: {conv.language || "العربية"}</span>
                      <span>{new Date(conv.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Message Thread */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selectedConv ? (
            <>
              {/* Thread Header with Actions */}
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", margin: 0 }}>
                    محادثة #{selectedConv.id}
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                    النمط الحالي: {selectedConv.mode === "human" ? "استلام بشري" : "رد آلي من البوت"}
                  </span>
                </div>

                {/* Handoff Action Buttons */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {selectedConv.mode === "bot" ? (
                    <button
                      onClick={() => handleHandoffAction("takeover")}
                      disabled={isMutating}
                      className="btn primary-btn"
                      style={{ fontSize: "12px", padding: "6px 12px", gap: "6px" }}
                    >
                      <UserCheck size={14} /> استلام المحادثة
                    </button>
                  ) : (
                    <button
                      onClick={() => handleHandoffAction("release")}
                      disabled={isMutating}
                      className="btn"
                      style={{ background: "rgba(129, 140, 248, 0.2)", color: "#818cf8", fontSize: "12px", padding: "6px 12px", gap: "6px" }}
                    >
                      <Bot size={14} /> إعادة للبوت
                    </button>
                  )}

                  <button
                    onClick={() => handleHandoffAction("close")}
                    disabled={isMutating}
                    className="btn"
                    style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171", fontSize: "12px", padding: "6px 12px", gap: "6px" }}
                  >
                    <XCircle size={14} /> إغلاق المحادثة
                  </button>
                </div>
              </div>

              {/* Message Bubbles Container */}
              <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--muted)", margin: "auto" }}>
                    لا توجد رسائل مسجلة في هذه المحادثة بعد.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isCustomer = msg.sender_type === "customer";

                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isCustomer ? "flex-start" : "flex-end",
                          maxWidth: "75%",
                          padding: "12px 16px",
                          borderRadius: isCustomer ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                          background: isCustomer ? "rgba(30, 41, 59, 0.9)" : "rgba(99, 102, 241, 0.25)",
                          border: isCustomer ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(99,102,241,0.4)",
                          color: "#fff"
                        }}
                      >
                        <div style={{ fontSize: "11px", color: isCustomer ? "#94a3b8" : "#a5b4fc", marginBottom: "4px", fontWeight: 700 }}>
                          {isCustomer ? "الزبون" : msg.sender_type === "human" ? "موظف الدعم" : "البوت الآلي"}
                        </div>

                        {msg.media_url && (
                          <div style={{ marginBottom: "8px" }}>
                            <img src={msg.media_url} alt="مرفق" style={{ maxWidth: "100%", borderRadius: "8px" }} />
                          </div>
                        )}

                        <div style={{ fontSize: "13px", lineHeight: 1.5, wordBreak: "break-word" }}>
                          {msg.media_url && !msg.sender_type ? "[صورة / وسيط]" : "رسالة صادرة / واردة في المحادثة"}
                        </div>

                        <div style={{ fontSize: "10px", color: "var(--muted)", textAlign: "left", marginTop: "4px" }}>
                          {new Date(msg.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--muted)" }}>
              اختر محادثة من القائمة لعرض الرسائل والإجراءات.
            </div>
          )}
        </div>

        {/* Column 3: Customer & Context Panel */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: 0, paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            سياق المحادثة والزبون
          </h4>

          {selectedConv ? (
            <div style={{ fontSize: "13px", color: "var(--fg)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>معرّف المحادثة</span>
                <span style={{ fontWeight: 600 }}>{selectedConv.id}</span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>لغة التواصل</span>
                <span style={{ fontWeight: 600 }}>{selectedConv.language || "العربية"}</span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>تاريخ البدء</span>
                <span>{new Date(selectedConv.created_at).toLocaleString("ar-EG")}</span>
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: "13px" }}>لا توجد محادثة محددة.</div>
          )}
        </div>

      </div>
    </div>
  );
}
