import type { Metadata, Viewport } from "next";
import { LanguageProvider } from "@/lib/i18n";
import "./mobile-dark.css";

export const metadata: Metadata = {
  title: "كنيسة مصر الجديدة الإنجيلية | Heliopolis Church",
  description: "تطبيق أعضاء كنيسة مصر الجديدة الإنجيلية للتواصل والخدمات وتسجيل الحضور",
  applicationName: "Heliopolis Church",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Heliopolis Church",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}
