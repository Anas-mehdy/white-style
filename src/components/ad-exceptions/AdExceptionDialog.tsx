"use client";

import { useState, useEffect } from "react";
import { X, ShieldCheck, AlertCircle, Info, Loader2 } from "lucide-react";
import type { AdPauseException, AdPauseExceptionMode, MetaAdOption } from "@/types/ad-exceptions";

interface AccountOption {
  id: string;
  name: string;
}

interface AdExceptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  accounts: AccountOption[];
  initialData?: AdPauseException | null;
  preselectedAdAccountId?: string;
  preselectedAdId?: string;
}

export function AdExceptionDialog({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  initialData,
  preselectedAdAccountId,
  preselectedAdId,
}: AdExceptionDialogProps) {
  const isEditing = Boolean(initialData?.id);

  const [adAccountId, setAdAccountId] = useState<string>("");
  const [adId, setAdId] = useState<string>("");
  const [metaAdId, setMetaAdId] = useState<string>("");
  const [adName, setAdName] = useState<string>("");
  const [adUrl, setAdUrl] = useState<string>("");
  const [exceptionMode, setExceptionMode] = useState<AdPauseExceptionMode>("never_pause");
  const [customCost, setCustomCost] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  const [adsOptions, setAdsOptions] = useState<MetaAdOption[]>([]);
  const [loadingAds, setLoadingAds] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form when dialog opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    if (initialData) {
      setAdAccountId(initialData.ad_account_id || "");
      setAdId(initialData.ad_id || "");
      setMetaAdId(initialData.meta_ad_id || "");
      setAdName(initialData.ad_name || "");
      setAdUrl(initialData.ad_url || "");
      setExceptionMode(initialData.exception_mode || "never_pause");
      setCustomCost(
        initialData.custom_cost_per_conversation !== null && initialData.custom_cost_per_conversation !== undefined
          ? String(initialData.custom_cost_per_conversation)
          : ""
      );
      setReason(initialData.reason || "");
      setIsActive(initialData.is_active ?? true);
    } else {
      const defaultAcc = preselectedAdAccountId || (accounts.length > 0 ? accounts[0].id : "");
      setAdAccountId(defaultAcc);
      setAdId(preselectedAdId || "");
      setMetaAdId("");
      setAdName("");
      setAdUrl("");
      setExceptionMode("never_pause");
      setCustomCost("");
      setReason("");
      setIsActive(true);
    }
  }, [isOpen, initialData, preselectedAdAccountId, preselectedAdId, accounts]);

  // Fetch ads when selected adAccountId changes
  useEffect(() => {
    if (!isOpen || !adAccountId) {
      setAdsOptions([]);
      return;
    }

    async function fetchAds() {
      setLoadingAds(true);
      try {
        const res = await fetch(`/api/meta-ads?ad_account_id=${adAccountId}`, { cache: "no-store" });
        if (res.ok) {
          const data: MetaAdOption[] = await res.json();
          setAdsOptions(data);
          
          // If preselectedAdId provided or adId already set, update name & meta_ad_id
          const currentId = adId || preselectedAdId;
          if (currentId) {
            const found = data.find((a) => a.id === currentId);
            if (found) {
              setMetaAdId(found.meta_ad_id);
              setAdName(found.name);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch meta ads:", err);
      } finally {
        setLoadingAds(false);
      }
    }

    fetchAds();
  }, [isOpen, adAccountId]);

  // When user selects an ad from dropdown
  const handleAdSelect = (selectedId: string) => {
    setAdId(selectedId);
    const found = adsOptions.find((a) => a.id === selectedId);
    if (found) {
      setMetaAdId(found.meta_ad_id);
      setAdName(found.name);
    } else {
      setMetaAdId("");
      setAdName("");
    }
  };

  // Switch mode logic
  const handleModeChange = (mode: AdPauseExceptionMode) => {
    setExceptionMode(mode);
    if (mode === "never_pause") {
      setCustomCost("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adAccountId) {
      setErrorMessage("يجب تحديد الحساب الإعلاني.");
      return;
    }
    if (!adId) {
      setErrorMessage("يجب تحديد الإعلان.");
      return;
    }
    if (!exceptionMode) {
      setErrorMessage("يجب تحديد نوع الاستثناء.");
      return;
    }

    let parsedCustomCost: number | null = null;
    if (exceptionMode === "custom_limit") {
      const num = Number(customCost);
      if (!customCost || isNaN(num) || num <= 0) {
        setErrorMessage("الحد المخصص يجب أن يكون أكبر من صفر.");
        return;
      }
      parsedCustomCost = num;
    }

    setSubmitting(true);

    try {
      const payload = {
        ad_account_id: adAccountId,
        ad_id: adId,
        meta_ad_id: metaAdId,
        ad_name: adName,
        ad_url: adUrl || null,
        exception_mode: exceptionMode,
        custom_cost_per_conversation: parsedCustomCost,
        reason: reason || null,
        is_active: isActive,
      };

      const url = isEditing ? `/api/ad-exceptions/${initialData!.id}` : "/api/ad-exceptions";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "حدث خطأ أثناء حفظ الاستثناء.");
      } else {
        onSuccess(isEditing ? "تم تعديل الاستثناء بنجاح" : "تم إنشاء الاستثناء بنجاح");
        onClose();
      }
    } catch (err) {
      setErrorMessage("تعذر الاتصال بالسيرفر. يرجى المحاولة لاحقاً.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop drawer-backdrop--open" style={{ zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div 
        className="panel"
        style={{
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          padding: 0,
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--surface)"
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-soft)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={20} style={{ color: "var(--green)" }} />
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "var(--foreground)" }}>
              {isEditing ? "تعديل استثناء الإعلان" : "إضافة استثناء إعلان جديد"}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer", padding: "4px", borderRadius: "6px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
            
            {/* Error Message Notification */}
            {errorMessage && (
              <div style={{ padding: "12px 14px", background: "var(--red-soft)", border: "1px solid var(--red)", borderRadius: "8px", color: "var(--red)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Ad Account Field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--foreground)" }}>
                الحساب الإعلاني <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <select
                value={adAccountId}
                onChange={(e) => {
                  setAdAccountId(e.target.value);
                  setAdId("");
                  setMetaAdId("");
                  setAdName("");
                }}
                disabled={isEditing}
                className="filter-input"
                style={{ width: "100%" }}
              >
                <option value="">-- اختر الحساب الإعلاني --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ad Field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--foreground)" }}>
                الإعلان المستهدف <span style={{ color: "var(--red)" }}>*</span>
              </label>
              
              {loadingAds ? (
                <div style={{ fontSize: "12.5px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px", padding: "8px" }}>
                  <Loader2 size={14} className="spinner" />
                  <span>جاري تحميل الإعلانات التابعة للحساب...</span>
                </div>
              ) : (
                <select
                  value={adId}
                  onChange={(e) => handleAdSelect(e.target.value)}
                  disabled={isEditing || !adAccountId}
                  className="filter-input"
                  style={{ width: "100%" }}
                >
                  <option value="">-- اختر الإعلان --</option>
                  {adsOptions.map((ad) => (
                    <option key={ad.id} value={ad.id}>
                      {ad.name} ({ad.meta_ad_id}) {ad.effective_status ? `[${ad.effective_status}]` : ""}
                    </option>
                  ))}
                </select>
              )}

              {metaAdId && (
                <div style={{ fontSize: "11.5px", color: "var(--muted)", direction: "ltr", textAlign: "right" }}>
                  Meta Ad ID: <span className="ltr-val" style={{ fontFamily: "monospace" }}>{metaAdId}</span>
                </div>
              )}
            </div>

            {/* Exception Mode Choice */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--foreground)" }}>
                نوع الاستثناء <span style={{ color: "var(--red)" }}>*</span>
              </label>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label 
                  style={{
                    border: `1.5px solid ${exceptionMode === "never_pause" ? "var(--green)" : "var(--border)"}`,
                    background: exceptionMode === "never_pause" ? "var(--green-soft)" : "var(--surface-soft)",
                    borderRadius: "10px",
                    padding: "12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="radio"
                      name="exceptionMode"
                      value="never_pause"
                      checked={exceptionMode === "never_pause"}
                      onChange={() => handleModeChange("never_pause")}
                    />
                    <strong style={{ fontSize: "13.5px", color: "var(--foreground)" }}>عدم الإيقاف نهائيًا</strong>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", paddingRight: "22px" }}>
                    never_pause
                  </span>
                </label>

                <label 
                  style={{
                    border: `1.5px solid ${exceptionMode === "custom_limit" ? "var(--blue)" : "var(--border)"}`,
                    background: exceptionMode === "custom_limit" ? "var(--blue-soft)" : "var(--surface-soft)",
                    borderRadius: "10px",
                    padding: "12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="radio"
                      name="exceptionMode"
                      value="custom_limit"
                      checked={exceptionMode === "custom_limit"}
                      onChange={() => handleModeChange("custom_limit")}
                    />
                    <strong style={{ fontSize: "13.5px", color: "var(--foreground)" }}>حد مخصص</strong>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", paddingRight: "22px" }}>
                    custom_limit
                  </span>
                </label>
              </div>
            </div>

            {/* Mode-Specific Explanations & Custom Limit Input */}
            {exceptionMode === "never_pause" ? (
              <div style={{ padding: "12px 14px", background: "var(--green-soft)", border: "1px solid var(--green)", borderRadius: "8px", fontSize: "12.5px", color: "var(--green-dark)", lineHeight: "1.6", display: "flex", gap: "8px" }}>
                <Info size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>
                  لن يقوم نظام التنفيذ بإيقاف المجموعة الإعلانية التابعة لهذا الإعلان، مهما بلغت تكلفة المحادثة أو مقدار الصرف بدون نتائج.
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--foreground)" }}>
                    أوقف المجموعة الإعلانية عندما تتجاوز تكلفة محادثة الإعلان <span style={{ color: "var(--red)" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={customCost}
                      onChange={(e) => setCustomCost(e.target.value)}
                      placeholder="5.00"
                      className="filter-input"
                      style={{ width: "100%", paddingLeft: "30px", direction: "ltr", textAlign: "right" }}
                    />
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontWeight: "600", fontSize: "14px" }}>$</span>
                  </div>
                </div>

                <div style={{ padding: "10px 12px", background: "var(--blue-soft)", border: "1px solid var(--blue)", borderRadius: "8px", fontSize: "12px", color: "var(--foreground)", lineHeight: "1.5" }}>
                  <strong>مثال توضيحي: </strong>
                  إذا كان الحد المخصص $5، سيستمر الإعلان ومجموعته الإعلانية عندما تكون تكلفة المحادثة $5 أو أقل، وسيُسمح بإيقاف المجموعة الإعلانية عندما تتجاوز التكلفة $5.
                </div>

                <div style={{ padding: "10px 12px", background: "var(--amber-soft)", border: "1px solid var(--amber)", borderRadius: "8px", fontSize: "12px", color: "var(--amber)", lineHeight: "1.5" }}>
                  <strong>ملاحظة هامة: </strong>
                  الحد المخصص يطبّق على قرارات ارتفاع تكلفة المحادثة فقط. قواعد الصرف بدون محادثات تبقى فعالة. استخدم “عدم الإيقاف نهائيًا” لمنع جميع قرارات الإيقاف.
                </div>
              </div>
            )}

            {/* Reason Field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--foreground)" }}>
                السبب أو الملاحظات (اختياري)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="أدخل سبب إضافة هذا الاستثناء للإعلان..."
                rows={2}
                className="filter-input"
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>

            {/* Ad URL Field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--foreground)" }}>
                رابط الإعلان (اختياري)
              </label>
              <input
                type="url"
                value={adUrl}
                onChange={(e) => setAdUrl(e.target.value)}
                placeholder="https://facebook.com/ads/..."
                className="filter-input"
                style={{ width: "100%", direction: "ltr", textAlign: "right" }}
              />
            </div>

            {/* Active Switch */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--surface-soft)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <div>
                <strong style={{ display: "block", fontSize: "13.5px", color: "var(--foreground)" }}>حالة الاستثناء (Active)</strong>
                <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>عند إلغاء التفعيل يتم تعطيل الحماية مؤقتاً</span>
              </div>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--green)" }}
                />
                <span style={{ fontSize: "13px", fontWeight: "600", color: isActive ? "var(--green)" : "var(--muted)" }}>
                  {isActive ? "فعال" : "معطل"}
                </span>
              </label>
            </div>

          </div>

          {/* Footer Actions */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "10px", background: "var(--surface-soft)" }}>
            <button
              type="button"
              onClick={onClose}
              className="sync-button"
              style={{ padding: "8px 16px" }}
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="agent-control"
              style={{ padding: "8px 20px", fontSize: "13px" }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="spinner" />
                  <span>جاري الحفظ...</span>
                </>
              ) : isEditing ? (
                "حفظ التعديلات"
              ) : (
                "إضافة الاستثناء"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
