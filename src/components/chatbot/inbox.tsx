"use client";

import React, { useState, useEffect } from "react";
import { ChatbotNav } from "./chatbot-nav";
import { ChatbotConversation, ChatbotMessage, ChatbotConversationEvent } from "@/types/chatbot";
import { ToastContainer, Toast } from "./ui";
import {
  UserCheck,
  Bot,
  AlertTriangle,
  Clock,
  XCircle,
  Activity
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
  const [events, setEvents] = useState<ChatbotConversationEvent[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "bot" | "human">("all");
  const [isPolling] = useState(true);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [actionBlockedMessage, setActionBlockedMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  // Fetch messages and events for selected conversation
  const fetchThreadData = async (convId: string) => {
    try {
      const [msgRes, evtRes] = await Promise.all([
        fetch(`/api/chatbot/inbox/messages?conversationId=${convId}`),
        fetch(`/api/chatbot/inbox/events?conversationId=${convId}`)
      ]);

      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages(msgData.messages || []);
      }
      if (evtRes.ok) {
        const evtData = await evtRes.json();
        setEvents(evtData.events || []);
      }
    } catch {
      // Quiet fail on background poll
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      fetchThreadData(selectedConvId);
    }
  }, [selectedConvId]);

  // Polling every 7 seconds with visibility-aware pausing and cleanup
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      if (document.hidden) return; // Pause polling when tab is hidden

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
        fetchThreadData(selectedConvId);
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [selectedConvId, isPolling]);

  // Handoff Actions ("استلام المحادثة", "إعادة للبوت", "إغلاق المحادثة")
  const handleHandoffAction = async (action: "takeover" | "release" | "close") => {
    if (!selectedConvId) return;

    setIsMutating(true);
    setActionBlockedMessage(null);

    const clientEventKey = `handoff-${action}-${selectedConvId}-${Date.now()}`;

    try {
      const res = await fetch("/api/chatbot/inbox/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          conversationId: selectedConvId,
          eventKey: clientEventKey
        })
      });

      const data = await res.json();

      if (res.status === 403 || res.status === 401) {
        addToast("error", data.message || "غير مصرح لك بنفيذ هذا الإجراء (403 Forbidden)");
      } else if (data.blockedReason) {
        setActionBlockedMessage(data.blockedReason);
      } else if (data.success) {
        addToast("success", data.message || "تم تنفيذ الإجراء بنجاح");
        
        // Immediately refresh state from server without optimistic corruption
        const convsRes = await fetch("/api/chatbot/inbox/conversations");
        if (convsRes.ok) {
          const convsData = await convsRes.json();
          if (convsData.conversations) {
            setConversations(convsData.conversations);
            setHandoffs(convsData.handoffs || {});
          }
        }
        await fetchThreadData(selectedConvId);
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

      {/* Warning banner if action is blocked */}
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
          gridTemplateColumns: "300px 1fr 300px",
          gap: "16px",
          height: "calc(100vh - 180px)",
          minHeight: "560px"
        }}
      >
        {/* Column 1: Conversations List */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "14px", display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="بحث برقم المحادثة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ fontSize: "12px", padding: "8px 12px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px" }}>
            {(["all", "bot", "human"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: filterMode === m ? "var(--accent-glow)" : "transparent",
                  color: filterMode === m ? "#fff" : "var(--muted)"
                }}
              >
                {m === "all" ? "الكل" : m === "bot" ? "البوت" : "بشري"}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {filteredConvs.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                لا توجد محادثات مطابقة.
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const isHuman = conv.mode === "human" || handoffs[conv.id] === "waiting_handoff";

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
                          {msg.content || "[وسيط / ملحق]"}
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

        {/* Column 3: Customer Panel & Event History */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "16px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: 0, paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            سياق المحادثة وتاريخ الأحداث
          </h4>

          {selectedConv ? (
            <div style={{ fontSize: "13px", color: "var(--fg)", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>معرّف المحادثة</span>
                  <span style={{ fontWeight: 600, fontSize: "12px" }}>{selectedConv.id}</span>
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

              {/* Conversation Event Timeline */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
                <h5 style={{ fontSize: "12px", fontWeight: 700, color: "#a5b4fc", margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Activity size={14} /> سجل الأحداث الذري (Events)
                </h5>

                {events.length === 0 ? (
                  <div style={{ color: "var(--muted)", fontSize: "11px" }}>لا توجد أحداث مسجلة بعد.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {events.map((evt) => (
                      <div
                        key={evt.id}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "rgba(30, 41, 59, 0.6)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          fontSize: "11px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#818cf8" }}>
                          <span>{evt.event_type}</span>
                          <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                            {new Date(evt.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {evt.summary && <div style={{ color: "#e2e8f0", marginTop: "2px" }}>{evt.summary}</div>}
                        {evt.reason && <div style={{ color: "#fbbf24", marginTop: "2px" }}>السبب: {evt.reason}</div>}
                        <div style={{ color: "var(--muted)", fontSize: "10px", marginTop: "4px" }}>
                          المنفذ: {evt.actor_type || "نظام"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
