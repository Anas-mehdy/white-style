"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface AdPickerSearchProps {
  value: string;
  onChange: (val: string) => void;
  loading?: boolean;
  placeholder?: string;
}

export function AdPickerSearch({
  value,
  onChange,
  loading = false,
  placeholder = "ابحث باسم الإعلان، Meta Ad ID، اسم الحملة، أو Creative ID...",
}: AdPickerSearchProps) {
  const [term, setTerm] = useState(value);
  const isFirstMount = useRef(true);

  useEffect(() => {
    setTerm(value);
  }, [value]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onChange(term);
    }, 400);

    return () => clearTimeout(timer);
  }, [term, onChange]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        className="filter-input"
        style={{
          width: "100%",
          paddingRight: "36px",
          paddingLeft: "36px",
          fontSize: "13.5px",
          height: "42px",
          borderRadius: "10px",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--muted)",
          pointerEvents: "none",
          display: "grid",
          placeItems: "center",
        }}
      >
        {loading ? <Loader2 size={16} className="spinner" /> : <Search size={16} />}
      </div>

      {term && (
        <button
          type="button"
          onClick={() => {
            setTerm("");
            onChange("");
          }}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: 0,
            color: "var(--muted)",
            cursor: "pointer",
            padding: "2px",
            borderRadius: "4px",
            display: "grid",
            placeItems: "center",
          }}
          title="مسح البحث"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
