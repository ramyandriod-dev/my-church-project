import type { Metadata } from "next";
import { Amiri, Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"] });
// Classic Arabic serif for the church name and scripture on the dashboard banner.
const amiri = Amiri({ subsets: ["arabic", "latin"], weight: ["400", "700"], variable: "--font-amiri", display: "swap" });

export const metadata: Metadata = {
  title: "منصة إدارة الكنيسة | Church Management Platform",
  description: "المنصة الرقمية المتكاملة لإدارة الكنيسة والرعاية والخدمة الكنسية",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${inter.className} ${amiri.variable}`}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
