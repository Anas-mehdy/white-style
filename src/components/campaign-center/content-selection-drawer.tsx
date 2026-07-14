"use client";

import { X, Calendar, Settings, Image as ImageIcon, Rocket, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { ContentLibraryItem } from "./types";
import { AnimatePresence, motion } from "framer-motion";

interface Account {
  id: string;
  name: string;
  meta_account_id: string;
}

interface ContentSelectionDrawerProps {
  item: ContentLibraryItem | null;
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSubmit: (data: {
    content_library_id: string;
    target_ad_account_id: string;
    destination_type: 'whatsapp' | 'messenger' | 'website';
    requested_daily_budget: number | null;
    execution_mode: 'dry_run' | 'live';
    placements: 'advantage_plus' | 'facebook_only' | 'instagram_only';
  }) => void;
  isLoading: boolean;
}

export function ContentSelectionDrawer({
  item,
  isOpen,
  onClose,
  accounts,
  onSubmit,
  isLoading,
}: ContentSelectionDrawerProps) {
  const [adAccountId, setAdAccountId] = useState("");
  const [destination, setDestination] = useState<'whatsapp' | 'messenger' | 'website'>("whatsapp");
  const [budgetType, setBudgetType] = useState<"none" | "custom">("none");
  const [customBudget, setCustomBudget] = useState<number>(15);
  const [placements, setPlacements] = useState<'advantage_plus' | 'facebook_only' | 'instagram_only'>("advantage_plus");
  const [executionMode, setExecutionMode] = useState<'dry_run' | 'live'>("dry_run");

  const [imgSrc, setImgSrc] = useState("");
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !adAccountId) {
      setAdAccountId(accounts[0].id);
    }
  }, [accounts, adAccountId]);

  useEffect(() => {
    if (item) {
      setImgSrc(item.thumbnail_url || "/placeholder-image.png");
      setImgFailed(!item.thumbnail_url);
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adAccountId) return;

    onSubmit({
      content_library_id: item.id,
      target_ad_account_id: adAccountId,
      destination_type: destination,
      requested_daily_budget: budgetType === "custom" ? customBudget : null,
      execution_mode: executionMode,
      placements: placements,
    });
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
              <h2 style={{ fontSize: "16px", fontWeight: "700" }}>إعداد وتجهيز الحملة الذكية</h2>
              <button
                onClick={onClose}
                disabled={isLoading}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--muted)",
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSubmit} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Large Preview */}
                <div style={{ position: "relative", width: "100%", height: "180px", borderRadius: "8px", overflow: "hidden", background: "rgba(0,0,0,0.3)" }}>
                  {!imgFailed ? (
                    <img
                      src={imgSrc}
                      alt="Selected preview"
                      onError={() => setImgFailed(true)}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", color: "var(--muted)" }}>
                      <ImageIcon size={32} />
                      <span style={{ fontSize: "11px" }}>معاينة الصورة غير متوفرة</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: "10px", right: "10px", left: "10px", background: "rgba(0,0,0,0.7)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <p style={{ margin: 0, fontSize: "12px", color: "white", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis", direction: "rtl", lineHeight: "1.5" }}>
                      {item.caption || "بدون نص شرح"}
                    </p>
                  </div>
                  <div style={{ position: "absolute", top: "10px", right: "10px" }}>
                    <span className="badge badge--info" style={{ textTransform: "capitalize", fontSize: "10.5px" }}>
                      {item.platform} ({item.content_type})
                    </span>
                  </div>
                </div>

                {/* Form fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Ad Account */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12.5px", fontWeight: "600" }}>الحساب الإعلاني (Meta Ad Account)</label>
                    <select
                      value={adAccountId}
                      onChange={(e) => setAdAccountId(e.target.value)}
                      disabled={isLoading}
                      required
                      style={{ width: "100%", height: "42px" }}
                    >
                      <option value="" disabled>اختر حسابًا إعلانيًا...</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Destination */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12.5px", fontWeight: "600" }}>الوجهة الإعلانية (Destination)</label>
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value as any)}
                      disabled={isLoading}
                      style={{ width: "100%", height: "42px" }}
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="messenger">Messenger</option>
                      <option value="website">Website</option>
                    </select>
                  </div>

                  {/* Placements */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12.5px", fontWeight: "600" }}>توزيع الإعلانات (Placements)</label>
                    <select
                      value={placements}
                      onChange={(e) => setPlacements(e.target.value as any)}
                      disabled={isLoading}
                      style={{ width: "100%", height: "42px" }}
                    >
                      <option value="advantage_plus">Advantage+ automatic (تلقائي وموصى به)</option>
                      <option value="facebook_only">Facebook only (فيسبوك فقط)</option>
                      <option value="instagram_only">Instagram only (إنستغرام فقط)</option>
                    </select>
                  </div>

                  {/* Daily Budget */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12.5px", fontWeight: "600" }}>الميزانية اليومية المقترحة</label>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <select
                        value={budgetType}
                        onChange={(e) => setBudgetType(e.target.value as any)}
                        disabled={isLoading}
                        style={{ width: "120px", height: "42px" }}
                      >
                        <option value="none">تلقائي (الذكاء الاصطناعي)</option>
                        <option value="custom">ميزانية مخصصة</option>
                      </select>
                      {budgetType === "custom" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                          <input
                            type="number"
                            min={5}
                            max={25}
                            required
                            value={customBudget}
                            onChange={(e) => setCustomBudget(Number(e.target.value))}
                            disabled={isLoading}
                            style={{ flex: 1, height: "42px", textAlign: "center" }}
                          />
                          <span style={{ fontSize: "13px", color: "var(--muted)" }}>دولار يومياً</span>
                        </div>
                      )}
                    </div>
                    {budgetType === "custom" && (
                      <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                        الحد الأدنى: 5$ والحد الأقصى: 25$ لسلامة الحساب.
                      </span>
                    )}
                  </div>

                  {/* Execution Mode */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: "600" }}>وضع تنفيذ الحملة الإعلانية</span>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="exec_mode"
                          checked={executionMode === "dry_run"}
                          onChange={() => setExecutionMode("dry_run")}
                          disabled={isLoading}
                        />
                        مسودة تجريبية (Dry Run)
                      </label>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="exec_mode"
                          checked={executionMode === "live"}
                          onChange={() => setExecutionMode("live")}
                          disabled={isLoading}
                        />
                        حقيقي (Live)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Footer */}
              <div style={{ padding: "20px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  disabled={isLoading || !adAccountId}
                  className="sync-button"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    background: "var(--brand-gradient)",
                    color: "white",
                    border: 0,
                    fontWeight: "600",
                    height: "42px",
                    cursor: isLoading ? "wait" : "pointer"
                  }}
                >
                  <Rocket size={16} style={{ marginLeft: "6px" }} />
                  {isLoading ? "جاري التحليل وإرسال الطلب..." : "تأكيد وتحليل المنشور"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
