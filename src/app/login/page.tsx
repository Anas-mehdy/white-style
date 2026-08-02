"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, Mail, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

function getSafeRedirectTo(urlStr: string | null): string {
  if (!urlStr) return "/dashboard";
  if (urlStr.startsWith("/") && !urlStr.startsWith("//")) {
    return urlStr;
  }
  return "/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirectTo = searchParams.get("redirectTo");
  const safeRedirectTo = getSafeRedirectTo(rawRedirectTo);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMsg("بيانات الدخول غير صحيحة. يرجى التحقق من البريد الإلكتروني وكلمة المرور.");
        } else {
          setErrorMsg(error.message || "حدث خطأ أثناء تسجيل الدخول.");
        }
        setLoading(false);
        return;
      }

      // Requirement 9: After login use router.replace(safeRedirectTo) then router.refresh()
      router.replace(safeRedirectTo);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "تعذر الاتصال بخادم المصادقة.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {errorMsg && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#f87171",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label htmlFor="email" style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>
          البريد الإلكتروني
        </label>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Mail
            size={18}
            style={{
              position: "absolute",
              right: "14px",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          />
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="anasmehdy1994@gmail.com"
            style={{
              width: "100%",
              background: "#090e1a",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              borderRadius: "10px",
              padding: "12px 42px 12px 14px",
              color: "#f8fafc",
              fontSize: "14px",
              outline: "none",
              direction: "ltr",
              textAlign: "right",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(148, 163, 184, 0.18)")}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label htmlFor="password" style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>
          كلمة المرور
        </label>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Lock
            size={18}
            style={{
              position: "absolute",
              right: "14px",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          />
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              background: "#090e1a",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              borderRadius: "10px",
              padding: "12px 42px 12px 14px",
              color: "#f8fafc",
              fontSize: "14px",
              outline: "none",
              direction: "ltr",
              textAlign: "right",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(148, 163, 184, 0.18)")}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: "10px",
          background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
          color: "#ffffff",
          border: "none",
          borderRadius: "10px",
          padding: "13px",
          fontSize: "15px",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          boxShadow: "0 8px 20px rgba(59, 130, 246, 0.22)",
          opacity: loading ? 0.75 : 1,
          transition: "transform 0.1s, opacity 0.2s",
        }}
      >
        {loading ? (
          <>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span>جارٍ تسجيل الدخول...</span>
          </>
        ) : (
          <>
            <span>تسجيل الدخول</span>
            <ArrowLeft size={18} />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#090e1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "Tahoma, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#0f172a",
          border: "1px solid rgba(148, 163, 184, 0.12)",
          borderRadius: "20px",
          padding: "32px 28px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Header Branding */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: "16px",
              color: "#ffffff",
              boxShadow: "0 8px 20px rgba(59, 130, 246, 0.3)",
              marginBottom: "14px",
            }}
          >
            WS
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#f8fafc",
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            White Style Smart Agent
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "#94a3b8",
              margin: "6px 0 0 0",
            }}
          >
            تسجيل الدخول لإدارة اللوحة الشاملة والحملات
          </p>
        </div>

        <Suspense fallback={<div style={{ color: "#94a3b8", textAlign: "center" }}>جارٍ التحميل...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
