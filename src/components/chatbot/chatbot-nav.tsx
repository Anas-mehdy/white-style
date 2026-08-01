"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  ShoppingBag,
  Tag,
  Link2,
  Settings,
  ChevronLeft
} from "lucide-react";

const tabs = [
  { href: "/chatbot", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/chatbot/inbox", label: "المحادثات والتدخل البشري", icon: MessageSquare },
  { href: "/chatbot/products", label: "المنتجات والأنواع", icon: Package },
  { href: "/chatbot/orders", label: "مسار الطلبات", icon: ShoppingBag },
  { href: "/chatbot/offers", label: "الخصومات والشحن", icon: Tag },
  { href: "/chatbot/attribution", label: "الربط والربحية", icon: Link2 },
  { href: "/chatbot/settings", label: "الإعدادات والصحة", icon: Settings }
];

export function ChatbotNav({ title, subtitle }: { title?: string; subtitle?: string }) {
  const pathname = usePathname();

  return (
    <div style={{ marginBottom: "24px" }}>
      {/* Header Info */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--fg)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <span>الشات بوت الذكي</span>
            <span style={{ fontSize: "12px", fontWeight: 600, padding: "2px 8px", borderRadius: "12px", background: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc" }}>
              v2.0
            </span>
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted)", margin: "4px 0 0 0" }}>
            {subtitle || "إدارة المحادثات، الطلبات، المنتجات والربحية المنسوبة للذكاء الاصطناعي"}
          </p>
        </div>
      </div>

      {/* Sub Navigation Bar & Responsive Mobile Tab Switcher */}
      <nav
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "8px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          scrollbarWidth: "none"
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || (tab.href !== "/chatbot" && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#fff" : "var(--muted)",
                background: isActive ? "rgba(99, 102, 241, 0.2)" : "transparent",
                border: isActive ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid transparent",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
                textDecoration: "none"
              }}
            >
              <Icon size={16} style={{ color: isActive ? "var(--accent-glow)" : "inherit" }} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
