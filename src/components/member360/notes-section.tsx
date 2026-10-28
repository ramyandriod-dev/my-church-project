"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Member360 } from "@/lib/mock-data/member360";
import { useLanguage, Ltr } from "@/lib/i18n";

interface NotesSectionProps {
  data: Member360;
}

export function NotesSection({ data }: NotesSectionProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-100 rounded-lg">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{isAr ? "الملاحظات الرعوية" : "Notes"}</h3>
          </div>
          <button className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
            {isAr ? "+ إضافة ملاحظة" : "+ Add Note"}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.notes.map((n, idx) => (
            <div key={n.id || `note-${idx}`} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">{n.author}</span>
                <span className="text-xs text-gray-400"><Ltr>{n.date}</Ltr></span>
              </div>
              <p className="text-sm text-gray-600">{n.note}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
