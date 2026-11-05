"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Smartphone } from "lucide-react";
import { LanguageSwitcher, useLanguage } from "@/components/shared/LanguageProvider";

export default function TestLoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
    <div className="w-full max-w-md space-y-6"><div className="flex justify-end"><LanguageSwitcher /></div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="mb-5 inline-flex rounded-xl bg-blue-600 p-3 text-white"><Smartphone size={27} /></span>
        <h1 className="text-2xl font-semibold text-slate-900">FLS Phone Management</h1><p className="mt-3 text-sm leading-6 text-slate-500">{t("ลงชื่อเข้าใช้เพื่อทดสอบบน Production ด้วยรหัสที่ได้รับ หลังเข้าใช้งาน คุณสามารถสลับบทบาทและทดสอบ Import กับฐานข้อมูลจริงได้", "Enter your test password to access Production. Once signed in, you can switch roles and test imports against the live database.")}</p>
        <form className="mt-6 space-y-4" onSubmit={async (event) => {
          event.preventDefault(); if (busy) return; setBusy(true); setError(null);
          try {
            const response = await fetch("/api/test-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Sign in failed.");
            setPassword(""); router.replace("/preview"); router.refresh();
          } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign in failed."); setBusy(false); }
        }}>
          <label className="block text-sm font-medium text-slate-700">{t("รหัสทดสอบ", "Test password")}<input autoComplete="current-password" type="password" required maxLength={256} value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base outline-blue-500" /></label>
          {error && <p role="alert" className="text-sm text-red-700">{t(error)}</p>}
          <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:bg-slate-300"><LockKeyhole size={17} />{busy ? t("กำลังเข้าสู่ระบบ…", "Signing in…") : t("เข้าใช้งาน", "Sign in")}</button>
        </form><p className="mt-5 text-xs leading-6 text-slate-400">{t("รหัสนี้สำหรับกลุ่มผู้ทดสอบ ไม่ใช่บัญชีพนักงานส่วนบุคคล ข้อมูลที่นำเข้าจะบันทึกจริงเมื่อคุณยืนยันเท่านั้น", "This access is for the test group, not individual employee accounts. An import writes real records only when you explicitly confirm it.")}</p>
      </section>
    </div>
  </main>;
}
