"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage, useTranslation, Ltr } from "@/lib/i18n";

export default function SettingsPage() {
  const { locale, setLocale, isRtl } = useLanguage();
  const t = useTranslation();

  const [activeTab, setActiveTab] = React.useState("profile");

  const [selectedTheme, setSelectedTheme] = React.useState("Light");
  const [selectedSidebar, setSelectedSidebar] = React.useState("Expanded");
  const [savedToast, setSavedToast] = React.useState(false);

  const [notifications, setNotifications] = React.useState({
    email: true,
    sms: false,
    push: true,
    weeklyDigest: true,
  });

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  // ─── Password change ──────────────────────────────────────
  //
  // Kept out of the generic `savedToast` flow: this is a real request to a real
  // endpoint that can fail on a wrong current password, and a form that reports
  // "saved" optimistically would be actively misleading here.
  const [passwordForm, setPasswordForm] = React.useState({ current: "", next: "", confirm: "" });
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = React.useState<string | null>(null);

  const MIN_PASSWORD_LENGTH = 12;

  // Mirrors the server's rule so the button is disabled before a round trip. The
  // server still enforces it — this is only to avoid a pointless failed request.
  const passwordMismatch =
    passwordForm.confirm.length > 0 && passwordForm.confirm !== passwordForm.next
      ? "MISMATCH"
      : null;
  const passwordReady =
    passwordForm.current.length > 0 &&
    passwordForm.next.length >= MIN_PASSWORD_LENGTH &&
    passwordForm.confirm === passwordForm.next;

  const settingsNav = [
    { id: "profile", label: t.settingsPage.nav.profile, icon: "user" },
    { id: "organization", label: t.settingsPage.nav.organization, icon: "building" },
    { id: "notifications", label: t.settingsPage.nav.notifications, icon: "bell" },
    { id: "preferences", label: t.settingsPage.nav.preferences, icon: "cog" },
    { id: "appearance", label: t.settingsPage.nav.appearance, icon: "palette" },
    {
      id: "security",
      label: locale === "ar" ? "الأمان" : "Security",
      icon: "lock",
    },
  ];

  return (
    <div className="space-y-6 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/30 min-h-screen p-6 -m-6">
      {/* Toast Notification */}
      {savedToast && (
        <div className="fixed bottom-6 end-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20 text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{t.common.savedSuccessfully}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.settingsPage.title}</h1>
          <p className="text-sm text-gray-500">{t.settingsPage.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="lg:w-60 shrink-0">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {settingsNav.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-start ${
                      activeTab === item.id
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span className="flex-1">{item.label}</span>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="flex-1">

          {activeTab === "profile" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t.settingsPage.profileTitle}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {locale === "ar"
                      ? "تحديث بياناتك الشخصية وحسابك الرعوي"
                      : "Update your personal information and pastoral account"}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.firstName}</label>
                    <input
                      type="text"
                      defaultValue={locale === "ar" ? "داود" : "David"}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.lastName}</label>
                    <input
                      type="text"
                      defaultValue={locale === "ar" ? "إبراهيم" : "Brown"}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.email}</label>
                    <Ltr className="block">
                      <input
                        type="email"
                        defaultValue="pastor.david@church.com"
                        className="input w-full text-start"
                        dir="ltr"
                      />
                    </Ltr>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.phone}</label>
                    <Ltr className="block">
                      <input
                        type="tel"
                        defaultValue="+20 100 123 4567"
                        className="input w-full text-start"
                        dir="ltr"
                      />
                    </Ltr>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.role}</label>
                    <input
                      type="text"
                      defaultValue={t.settingsPage.roleValue}
                      className="input w-full bg-gray-50 text-gray-600 font-medium"
                      disabled
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSave}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                  >
                    {t.settingsPage.saveChanges}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "organization" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t.settingsPage.orgTitle}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {locale === "ar"
                      ? "المعلومات العامة والبيانات الرسمية للكنيسة"
                      : "General church information and official registration"}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.churchName}</label>
                    <input
                      type="text"
                      defaultValue={locale === "ar" ? "كنيسة الرجاء الصالح" : "Grace Community Church"}
                      className="input w-full font-semibold text-gray-900"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.churchAddress}</label>
                    <input
                      type="text"
                      defaultValue={locale === "ar" ? "١٥ شارع الكنيسة، مصر الجديدة، القاهرة" : "123 Faith Street, Springfield, IL 62701"}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.churchPhone}</label>
                    <Ltr className="block">
                      <input
                        type="tel"
                        defaultValue="+20 2 2415 6789"
                        className="input w-full text-start"
                        dir="ltr"
                      />
                    </Ltr>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.website}</label>
                    <Ltr className="block">
                      <input
                        type="url"
                        defaultValue="https://church-platform.org"
                        className="input w-full text-start"
                        dir="ltr"
                      />
                    </Ltr>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.denomination}</label>
                    <input
                      type="text"
                      defaultValue={t.settingsPage.denominationDefault}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.founded}</label>
                    <Ltr className="block">
                      <input
                        type="text"
                        defaultValue="1985"
                        className="input w-full text-start"
                        dir="ltr"
                      />
                    </Ltr>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSave}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                  >
                    {t.settingsPage.saveChanges}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t.settingsPage.notifTitle}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {locale === "ar"
                      ? "إدارة قنوات وتفضيلات استلام التنبيهات الكنسية"
                      : "Manage church alerts and notification delivery channels"}
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    { key: "email", label: t.settingsPage.notifEmail, description: t.settingsPage.notifEmailDesc },
                    { key: "sms", label: t.settingsPage.notifSms, description: t.settingsPage.notifSmsDesc },
                    { key: "push", label: t.settingsPage.notifPush, description: t.settingsPage.notifPushDesc },
                    { key: "weeklyDigest", label: t.settingsPage.notifDigest, description: t.settingsPage.notifDigestDesc },
                  ].map((item) => {
                    const isChecked = notifications[item.key as keyof typeof notifications];
                    return (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50/70 hover:bg-gray-50 rounded-xl border border-gray-100 transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                          dir="ltr"
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            isChecked ? "bg-blue-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              isChecked ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "preferences" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t.settingsPage.prefTitle}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {locale === "ar"
                      ? "إعدادات اللغة والمنطقة الزمنية وطريقة عرض التواريخ"
                      : "Language settings, regional timezone, and date formats"}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.languageLabel}</label>
                    <select
                      value={locale}
                      onChange={(e) => setLocale(e.target.value as "ar" | "en")}
                      className="input w-full sm:w-72 font-medium"
                    >
                      <option value="ar">العربية (Arabic) - الافتراضية</option>
                      <option value="en">English (الإنجليزية)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {locale === "ar"
                        ? "تحويل النظام بالكامل إلى اللغة العربية المتوافقة مع الكنائس في مصر والشرق الأوسط مع اتجاه كامل RTL."
                        : "Switch system entirely to English with standard LTR layout."}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.timezone}</label>
                    <select defaultValue="cairo" className="input w-full sm:w-72">
                      <option value="cairo">{t.settingsPage.timezoneCairo}</option>
                      <option value="jerusalem">{t.settingsPage.timezoneJerusalem}</option>
                      <option value="riyadh">{t.settingsPage.timezoneRiyadh}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.settingsPage.dateFormat}</label>
                    <select defaultValue="ddmmyyyy" className="input w-full sm:w-72">
                      <option value="ddmmyyyy">DD/MM/YYYY (25/12/2025)</option>
                      <option value="yyyymmdd">YYYY-MM-DD (2025-12-25)</option>
                      <option value="full">MMM DD, YYYY</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSave}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                  >
                    {t.settingsPage.saveChanges}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "appearance" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t.settingsPage.appearTitle}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {locale === "ar"
                      ? "تخصيص الألوان والسمة وحجم القائمة الجانبية"
                      : "Customize theme, interface colors, and navigation sidebar"}
                  </p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">{t.settingsPage.theme}</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { id: "Light", label: t.settingsPage.themeLight },
                        { id: "Dark", label: t.settingsPage.themeDark },
                        { id: "System", label: t.settingsPage.themeSystem },
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setSelectedTheme(theme.id)}
                          className={`px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                            selectedTheme === theme.id
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {theme.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">{t.settingsPage.sidebar}</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { id: "Expanded", label: t.settingsPage.sidebarExpanded },
                        { id: "Collapsed", label: t.settingsPage.sidebarCollapsed },
                      ].map((sidebar) => (
                        <button
                          key={sidebar.id}
                          type="button"
                          onClick={() => setSelectedSidebar(sidebar.id)}
                          className={`px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                            selectedSidebar === sidebar.id
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {sidebar.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSave}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                  >
                    {t.settingsPage.saveChanges}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "security" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {locale === "ar" ? "الأمان وكلمة المرور" : "Security & password"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {locale === "ar"
                      ? "غيّر كلمة المرور الخاصة بك. سيؤدي ذلك إلى تسجيل الخروج من الأجهزة الأخرى."
                      : "Change your own password. Doing so signs out your other devices."}
                  </p>
                </div>

                <form
                  className="space-y-4 max-w-md"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setPasswordSaving(true);
                    setPasswordError(null);
                    setPasswordMessage(null);
                    try {
                      const res = await fetch("/api/auth/change-password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          currentPassword: passwordForm.current,
                          newPassword: passwordForm.next,
                        }),
                      });
                      const json = await res.json();
                      if (!res.ok || !json.success) {
                        setPasswordError(
                          json?.error?.message ??
                            (locale === "ar" ? "تعذّر تغيير كلمة المرور" : "Could not change the password")
                        );
                        return;
                      }
                      setPasswordForm({ current: "", next: "", confirm: "" });
                      setPasswordMessage(
                        json.data.otherSessionsRevoked > 0
                          ? locale === "ar"
                            ? `تم تغيير كلمة المرور. تم تسجيل الخروج من ${json.data.otherSessionsRevoked} جهاز آخر.`
                            : `Password changed. Signed out of ${json.data.otherSessionsRevoked} other device${
                                json.data.otherSessionsRevoked === 1 ? "" : "s"
                              }.`
                          : locale === "ar"
                            ? "تم تغيير كلمة المرور."
                            : "Password changed."
                      );
                    } catch {
                      setPasswordError(
                        locale === "ar" ? "تعذّر الاتصال بالخادم" : "Could not reach the server"
                      );
                    } finally {
                      setPasswordSaving(false);
                    }
                  }}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {locale === "ar" ? "كلمة المرور الحالية" : "Current password"}
                    </label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={passwordForm.current}
                      onChange={(e) =>
                        setPasswordForm((f) => ({ ...f, current: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {locale === "ar" ? "كلمة المرور الجديدة" : "New password"}
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.next}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      {locale === "ar"
                        ? `12 حرفًا على الأقل. الطول أهم من الرموز.`
                        : "At least 12 characters. Length matters more than symbols."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {locale === "ar" ? "تأكيد كلمة المرور الجديدة" : "Confirm new password"}
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirm}
                      onChange={(e) =>
                        setPasswordForm((f) => ({ ...f, confirm: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                    />
                  </div>

                  {passwordError && (
                    <p
                      role="alert"
                      className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
                    >
                      <svg
                        className="w-4 h-4 mt-0.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                        />
                      </svg>
                      {passwordError}
                    </p>
                  )}

                  {passwordMessage && (
                    <p
                      role="status"
                      className="flex items-start gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5"
                    >
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {passwordMessage}
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={passwordSaving || passwordMismatch !== null || !passwordReady}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm"
                    >
                      {passwordSaving
                        ? locale === "ar"
                          ? "جارٍ التغيير…"
                          : "Changing…"
                        : locale === "ar"
                          ? "تغيير كلمة المرور"
                          : "Change password"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
