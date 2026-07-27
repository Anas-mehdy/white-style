"use client";

import { useState, useEffect } from "react";
import { X, ShieldCheck, AlertCircle, Info, Loader2, Plus } from "lucide-react";
import type { AdPauseException, AdPauseExceptionMode, AdSummary } from "@/types/ad-exceptions";
import { AdPickerDialog } from "./AdPickerDialog";
import { SelectedAdsList } from "./SelectedAdsList";
import { BulkExceptionSummary } from "./BulkExceptionSummary";

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
  const [selectedAds, setSelectedAds] = useState<AdSummary[]>([]);
  const [adUrl, setAdUrl] = useState<string>("");
  const [exceptionMode, setExceptionMode] = useState<AdPauseExceptionMode>("never_pause");
  const [customCost, setCustomCost] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "update">("skip");

  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form when dialog opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setDuplicateAction("skip");

    if (initialData) {
      setAdAccountId(initialData.ad_account_id || "");
      setSelectedAds([
        {
          id: initialData.ad_id,
          ad_account_id: initialData.ad_account_id,
          meta_ad_id: initialData.meta_ad_id,
          name: initialData.ad_name || "إعلان",
          effective_status: "ACTIVE",
          creative_id: null,
          synced_at: initialData.created_at,
        },
      ]);
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
      setSelectedAds([]);
      setAdUrl("");
      setExceptionMode("never_pause");
      setCustomCost("");
      setReason("");
      setIsActive(true);

      // If preselectedAdId provided, fetch ad record summary
      if (defaultAcc && preselectedAdId) {
        fetch(`/api/ad-exceptions/ads?adAccountId=${defaultAcc}`)
          .then((r) => r.json())
          .then((data) => {
            if (data && Array.isArray(data.ads)) {
              const found = data.ads.find((a: AdSummary) => a.id === preselectedAdId);
              if (found) {
                setSelectedAds([found]);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, initialData, preselectedAdAccountId, preselectedAdId, accounts]);

  const handleRemoveAd = (adId: string) => {
    setSelectedAds((prev) => prev.filter((a) => a.id !== adId));
  };

  const handleClearAllAds = () => {
    setSelectedAds([]);
  };

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
    if (selectedAds.length === 0) {
      setErrorMessage("يجب تحديد إعلان واحد على الأقل.");
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
      if (isEditing && initialData) {
        // Single update via PUT
        const payload = {
          ad_account_id: adAccountId,
          ad_id: selectedAds[0].id,
          meta_ad_id: selectedAds[0].meta_ad_id,
          ad_name: selectedAds[0].name,
          ad_url: adUrl || null,
          exception_mode: exceptionMode,
          custom_cost_per_conversation: parsedCustomCost,
          reason: reason || null,
          is_active: isActive,
        };

        const res = await fetch(`/api/ad-exceptions/${initialData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data.error || "حدث خطأ أثناء حفظ الاستثناء.");
        } else {
          onSuccess("تم تعديل الاستثناء بنجاح");
          onClose();
        }
      } else {
        // Bulk or single creation via POST
        const payload = {
          ad_account_id: adAccountId,
          selectedAds: selectedAds.map((a) => ({
            ad_id: a.id,
            meta_ad_id: a.meta_ad_id,
            ad_name: a.name,
            ad_url: adUrl || null,
          })),
          exception_mode: exceptionMode,
          custom_cost_per_conversation: parsedCustomCost,
          reason: reason || null,
          is_active: isActive,
          duplicateAction,
        };

        const res = await fetch("/api/ad-exceptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(data.error || "حدث خطأ أثناء حفظ الاستثناءات.");
        } else {
          const countMsg =
            data.createdCount > 1
              ? `تم إنشاء ${data.createdCount} استثناءات جديدة بنجاح`
              : "تم إنشاء الاستثناء بنجاح";
          onSuccess(countMsg);
          onClose();
        }
      }
    } catch {
      setErrorMessage("تعذر الاتصال بالسيرفر. يرجى المحاولة لاحقاً.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="drawer-backdrop drawer-backdrop--open"
        style={{
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          className="panel"
          style={{
            width: "100%",
            maxWidth: "620px",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            padding: 0,
            overflow: "hidden",
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--surface-soft)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ShieldCheck size={20} style={{ color: "var(--green)" }} />
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "var(--foreground)" }}>
                {isEditing ? "تعديل استثناء الإعلان" : "إضافة استثناء إعلانات جديد"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: 0,
                color: "var(--muted)",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Error Notification */}
              {errorMessage && (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "var(--red-soft)",
                    border: "1px solid var(--red)",
                    borderRadius: "8px",
                    color: "var(--red)",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Ad Account Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--foreground)" }}>
                  الحساب الإعلاني <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <select
                  value={adAccountId}
                  onChange={(e) => {
                    setAdAccountId(e.target.value);
                    setSelectedAds([]);
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

              {/* Interactive Ad Picker Trigger & Selected Ads List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--foreground)" }}>
                    الإعلانات المستهدفة <span style={{ color: "var(--red)" }}>*</span>
                  </label>
                  {!isEditing && (
                    <button
                      type="button"
                      disabled={!adAccountId}
                      onClick={() => setIsPickerOpen(true)}
                      className="sync-button"
                      style={{
                        padding: "6px 14px",
                        fontSize: "12.5px",
                        background: "var(--blue-soft)",
                        color: "var(--blue)",
                        borderColor: "var(--blue)",
                        fontWeight: "600",
                      }}
                    >
                      <Plus size={14} />
                      <span>اختيار الإعلانات ({selectedAds.length})</span>
                    </button>
                  )}
                </div>

                {/* Selected Ads Chips List */}
                <SelectedAdsList
                  selectedAds={selectedAds}
                  onRemove={handleRemoveAd}
                  onClearAll={handleClearAllAds}
                  onOpenPicker={() => setIsPickerOpen(true)}
                />
              </div>

              {/* Bulk Duplicates Pre-Save Summary */}
              {!isEditing && (
                <BulkExceptionSummary
                  selectedAds={selectedAds}
                  duplicateAction={duplicateAction}
                  setDuplicateAction={setDuplicateAction}
                />
              )}

              {/* Exception Mode Choice */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--foreground)" }}>
                  نوع الاستثناء المطبق <span style={{ color: "var(--red)" }}>*</span>
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
                      transition: "all 0.2s",
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
                      transition: "all 0.2s",
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

              {/* Mode Specific Explanations & Inputs */}
              {exceptionMode === "never_pause" ? (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "var(--green-soft)",
                    border: "1px solid var(--green)",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    color: "var(--green-dark)",
                    lineHeight: "1.6",
                    display: "flex",
                    gap: "8px",
                  }}
                >
                  <Info size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    لن يتم إيقاف المجموعة الإعلانية التابعة لأي إعلان مختار مهما بلغت تكلفة المحادثة أو مقدار الصرف بدون نتائج.
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
                      <span
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--muted)",
                          fontWeight: "600",
                          fontSize: "14px",
                        }}
                      >
                        $
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "10px 12px",
                      background: "var(--blue-soft)",
                      border: "1px solid var(--blue)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "var(--foreground)",
                      lineHeight: "1.5",
                    }}
                  >
                    <strong>مثال توضيحي: </strong>
                    إذا كان الحد المخصص $5، سيستمر الإعلان ومجموعته الإعلانية عندما تكون تكلفة المحادثة $5 أو أقل، وسيُسمح بإيقاف المجموعة الإعلانية عندما تتجاوز التكلفة $5.
                  </div>

                  <div
                    style={{
                      padding: "10px 12px",
                      background: "var(--amber-soft)",
                      border: "1px solid var(--amber)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "var(--amber)",
                      lineHeight: "1.5",
                    }}
                  >
                    <strong>ملاحظة: </strong>
                    الحد المخصص يطبّق فقط على قرارات ارتفاع تكلفة المحادثة. قواعد الصرف بدون محادثات تبقى فعالة.
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
                  placeholder="أدخل سبب إضافة هذا الاستثناء للإعلانات المختارة..."
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px",
                  background: "var(--surface-soft)",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "13.5px", color: "var(--foreground)" }}>
                    حالة الاستثناء (Active)
                  </strong>
                  <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                    عند إلغاء التفعيل يتم تعطيل الحماية مؤقتاً
                  </span>
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
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                background: "var(--surface-soft)",
              }}
            >
              <button type="button" onClick={onClose} className="sync-button" style={{ padding: "8px 16px" }}>
                إلغاء
              </button>

              <button
                type="submit"
                disabled={submitting || selectedAds.length === 0}
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
                  `حفظ استثناء (${selectedAds.length}) إعلانات`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Interactive Ads Picker Dialog */}
      <AdPickerDialog
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onConfirm={(confirmedList) => {
          setSelectedAds(confirmedList);
        }}
        adAccountId={adAccountId}
        initialSelectedAds={selectedAds}
      />
    </>
  );
}
