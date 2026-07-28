"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type {
  ImageAgentBatch,
  ImageAgentUsage,
  SignedImageItem,
} from "@/types/image-agent";
import { SummaryCards } from "./summary-cards";
import { UploadSection } from "./upload-section";
import { ActiveBatchSection } from "./active-batch-section";
import { HistorySection } from "./history-section";
import { ImageLightboxModal } from "./image-lightbox-modal";
import { Sparkles } from "lucide-react";

export function ImageAgentPage() {
  const [usage, setUsage] = useState<ImageAgentUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const [batches, setBatches] = useState<ImageAgentBatch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [activeBatch, setActiveBatch] = useState<ImageAgentBatch | null>(null);
  const [activeItems, setActiveItems] = useState<SignedImageItem[]>([]);
  const [batchWarning, setBatchWarning] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [selectedLightboxItem, setSelectedLightboxItem] = useState<SignedImageItem | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Usage
  const fetchUsage = useCallback(async () => {
    try {
      setUsageLoading(true);
      const res = await fetch("/api/image-agent/usage");
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  // Fetch Batches List
  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/image-agent/batches");
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    }
  }, []);

  // Fetch Batch Details (by ID)
  const fetchBatchDetail = useCallback(async (batchId: string) => {
    try {
      const res = await fetch(`/api/image-agent/batches/${batchId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveBatch(data.batch);
        setActiveItems(data.items || []);
        return data.batch as ImageAgentBatch;
      }
    } catch (err) {
      console.error("Failed to fetch batch detail:", err);
    }
    return null;
  }, []);

  // Initial Load
  useEffect(() => {
    fetchUsage();
    fetchBatches();
  }, [fetchUsage, fetchBatches]);

  // Setup Polling when activeBatch status is queued/processing
  useEffect(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (!activeBatchId) return;

    // Immediately fetch details for selected batch
    fetchBatchDetail(activeBatchId).then((b) => {
      if (b && (b.status === "queued" || b.status === "processing")) {
        pollTimerRef.current = setInterval(async () => {
          const updated = await fetchBatchDetail(activeBatchId);
          if (updated && updated.status !== "queued" && updated.status !== "processing") {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            fetchUsage();
            fetchBatches();
          }
        }, 4000);
      }
    });

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [activeBatchId, fetchBatchDetail, fetchUsage, fetchBatches]);

  // Handle Upload
  const handleStartUpload = async (files: File[]) => {
    try {
      setIsUploading(true);
      setBatchWarning(null);

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/image-agent/batches", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok && !data.batchId) {
        alert(data.error || "حدث خطأ أثناء رفع الصور");
        return;
      }

      if (data.warning) {
        setBatchWarning(data.warning);
      }

      if (data.batchId) {
        setActiveBatchId(data.batchId);
        await fetchUsage();
        await fetchBatches();
      }
    } catch (err) {
      console.error("Error during upload:", err);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Regenerate
  const handleRegenerate = async (itemId: string) => {
    try {
      setBatchWarning(null);
      const res = await fetch(`/api/image-agent/items/${itemId}/regenerate`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok && !data.newBatchId) {
        alert(data.error || "تعذر إجراء إعادة التوليد");
        return;
      }

      if (data.warning) {
        setBatchWarning(data.warning);
      }

      if (data.newBatchId) {
        setActiveBatchId(data.newBatchId);
        await fetchUsage();
        await fetchBatches();
      }
    } catch (err) {
      console.error("Regenerate failed:", err);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  // Handle Retry
  const handleRetry = async (itemId: string) => {
    try {
      setBatchWarning(null);
      const res = await fetch(`/api/image-agent/items/${itemId}/retry`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok && !data.newBatchId) {
        alert(data.error || "تعذر إعادة المحاولة");
        return;
      }

      if (data.warning) {
        setBatchWarning(data.warning);
      }

      if (data.newBatchId) {
        setActiveBatchId(data.newBatchId);
        await fetchUsage();
        await fetchBatches();
      }
    } catch (err) {
      console.error("Retry failed:", err);
      alert("حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  const remainingCount = usage?.remainingCount ?? 20;

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 0" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: "var(--foreground)",
                margin: 0,
              }}
            >
              وكيل الصور
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 10px",
                borderRadius: "8px",
                background: "var(--amber-soft)",
                color: "#f59e0b",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                fontSize: "11px",
                fontWeight: "600",
              }}
            >
              <Sparkles size={12} />
              نسخة تجريبية
            </span>
          </div>
          <p
            style={{
              fontSize: "13.5px",
              color: "var(--muted)",
              marginTop: "6px",
              margin: "6px 0 0",
            }}
          >
            أنشئ صورًا احترافية للمنتجات باستخدام موديل White Style الرسمي
          </p>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <SummaryCards usage={usage} loading={usageLoading} />

      {/* Product Upload Section */}
      <UploadSection
        remainingCount={remainingCount}
        isUploading={isUploading}
        onStartUpload={handleStartUpload}
      />

      {/* Active Batch Section */}
      {activeBatch && (
        <ActiveBatchSection
          batch={activeBatch}
          items={activeItems}
          warning={batchWarning}
          onRegenerate={handleRegenerate}
          onRetry={handleRetry}
          onOpenLightbox={(item) => setSelectedLightboxItem(item)}
        />
      )}

      {/* History Section */}
      <HistorySection
        batches={batches}
        activeBatchId={activeBatchId}
        onSelectBatch={(id) => setActiveBatchId(id)}
      />

      {/* Lightbox Modal */}
      <ImageLightboxModal
        item={selectedLightboxItem}
        onClose={() => setSelectedLightboxItem(null)}
      />
    </div>
  );
}
