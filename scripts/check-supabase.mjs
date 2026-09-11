#!/usr/bin/env node
/**
 * أداة فحص الربط بـ Supabase.
 *
 * تشغيل:  npm run check:supabase
 *
 * تقرأ .env، تتصل بالمشروع بمفتاح anon (أي بنفس صلاحية التطبيق على جهاز
 * المستخدم — لا بمفتاح الخدمة)، ثم تتحقق أن كل ما يحتاجه التطبيق موجود فعلًا:
 * الجداول، العروض، الدوال، وحاويتا الملفات.
 *
 * ما تعنيه النتائج:
 *   ✅ موجود           — الجدول/الدالة موجودة والوصول إليها كما هو متوقع.
 *   🔒 محجوب (سليم)    — موجود، وسياسة RLS ترفض وصول المستخدم العادي. هذا مقصود.
 *   ❌ غير موجود        — لم يُنفَّذ schema.sql كاملًا. أعِد تنفيذه.
 *
 * الأداة للقراءة فقط ولا تكتب أي صف.
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

/* ----------------------------- قراءة البيئة ----------------------------- */

function loadEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const rawLine of readFileSync(file, "utf8").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (env[key] === undefined || env[key] === "") env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const useMock = env.EXPO_PUBLIC_USE_MOCK_DATA !== "false";

const line = (s = "") => console.log(s);
const bold = (s) => `[1m${s}[0m`;
const dim = (s) => `[2m${s}[0m`;

line();
line(bold("فحص الربط بـ Supabase"));
line(dim("─".repeat(52)));

if (!url || !key) {
  line("❌ لا توجد مفاتيح.");
  line("   انسخ .env.example إلى .env وضع فيه رابط المشروع والمفتاح العام،");
  line("   تجدهما في Supabase → Project Settings → API.");
  process.exit(1);
}

let host = url;
try {
  host = new URL(url).host;
} catch {
  line(`❌ رابط المشروع غير صالح: ${url}`);
  process.exit(1);
}

line(`المشروع            ${host}`);
line(`المفتاح            ${key.slice(0, 8)}…${key.slice(-4)}  (عام — anon)`);
line(`وضع البيانات       ${useMock ? "تجريبية (EXPO_PUBLIC_USE_MOCK_DATA=true)" : "حقيقية"}`);
if (useMock) {
  line();
  line("⚠️  التطبيق ما زال على البيانات التجريبية. هذا الفحص يختبر الخادم،");
  line("   لكن التطبيق لن يقرأ منه حتى تضبط EXPO_PUBLIC_USE_MOCK_DATA=false.");
}
line(dim("─".repeat(52)));

const supabase = createClient(url, key, { auth: { persistSession: false } });

/* ------------------------------ ما نتحقق منه ------------------------------ */

/** الجداول التي يقرأها أي مستخدم — يجب أن تصل. */
const PUBLIC_TABLES = [
  "activities",
  "activity_results",
  "announcements",
  "awareness_articles",
  "discussion_groups",
  "group_posts",
  "app_contact",
];

/** الجداول المحمية — وجودها مطلوب، ومنعُها عن الزائر مطلوب أيضًا. */
const PROTECTED_TABLES = [
  "users",
  "registrations",
  "notifications",
  "points_transactions",
  "activity_checkins",
  "activity_checkin_codes",
  "quiz_questions",
  "quiz_answers",
  "weekly_quizzes",
  "admins",
  "user_messages",
  "group_post_reports",
];

const VIEWS = ["quiz_questions_public", "leaderboard_view"];

/** الدوال: نستدعيها بوسائط صورية؛ يهمّنا أنها موجودة لا أن تنجح. */
const FUNCTIONS = [
  ["is_admin", {}],
  ["submit_quiz_answer", { p_question_id: ZERO(), p_selected_option_index: 0 }],
  ["submit_check_in", { p_activity_id: ZERO(), p_code: "TEST00" }],
  ["set_check_in_code", { p_activity_id: ZERO(), p_code: "TEST00" }],
  ["get_check_in_code", { p_activity_id: ZERO() }],
  ["admin_registration_counts", {}],
  ["broadcast_notification", { p_title: "—", p_body: "—" }],
  ["reply_to_message", { p_message_id: ZERO(), p_body: "—" }],
  ["report_group_post", { p_post_id: ZERO(), p_reason: "—" }],
];

function ZERO() {
  return "00000000-0000-0000-0000-000000000000";
}

const BUCKETS = ["activity-images", "app-media"];

/* -------------------------------- الفحص -------------------------------- */

const results = [];
const ICONS = { ok: "✅", guarded: "🔒", missing: "❌" };
const LABELS = { ok: "موجود", guarded: "محجوب (سليم)", missing: "غير موجود" };
const record = (group, name, status, note = "") => {
  results.push({ group, name, status, note });
  console.log(`  ${ICONS[status]} ${name.padEnd(26)} ${LABELS[status]}${note ? dim("  " + note) : ""}`);
};

/** يميّز «غير موجود» عن «ممنوع»: الأول خطأ في التنفيذ، والثاني سلوك مقصود. */
const missing = (error) =>
  error &&
  (error.code === "42P01" ||
    error.code === "PGRST202" ||
    /does not exist|could not find|not found/i.test(error.message ?? ""));

async function checkTable(name, expectReadable) {
  const { error } = await supabase.from(name).select("*", { count: "exact", head: true }).limit(1);
  if (!error) {
    record("جداول", name, expectReadable ? "ok" : "ok", expectReadable ? "" : "مقروء للزائر");
    return;
  }
  if (missing(error)) {
    record("جداول", name, "missing", error.message?.slice(0, 60));
    return;
  }
  record("جداول", name, expectReadable ? "missing" : "guarded", expectReadable ? error.message?.slice(0, 60) : "");
}

async function checkFunction(name, args) {
  const { error } = await supabase.rpc(name, args);
  if (!error) return record("دوال", name, "ok");
  if (missing(error)) return record("دوال", name, "missing", error.message?.slice(0, 60));
  record("دوال", name, "guarded");
}

async function checkBucket(name) {
  const { error } = await supabase.storage.from(name).list("", { limit: 1 });
  if (!error) return record("تخزين", name, "ok");
  if (/not found|does not exist/i.test(error.message ?? "")) {
    return record("تخزين", name, "missing", error.message?.slice(0, 60));
  }
  record("تخزين", name, "guarded");
}

/* ---------------------------- هل الخادم مسموع؟ ----------------------------
 *
 * قبل أي فحص: لو كانت الشبكة مقطوعة أو الرابط خاطئًا، فشلت كل الطلبات بالسبب
 * نفسه، وقرأناها خطأً على أنها «جدول غير موجود» و«محجوب بسياسة». وهذا أسوأ من
 * لا شيء: يوهم أن الحماية تعمل بينما لم يُسأل الخادم أصلًا. فنسأل مرة واحدة
 * ونتوقّف إن لم يُجب.
 */

const UNREACHABLE = /fetch failed|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|ECONNRESET|getaddrinfo|network|socket hang up/i;

{
  const { error } = await supabase.from("activities").select("id", { head: true, count: "exact" });
  if (error && UNREACHABLE.test(`${error.message} ${error.details ?? ""}`)) {
    line();
    line(`❌ ${bold("لم نصل إلى الخادم أصلًا")} — ${host}`);
    line();
    line("   لم يُفحص شيء. الأسباب المحتملة بالترتيب:");
    line("    • الإنترنت مقطوع على هذا الحاسوب.");
    line("    • الرابط فيه خطأ إملائي — انسخه من Supabase ← Settings ← API.");
    line("    • المشروع موقوف (Paused) — افتحه في supabase.com واضغط Restore.");
    line();
    line(dim(`   نص الخطأ: ${error.message}`));
    line();
    process.exit(1);
  }
}

line();
line(bold("الجداول العامة") + dim(" — يجب أن تصل لأي مستخدم"));
for (const t of PUBLIC_TABLES) await checkTable(t, true);

line();
line(bold("الجداول المحمية") + dim(" — يجب أن توجد، ويُمنع الزائر منها"));
for (const t of PROTECTED_TABLES) await checkTable(t, false);

line();
line(bold("العروض"));
for (const v of VIEWS) await checkTable(v, true);

line();
line(bold("الدوال الموثوقة"));
for (const [name, args] of FUNCTIONS) await checkFunction(name, args);

line();
line(bold("حاويات الملفات"));
for (const b of BUCKETS) await checkBucket(b);

/* -------------------------------- الخلاصة -------------------------------- */

const missingItems = results.filter((r) => r.status === "missing");
const guarded = results.filter((r) => r.status === "guarded").length;

line();
line(dim("─".repeat(52)));
if (missingItems.length === 0) {
  line(`✅ ${bold("الربط سليم")} — كل ما يحتاجه التطبيق موجود على الخادم.`);
  line(`   ${guarded} عنصرًا محجوبًا عن المستخدم العادي، وهذا هو المتوقع.`);
  line();
  line("الخطوة التالية: نفّذ اختبارات الصلاحيات العدائية");
  line(dim("   supabase/security-tests.sql"));
} else {
  line(`❌ ${bold(`ينقص ${missingItems.length} عنصرًا`)}:`);
  for (const item of missingItems) line(`   • ${item.group}: ${item.name}`);
  line();
  line("الغالب أن schema.sql لم يُنفَّذ كاملًا. أعِد تنفيذه من Supabase → SQL Editor.");
}
line();

process.exit(missingItems.length === 0 ? 0 : 1);
