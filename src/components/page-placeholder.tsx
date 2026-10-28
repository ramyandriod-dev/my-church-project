"use client";

import * as React from "react";
import { useLanguage } from "@/lib/i18n";

interface PagePlaceholderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function PagePlaceholder({ title, description, icon }: PagePlaceholderProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500">{description}</p>
      </div>
      <div className="card p-12">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 mb-4">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isAr ? "قريبًا" : "Coming Soon"}
          </h3>
          <p className="text-sm text-gray-500">
            {isAr
              ? "هذا القسم قيد التجهيز والتطوير للخدمة الكنسية. ترقب التحديثات قريبًا."
              : "This section is under development. Check back soon for updates."}
          </p>
        </div>
      </div>
    </div>
  );
}
