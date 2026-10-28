"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { giftCatalog, type Member360, type MemberReward, type GiftOption } from "@/lib/mock-data/member360";
import { useLanguage, Ltr } from "@/lib/i18n";

interface RewardingSectionProps {
  data: Member360;
  memberName: string;
}

export function RewardingSection({ data, memberName }: RewardingSectionProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";

  const isCommitted = data.attendanceRate >= 90;
  const [rewardsList, setRewardsList] = React.useState<MemberReward[]>(data.rewards || []);
  const [selectedGift, setSelectedGift] = React.useState<GiftOption | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [awardedBy, setAwardedBy] = React.useState(isAr ? "راعي الكنيسة ومجلس الخدام" : "Senior Pastor & Elders");
  const [dedicationNote, setDedicationNote] = React.useState("");
  const [successToast, setSuccessToast] = React.useState<string | null>(null);

  const handleOpenAwardModal = (gift: GiftOption) => {
    setSelectedGift(gift);
    setDedicationNote(isAr ? `مقدمة بكل محبة وتقدير إلى ${memberName} تكريمًا لأمانته ومواظبته المباركة.` : `Presented to ${memberName} in honor of outstanding faithfulness and commitment.`);
    setIsModalOpen(true);
  };

  const handleConfirmAward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGift) return;

    const newReward: MemberReward = {
      id: `rew-${Date.now()}`,
      title: selectedGift.title,
      category: selectedGift.category,
      description: dedicationNote || selectedGift.description,
      dateAwarded: isAr ? "16 سبتمبر 2026" : "Sep 16, 2026",
      status: "Ready for Pickup",
      awardedBy: awardedBy || (isAr ? "فريق الرعاية" : "Pastoral Team"),
      badgeIcon: selectedGift.icon,
    };

    setRewardsList([newReward, ...rewardsList]);
    setIsModalOpen(false);
    setSelectedGift(null);
    setSuccessToast(isAr ? `تم منح "${newReward.title}" بنجاح للعضو ${memberName}!` : `Successfully awarded "${newReward.title}" to ${memberName}!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-500 hover:text-emerald-700 text-sm cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Exceptional Member Recognition Banner */}
      <div className={`relative overflow-hidden rounded-2xl p-6 border shadow-sm ${
        isCommitted
          ? "bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-yellow-500/10 border-amber-300 ring-1 ring-amber-400/30"
          : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              isCommitted
                ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-amber-200"
                : "bg-blue-600 text-white shadow-blue-200"
            }`}>
              {isCommitted ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">
                  {isCommitted ? (isAr ? "⭐ تكريم العضو الذهبي الملتزم (ركيزة كنسية)" : "⭐ Gold Pillar Member Recognition") : (isAr ? "التقدير والتكريم الكنسي" : "Member Recognition & Rewards")}
                </h3>
                {isCommitted && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                    {isAr ? "نسبة الحضور: " : "Attendance: "}<Ltr>{data.attendanceRate}%</Ltr> {isAr ? "(تتجاوز نسبة 90% المطلوبة)" : "(Above 90% Threshold)"}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                {isCommitted
                  ? (isAr ? `يُكرَّم ${memberName} كعضو ملتزم ركيزة في الكنيسة بناءً على مواظبته المستمرة على الحضور بنسبة تفوق 90% ومشاركته العالية وخدمته الأمينة. مؤهل لنيل التكريم السنوي وهدايا المحبة الخاصة.` : `${memberName} is recognized as an Old Committed Member based on sustained attendance above 90%, high engagement, and steadfast service. Eligible for special annual honors and church recognition gifts.`)
                  : (isAr ? `تبلغ نسبة حضور ${memberName} حاليًا ${data.attendanceRate}%. الوصول إلى نسبة مواظبة 90%+ يؤهل للحصول على وسام العضو الذهبي والتكريمات الكنسية.` : `${memberName} has an attendance rate of ${data.attendanceRate}%. Consistent attendance above 90% unlocks full Gold Pillar status and exceptional rewards.`)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full md:w-auto">
            <div className="text-start px-4 py-2 bg-white/80 backdrop-blur rounded-xl border border-amber-200/80">
              <span className="text-xs text-gray-500 block">{isAr ? "المرتبة الحالية" : "Current Status"}</span>
              <span className={`text-sm font-bold ${isCommitted ? "text-amber-700" : "text-blue-700"}`}>
                {isCommitted ? (isAr ? "عضو ذهبي ملتزم (90%+)" : "Gold Pillar (90%+)") : (isAr ? "عضو مواظب فضي" : "Silver Faithful")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gift Options for Exceptional Members */}
      <Card>
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{isAr ? "كتالوج الهدايا التقديرية للأعضاء المتميزين" : "Available Gifts for Exceptional Members"}</h3>
                <p className="text-xs text-gray-500">{isAr ? `اختر هدية تقديرية ومحبة لتقديمها للعضو ${memberName}` : `Select an appreciation gift to present to ${memberName}`}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {giftCatalog.map((gift) => {
              return (
                <div
                  key={gift.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 hover:border-amber-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        {gift.icon === "trophy" && "🏆"}
                        {gift.icon === "book" && "📖"}
                        {gift.icon === "sparkles" && "✨"}
                        {gift.icon === "gift" && "🎁"}
                        {gift.icon === "heart" && "❤️"}
                      </div>
                      <Badge variant="blue">{gift.category}</Badge>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">{gift.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{gift.description}</p>
                    <div className="text-[11px] font-medium text-amber-700 bg-amber-50/70 px-2.5 py-1 rounded-md inline-block mb-4">
                      {isAr ? "شرط الاستحقاق: " : "Eligibility: "}{gift.eligibility}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium shadow-xs cursor-pointer"
                    onClick={() => handleOpenAwardModal(gift)}
                  >
                    <svg className="w-4 h-4 mr-1.5 ms-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {isAr ? "منح هذه الهدية" : "Award This Gift"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Awarded Rewards & Recognition History */}
      <Card>
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">{isAr ? "سجل التكريمات والهدايا التقديرية" : "Awarded Gifts & Honors History"}</h3>
            </div>
            <span className="text-xs text-gray-500">{isAr ? `${rewardsList.length} تكريمات مسجلة` : `${rewardsList.length} items awarded`}</span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {rewardsList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">{isAr ? "لم يتم تسجيل هدايا رسمية لهذا العضو حتى الآن." : "No gifts have been formally awarded to this member yet."}</p>
              <p className="text-xs text-gray-400 mt-1">{isAr ? "استخدم الكتالوج أعلاه لمنح هدايا التقدير والتكريم." : "Use the catalog above to grant recognition gifts."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rewardsList.map((reward) => (
                <div
                  key={reward.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg shrink-0">
                      🏆
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900">{reward.title}</h4>
                        <Badge variant="gray">{reward.category}</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{reward.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1.5">
                        <span>{isAr ? "تاريخ المنح: " : "Date: "}<Ltr>{reward.dateAwarded}</Ltr></span>
                        <span>•</span>
                        <span>{isAr ? "مقدمة من: " : "Awarded By: "}{reward.awardedBy}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      reward.status === "Delivered"
                        ? "bg-emerald-100 text-emerald-800"
                        : reward.status === "Ready for Pickup"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {isAr ? (reward.status === "Ready for Pickup" ? "جاهزة للاستلام" : reward.status === "Delivered" ? "تم التسليم" : "مجدولة") : reward.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Award Gift Modal Dialog */}
      {isModalOpen && selectedGift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{isAr ? "منح هدية وتقدير للعضو" : "Award Member Gift"}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAward} className="mt-4 space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80">
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">{isAr ? "الهدية المختارة" : "Selected Gift"}</span>
                <span className="text-sm font-bold text-gray-900 block mt-0.5">{selectedGift.title}</span>
                <span className="text-xs text-gray-600 block mt-1">{selectedGift.description}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{isAr ? "المكرم" : "Recipient"}</label>
                <input
                  type="text"
                  value={memberName}
                  disabled
                  className="w-full px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-lg text-gray-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{isAr ? "مقدمة من" : "Awarded By"}</label>
                <input
                  type="text"
                  value={awardedBy}
                  onChange={(e) => setAwardedBy(e.target.value)}
                  placeholder={isAr ? "مثال: راعي الكنيسة ومجلس الخدام" : "e.g. Senior Pastor & Elders"}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{isAr ? "كلمة الإهداء والتقدير" : "Dedication Note / Inscription"}</label>
                <textarea
                  rows={3}
                  value={dedicationNote}
                  onChange={(e) => setDedicationNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder={isAr ? "كلمة شكر وتقدير ومحبة شخصية..." : "Personal congratulatory or gratitude note..."}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-medium cursor-pointer"
                >
                  {isAr ? "تأكيد ومنح التكريم" : "Confirm & Grant Award"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
