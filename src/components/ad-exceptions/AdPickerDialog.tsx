"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { X, CheckSquare, Square, Layers, RotateCcw, AlertTriangle, Loader2, Info } from "lucide-react";
import type { AdSummary, AdCreativeGroup, AdStatusFilter, AdPeriodFilter } from "@/types/ad-exceptions";
import { AdPickerSearch } from "./AdPickerSearch";
import { AdPickerFilters } from "./AdPickerFilters";
import { AdPickerResultRow } from "./AdPickerResultRow";
import { AdCreativeGroupCard } from "./AdCreativeGroupCard";

interface AdPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAds: AdSummary[]) => void;
  adAccountId: string;
  initialSelectedAds?: AdSummary[];
}

export function AdPickerDialog({
  isOpen,
  onClose,
  onConfirm,
  adAccountId,
  initialSelectedAds = [],
}: AdPickerDialogProps) {
  // State
  const [ads, setAds] = useState<AdSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<AdStatusFilter>("active");
  const [periodFilter, setPeriodFilter] = useState<AdPeriodFilter>("all");
  const [includeInactive, setIncludeInactive] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"ads" | "creatives">("ads");

  // Selection Map State
  const [selectedMap, setSelectedMap] = useState<Map<string, AdSummary>>(new Map());

  // Initialize selection map when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    const map = new Map<string, AdSummary>();
    for (const ad of initialSelectedAds) {
      map.set(ad.id, ad);
    }
    setSelectedMap(map);
  }, [isOpen, initialSelectedAds]);

  // Fetch Ads API
  const fetchAds = useCallback(
    async (isLoadMore = false, pageNum = 1) => {
      if (!adAccountId) return;

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const params = new URLSearchParams({
          adAccountId,
          search: searchQuery,
          status: statusFilter,
          dateRange: periodFilter,
          includeInactive: includeInactive ? "true" : "false",
          page: String(pageNum),
          limit: "30",
        });

        const res = await fetch(`/api/ad-exceptions/ads?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "تعذر تحميل قائمة الإعلانات.");
        }

        const data = await res.json();
        const fetchedList: AdSummary[] = data.ads || [];

        if (isLoadMore) {
          setAds((prev) => {
            const map = new Map(prev.map((a) => [a.id, a]));
            for (const item of fetchedList) {
              map.set(item.id, item);
            }
            return Array.from(map.values());
          });
        } else {
          setAds(fetchedList);
        }

        setPage(data.page || 1);
        setHasMore(Boolean(data.hasMore));
        setTotalCount(data.totalCount || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [adAccountId, searchQuery, statusFilter, periodFilter, includeInactive]
  );

  // Trigger initial fetch when dialog opens or filters change
  useEffect(() => {
    if (isOpen && adAccountId) {
      setPage(1);
      fetchAds(false, 1);
    }
  }, [isOpen, adAccountId, searchQuery, statusFilter, periodFilter, includeInactive, fetchAds]);

  // Selection Helper Handlers
  const handleToggleSelectAd = (ad: AdSummary) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(ad.id)) {
        next.delete(ad.id);
      } else {
        next.set(ad.id, ad);
      }
      return next;
    });
  };

  const handleSelectAllVisibleActive = () => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      for (const ad of ads) {
        if (ad.effective_status === "ACTIVE") {
          next.set(ad.id, ad);
        }
      }
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedMap(new Map());
  };

  // Grouping by Creative (Requirement 8 & 9)
  const creativeGroups = useMemo(() => {
    const groupsMap = new Map<string, AdSummary[]>();
    const standaloneAds: AdSummary[] = [];

    for (const ad of ads) {
      const cId = ad.creative_id;
      if (cId) {
        const list = groupsMap.get(cId) || [];
        list.push(ad);
        groupsMap.set(cId, list);
      } else {
        standaloneAds.push(ad);
      }
    }

    const groupsList: AdCreativeGroup[] = [];

    for (const [cId, groupAds] of groupsMap.entries()) {
      const rep = groupAds[0];
      const activeCount = groupAds.filter((a) => a.effective_status === "ACTIVE").length;

      const pageNamesSet = new Set<string>();
      for (const a of groupAds) {
        if (a.page_name) pageNamesSet.add(a.page_name);
        else if (a.page_id) pageNamesSet.add(`Page ${a.page_id}`);
      }

      groupsList.push({
        key: cId,
        creative_id: cId,
        representative_name: rep.name,
        thumbnail_url: rep.thumbnail_url || null,
        total_ads: groupAds.length,
        active_ads: activeCount,
        page_count: pageNamesSet.size,
        page_names: Array.from(pageNamesSet),
        ads: groupAds,
      });
    }

    return { groups: groupsList, standalone: standaloneAds };
  }, [ads]);

  const handleSelectAllActiveInGroup = (group: AdCreativeGroup) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      for (const ad of group.ads) {
        if (ad.effective_status === "ACTIVE") {
          next.set(ad.id, ad);
        }
      }
      return next;
    });
  };

  const selectedList = useMemo(() => Array.from(selectedMap.values()), [selectedMap]);
  const selectedAdIdsSet = useMemo(() => new Set(selectedMap.keys()), [selectedMap]);

  if (!isOpen) return null;

  return (
    <div
      className="drawer-backdrop drawer-backdrop--open"
      style={{
        zIndex: 1050,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
      }}
    >
      <div
        className="panel"
        style={{
          width: "100%",
          maxWidth: "960px",
          height: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "18px",
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.6)",
          padding: 0,
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        {/* Sticky Top Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--surface-soft)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Layers size={22} style={{ color: "var(--blue)" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "var(--foreground)" }}>
                اختيار الإعلانات للاستثناء
              </h3>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                اختر الإعلانات الفعالة المراد حمايتها أو ضبط حد مالي مخصص لها
              </span>
            </div>
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
            <X size={22} />
          </button>
        </div>

        {/* Default Notice Banner (Requirement 2) */}
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(59, 130, 246, 0.08)",
            borderBottom: "1px solid var(--border)",
            fontSize: "12.5px",
            color: "var(--blue)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>يتم عرض الإعلانات الفعالة فقط افتراضيًا لتسهيل الوصول إلى الإعلانات الحالية.</span>
        </div>

        {/* Sticky Search & Filter Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            flexShrink: 0,
          }}
        >
          <AdPickerSearch value={searchQuery} onChange={setSearchQuery} loading={loading} />

          <AdPickerFilters
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            includeInactive={includeInactive}
            setIncludeInactive={setIncludeInactive}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          {/* Quick Selection Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              paddingTop: "2px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={handleSelectAllVisibleActive}
                style={{
                  background: "none",
                  border: 0,
                  color: "var(--blue)",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CheckSquare size={14} />
                <span>تحديد جميع الإعلانات الفعالة الظاهرة</span>
              </button>

              <button
                type="button"
                onClick={handleDeselectAll}
                style={{
                  background: "none",
                  border: 0,
                  color: "var(--muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Square size={14} />
                <span>إلغاء تحديد الكل</span>
              </button>
            </div>

            <span style={{ color: "var(--muted)" }}>
              النتائج الظاهرة: <strong>{ads.length}</strong> من إجمالي <strong>{totalCount}</strong>
            </span>
          </div>
        </div>

        {/* Middle Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {loading && page === 1 ? (
            <div style={{ padding: "50px 0", textAlign: "center" }}>
              <Loader2 size={32} className="spinner" style={{ margin: "0 auto 14px" }} />
              <div style={{ color: "var(--muted)", fontSize: "14px" }}>جاري تحميل الإعلانات...</div>
            </div>
          ) : error ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--red)" }}>
              <AlertTriangle size={32} style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>تعذر تحميل الإعلانات. حاول مرة أخرى.</div>
              <div style={{ fontSize: "12.5px", color: "var(--muted)" }}>{error}</div>
              <button
                type="button"
                className="sync-button"
                onClick={() => fetchAds(false, 1)}
                style={{ margin: "16px auto 0" }}
              >
                <RotateCcw size={14} />
                <span>إعادة المحاولة</span>
              </button>
            </div>
          ) : ads.length === 0 ? (
            <div style={{ padding: "50px 20px", textAlign: "center", color: "var(--muted)" }}>
              {statusFilter === "active" && !includeInactive ? (
                <>
                  <h4 style={{ fontSize: "16px", color: "var(--foreground)", margin: "0 0 8px" }}>
                    لا توجد إعلانات فعالة في هذا الحساب.
                  </h4>
                  <p style={{ fontSize: "13px", margin: 0 }}>
                    يمكنك تغيير الفلتر لعرض الإعلانات المتوقفة أو القديمة من الخيارات أعلاه.
                  </p>
                </>
              ) : searchQuery ? (
                <h4 style={{ fontSize: "15px", color: "var(--foreground)", margin: 0 }}>
                  لا توجد نتائج مطابقة لعبارة البحث.
                </h4>
              ) : (
                <h4 style={{ fontSize: "15px", color: "var(--foreground)", margin: 0 }}>
                  لا توجد إعلانات مسجلة في هذا الحساب.
                </h4>
              )}
            </div>
          ) : viewMode === "ads" ? (
            /* Single Ads View */
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {ads.map((ad) => (
                <AdPickerResultRow
                  key={ad.id}
                  ad={ad}
                  isSelected={selectedAdIdsSet.has(ad.id)}
                  onToggleSelect={handleToggleSelectAd}
                />
              ))}
            </div>
          ) : (
            /* Creative Groups View */
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {creativeGroups.groups.map((group) => (
                <AdCreativeGroupCard
                  key={group.key}
                  group={group}
                  selectedAdIds={selectedAdIdsSet}
                  onToggleAdSelect={handleToggleSelectAd}
                  onSelectAllActiveInGroup={handleSelectAllActiveInGroup}
                />
              ))}

              {/* Standalone Ads */}
              {creativeGroups.standalone.length > 0 && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--muted)" }}>
                    إعلانات فردية (بدون Creative ID):
                  </div>
                  {creativeGroups.standalone.map((ad) => (
                    <AdPickerResultRow
                      key={ad.id}
                      ad={ad}
                      isSelected={selectedAdIdsSet.has(ad.id)}
                      onToggleSelect={handleToggleSelectAd}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && !loading && (
            <div style={{ padding: "16px 0", textAlign: "center" }}>
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => fetchAds(true, page + 1)}
                className="sync-button"
                style={{ padding: "10px 24px", fontSize: "13px", margin: "0 auto" }}
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={14} className="spinner" />
                    <span>جاري تحميل المزيد...</span>
                  </>
                ) : (
                  "تحميل المزيد من الإعلانات"
                )}
              </button>
            </div>
          )}
        </div>

        {/* Sticky Bottom Confirmation Bar */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--foreground)" }}>
              تم اختيار <strong style={{ color: "var(--blue)" }}>{selectedList.length}</strong> إعلانات
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              className="sync-button"
              style={{ padding: "8px 18px", fontSize: "13px" }}
            >
              إلغاء
            </button>

            <button
              type="button"
              disabled={selectedList.length === 0}
              onClick={() => {
                onConfirm(selectedList);
                onClose();
              }}
              className="agent-control"
              style={{
                padding: "8px 22px",
                fontSize: "13.5px",
                opacity: selectedList.length === 0 ? 0.5 : 1,
              }}
            >
              <span>تأكيد اختيار ({selectedList.length}) إعلانات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
