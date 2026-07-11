import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "White Style Smart Agent",
  description: "منصة ذكية لإدارة وتحسين حملات White Style الإعلانية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
