"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { UploadCloud, X, AlertCircle, FileImage, ShieldCheck } from "lucide-react";

interface SelectedFileItem {
  id: string;
  file: File;
  previewUrl: string;
}

interface UploadSectionProps {
  remainingCount: number;
  isUploading: boolean;
  onStartUpload: (files: File[]) => Promise<void>;
}

const MAX_SUBMISSION_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Byte";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export function UploadSection({
  remainingCount,
  isUploading,
  onStartUpload,
}: UploadSectionProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFiles = (incomingFiles: FileList | File[]) => {
    setErrorMsg(null);
    const validToAdd: SelectedFileItem[] = [];

    let currentError: string | null = null;

    Array.from(incomingFiles).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        currentError = `نوع الملف غير مدعوم (${file.name})`;
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        currentError = `حجم الصورة يجب ألا يتجاوز 10 ميغابايت (${file.name})`;
        return;
      }
      validToAdd.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (currentError) {
      setErrorMsg(currentError);
    }

    if (validToAdd.length === 0) return;

    const newTotalCount = selectedFiles.length + validToAdd.length;

    if (newTotalCount > MAX_SUBMISSION_FILES) {
      setErrorMsg(`عدد الصور المحددة يتجاوز الحد الأقصى للمحاولة الواحدة (${MAX_SUBMISSION_FILES} صور)`);
      return;
    }

    if (newTotalCount > remainingCount) {
      setErrorMsg(`عدد الصور المحددة أكبر من الرصيد المتبقي (${remainingCount} صورة)`);
      return;
    }

    setSelectedFiles((prev) => [...prev, ...validToAdd]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
    setErrorMsg(null);
  };

  const handleClearAll = () => {
    selectedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setSelectedFiles([]);
    setErrorMsg(null);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    const filesToUpload = selectedFiles.map((item) => item.file);
    await onStartUpload(filesToUpload);
    handleClearAll();
  };

  const count = selectedFiles.length;
  const remainingAfter = Math.max(0, remainingCount - count);

  const isSubmitDisabled =
    count === 0 ||
    isUploading ||
    remainingCount <= 0 ||
    count > remainingCount ||
    count > MAX_SUBMISSION_FILES;

  return (
    <div
      style={{
        background: "var(--surface-soft)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "24px",
        marginBottom: "28px",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "700", margin: "0 0 6px" }}>
          رفع صور المنتجات
        </h2>
        <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
          ارفع صورة واحدة أو عدة صور للمنتجات، وسيتم إنشاء صورة مستقلة لكل منتج.
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            background: "var(--red-soft)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
            padding: "12px 16px",
            borderRadius: "10px",
            fontSize: "13px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${
            isDragOver ? "#3b82f6" : "rgba(148, 163, 184, 0.25)"
          }`,
          background: isDragOver ? "rgba(59, 130, 246, 0.05)" : "var(--surface)",
          borderRadius: "12px",
          padding: "36px 20px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s ease",
          marginBottom: "20px",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            background: "rgba(59, 130, 246, 0.1)",
            color: "#60a5fa",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 14px",
          }}
        >
          <UploadCloud size={28} />
        </div>
        <p style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 6px" }}>
          اسحب صور المنتجات إلى هنا
        </p>
        <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 12px" }}>
          أو اضغط لاختيار الصور
        </p>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            color: "#60a5fa",
            background: "rgba(59, 130, 246, 0.08)",
            padding: "4px 10px",
            borderRadius: "6px",
          }}
        >
          <ShieldCheck size={14} />
          <span>سيتم استخدام موديل White Style الرسمي تلقائيًا</span>
        </div>
      </div>

      {/* Selected Images Preview Grid */}
      {selectedFiles.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h4
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--muted)",
              marginBottom: "12px",
            }}
          >
            الصور المحددة ({selectedFiles.length} من {MAX_SUBMISSION_FILES}):
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            {selectedFiles.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "10px",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(item.id);
                  }}
                  style={{
                    position: "absolute",
                    top: "6px",
                    left: "6px",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "rgba(0, 0, 0, 0.6)",
                    color: "#fff",
                    border: "none",
                    display: "grid",
                    placeItems: "center",
                    zIndex: 2,
                  }}
                >
                  <X size={14} />
                </button>
                <div
                  style={{
                    width: "100%",
                    height: "120px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "#000",
                  }}
                >
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={item.file.name}
                  >
                    {item.file.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "11px",
                      color: "var(--muted)",
                      marginTop: "2px",
                    }}
                  >
                    <span>{formatBytes(item.file.size)}</span>
                    <span
                      style={{
                        color: "#10b981",
                        fontWeight: "500",
                        marginInlineStart: "auto",
                      }}
                    >
                      جاهزة
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          justifyContent: "flex-end",
        }}
      >
        {selectedFiles.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isUploading}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            إلغاء الكل
          </button>
        )}
        <button
          type="button"
          disabled={isSubmitDisabled}
          onClick={() => setShowConfirmModal(true)}
          style={{
            padding: "10px 24px",
            borderRadius: "10px",
            background: isSubmitDisabled
              ? "rgba(59, 130, 246, 0.3)"
              : "var(--brand-gradient)",
            color: "#ffffff",
            border: "none",
            fontSize: "14px",
            fontWeight: "600",
            cursor: isSubmitDisabled ? "not-allowed" : "pointer",
            boxShadow: isSubmitDisabled ? "none" : "0 4px 14px var(--brand-shadow)",
            transition: "all 0.2s",
          }}
        >
          {isUploading ? "جاري الرفع والبدء..." : "إنشاء الصور"}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "700",
                margin: "0 0 12px",
                color: "var(--foreground)",
              }}
            >
              تأكيد إنشاء الصور
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "var(--muted)",
                lineHeight: "1.6",
                margin: "0 0 24px",
              }}
            >
              سيتم إنشاء <strong>{count}</strong> صورة، وسيصبح الرصيد المتبقي{" "}
              <strong>{remainingAfter}</strong>.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  background: "var(--brand-gradient)",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: "600",
                  boxShadow: "0 4px 14px var(--brand-shadow)",
                }}
              >
                بدء الإنشاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
