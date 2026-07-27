"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  ShieldCheck, 
  Plus, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Shield, 
  ShieldAlert, 
  PowerOff,
  Trash2,
  X,
  Loader2
} from "lucide-react";
import type { AdPauseException } from "@/types/ad-exceptions";
import { AdExceptionFilters } from "./AdExceptionFilters";
import { AdExceptionsTable } from "./AdExceptionsTable";
import { AdExceptionDialog } from "./AdExceptionDialog";

interface AccountOption {
  id: string;
  name: string;
}

export function AdExceptionsPage() {
  const [items, setItems] = useState<AdPauseException[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dialog & Toast State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<AdPauseException | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<AdPauseException | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Accounts & Exceptions Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accRes, excRes] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch("/api/ad-exceptions", { cache: "no-store" }),
      ]);

      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData && Array.isArray(accData.accounts)) {
          setAccounts(accData.accounts.map((a: any) => ({ id: a.id, name: a.name })));
        }
      }

      if (!excRes.ok) {
        const errJson = await excRes.json();
        throw new Error(errJson.error || "تعذر تحميل بيانات الاستثناءات.");
      }

      const excData: AdPauseException[] = await excRes.json();
      setItems(excData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute KPI Summary Counts
  const kpiStats = useMemo(() => {
    const activeItems = items.filter((i) => i.is_active);
    const activeNeverPause = activeItems.filter((i) => i.exception_mode === "never_pause").length;
    const activeCustomLimit = activeItems.filter((i) => i.exception_mode === "custom_limit").length;
    const inactiveCount = items.filter((i) => !i.is_active).length;

    return {
      totalActive: activeItems.length,
      neverPause: activeNeverPause,
      customLimit: activeCustomLimit,
      inactive: inactiveCount,
    };
  }, [items]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Account filter
      if (accountFilter !== "all" && item.ad_account_id !== accountFilter) {
        return false;
      }
      // Mode filter
      if (modeFilter !== "all" && item.exception_mode !== modeFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "active" && !item.is_active) return false;
        if (statusFilter === "inactive" && item.is_active) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const adName = (item.ad_name || "").toLowerCase();
        const metaAdId = (item.meta_ad_id || "").toLowerCase();
        if (!adName.includes(q) && !metaAdId.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [items, accountFilter, modeFilter, statusFilter, searchQuery]);

  const resetFilters = () => {
    setAccountFilter("all");
    setModeFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  const handleOpenAddDialog = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (item: AdPauseException) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (item: AdPauseException) => {
    try {
      const nextActive = !item.is_active;
      const res = await fetch(`/api/ad-exceptions/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });

      if (res.ok) {
        showToast(nextActive ? "تم تفعيل الاستثناء بنجاح" : "تم تعطيل الاستثناء بنجاح");
        fetchData();
      } else {
        const errData = await res.json();
        showToast(errData.error || "فشل تعديل حالة الاستثناء.");
      }
    } catch {
      showToast("حدث خطأ أثناء تعديل الحالة.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/ad-exceptions/${deleteConfirmItem.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast("تم حذف الاستثناء بنجاح");
        setDeleteConfirmItem(null);
        fetchData();
      } else {
        const errData = await res.json();
        showToast(errData.error || "فشل حذف الاستثناء.");
      }
    } catch {
      showToast("حدث خطأ أثناء حذف الاستثناء.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Success Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(8px)",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
            zIndex: 1100,
            fontSize: "14px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            direction: "rtl",
          }}
        >
          <CheckCircle2 size={16} style={{ color: "var(--green)" }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="topbar">
        <div className="topbar-title" style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "800px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={26} style={{ color: "var(--green)" }} />
            <h1 style={{ margin: 0 }}>استثناءات إيقاف الإعلانات</h1>
          </div>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "13.5px", lineHeight: "1.6" }}>
            احمِ إعلانات محددة من الإيقاف التلقائي أو حدد لها حدًا مخصصًا لتكلفة المحادثة. عند منع إيقاف الإعلان، لن يقوم نظام التنفيذ بإيقاف المجموعة الإعلانية التابعة له.
          </p>
        </div>

        <div className="topbar-actions" style={{ display: "flex", gap: "10px" }}>
          <button className="agent-control" onClick={handleOpenAddDialog} style={{ padding: "10px 18px", fontSize: "13.5px" }}>
            <Plus size={16} />
            <span>إضافة استثناء</span>
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="kpi-grid">
        <article className="kpi-card" style={{ borderRight: "3px solid var(--green)" }}>
          <div className="kpi-label">إجمالي الاستثناءات الفعالة</div>
          <strong className="kpi-value" style={{ color: "var(--green)" }}>{kpiStats.totalActive}</strong>
          <span className="kpi-subtext">إعلانات محمية حالياً من الإيقاف العادي</span>
        </article>

        <article className="kpi-card" style={{ borderRight: "3px solid var(--green-dark)" }}>
          <div className="kpi-label">عدد Never Pause</div>
          <strong className="kpi-value" style={{ color: "var(--foreground)" }}>{kpiStats.neverPause}</strong>
          <span className="kpi-subtext">عدم الإيقاف نهائيًا مهما بلغت التكلفة</span>
        </article>

        <article className="kpi-card" style={{ borderRight: "3px solid var(--blue)" }}>
          <div className="kpi-label">عدد Custom Limit</div>
          <strong className="kpi-value" style={{ color: "var(--blue)" }}>{kpiStats.customLimit}</strong>
          <span className="kpi-subtext">إعلانات لها حد تكلفة محادثة مخصص</span>
        </article>

        <article className="kpi-card" style={{ borderRight: "3px solid var(--muted)" }}>
          <div className="kpi-label">عدد الاستثناءات المعطلة</div>
          <strong className="kpi-value" style={{ color: "var(--muted)" }}>{kpiStats.inactive}</strong>
          <span className="kpi-subtext">استثناءات تم إيقاف تفعيلها مؤقتاً</span>
        </article>
      </section>

      {/* Filters Bar */}
      <AdExceptionFilters
        accounts={accounts}
        accountFilter={accountFilter}
        setAccountFilter={setAccountFilter}
        modeFilter={modeFilter}
        setModeFilter={setModeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onReset={resetFilters}
      />

      {/* Main Content Area */}
      {loading ? (
        <article className="panel" style={{ textAlign: "center", padding: "50px 20px" }}>
          <Loader2 size={32} className="spinner" style={{ margin: "0 auto 16px" }} />
          <div style={{ color: "var(--muted)", fontSize: "14px" }}>جاري تحميل استثناءات الإعلانات...</div>
        </article>
      ) : error ? (
        <article className="panel error-state" style={{ textAlign: "center", padding: "40px 20px" }}>
          <AlertTriangle size={32} style={{ margin: "0 auto 12px", color: "var(--red)" }} />
          <h3 style={{ fontSize: "16px", margin: "0 0 8px" }}>تعذر تحميل البيانات</h3>
          <p style={{ fontSize: "13px", color: "var(--muted)" }}>{error}</p>
          <button className="sync-button" onClick={fetchData} style={{ margin: "16px auto 0" }}>
            <RotateCcw size={14} />
            <span>إعادة المحاولة</span>
          </button>
        </article>
      ) : items.length === 0 ? (
        /* Empty State (Requirement 16) */
        <article className="panel empty-state" style={{ textAlign: "center", padding: "60px 20px", background: "var(--surface)", borderRadius: "16px", border: "1px dashed var(--border)" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--foreground)", margin: "0 0 8px" }}>
            لا توجد استثناءات إعلانية حتى الآن.
          </h2>
          <p style={{ fontSize: "14px", color: "var(--muted)", maxWidth: "520px", margin: "0 auto 22px", lineHeight: "1.6" }}>
            أضف استثناءً لحماية إعلان ومجموعته الإعلانية من الإيقاف أو لتحديد حد تكلفة مخصص.
          </p>
          <button className="agent-control" onClick={handleOpenAddDialog} style={{ margin: "0 auto", padding: "10px 22px" }}>
            <Plus size={16} />
            <span>إضافة استثناء</span>
          </button>
        </article>
      ) : filteredItems.length === 0 ? (
        <article className="panel" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ color: "var(--muted)", fontSize: "14.5px" }}>لا توجد استثناءات مطابقة للفلاتر الحالية.</div>
          <button className="reset-btn" onClick={resetFilters} style={{ margin: "16px auto 0" }}>
            <RotateCcw size={13} />
            <span>إعادة ضبط الفلاتر</span>
          </button>
        </article>
      ) : (
        <AdExceptionsTable
          items={filteredItems}
          onEdit={handleOpenEditDialog}
          onDelete={(item) => setDeleteConfirmItem(item)}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* Add / Edit Exception Dialog */}
      <AdExceptionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchData();
        }}
        accounts={accounts}
        initialData={editingItem}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="drawer-backdrop drawer-backdrop--open" style={{ zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div
            className="panel"
            style={{
              width: "100%",
              maxWidth: "460px",
              borderRadius: "16px",
              padding: "22px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--red)" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "var(--red-soft)", display: "grid", placeItems: "center" }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "var(--foreground)" }}>تأكيد حذف الاستثناء</h3>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>الإجراء لا يمكن التراجع عنه</span>
              </div>
            </div>

            <p style={{ fontSize: "13.5px", color: "var(--muted)", margin: 0, lineHeight: "1.6" }}>
              هل أنت تأكد من رغبتك في حذف الاستثناء الخاص بالإعلان{" "}
              <strong style={{ color: "var(--foreground)" }}>"{deleteConfirmItem.ad_name || deleteConfirmItem.meta_ad_id}"</strong>؟
              <br />
              سيتم إزالة الحماية ويعود الإعلان والمجموعة الإعلانية التابعة له لقواعد الإيقاف التلقائي.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
              <button
                type="button"
                className="sync-button"
                onClick={() => setDeleteConfirmItem(null)}
                style={{ padding: "8px 16px" }}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                style={{
                  background: "var(--red)",
                  color: "white",
                  border: 0,
                  borderRadius: "8px",
                  padding: "8px 18px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="spinner" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  "تأكيد الحذف"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
