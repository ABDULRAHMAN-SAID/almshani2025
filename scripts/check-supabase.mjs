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
  // الأخبار تُقرأ للمسجَّلين وحدهم، فتظهر «محجوبة» لهذه الأداة — وهي تسأل
  // بمفتاح anon بلا جلسة. والمقصود إثبات وجودها لا فتحها.
  "news",
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
  "news_reads",
  "clubs",
  "club_menus",
  "flight_schedule",
  "flight_routes",
  "friendships",
  "conversations",
  "conversation_members",
  "chat_messages",
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
  ["mark_news_read", { p_news_id: ZERO() }],
  ["get_check_in_code_info", { p_activity_id: ZERO() }],
  ["my_friends", {}],
  ["my_conversations", {}],
  ["find_member_by_code", { p_code: "ABC234" }],
  ["my_member_code", {}],
  ["start_direct_chat", { p_other: ZERO() }],
];

/**
 * أعمدة وقيم بعينها — لا جداول.
 *
 * وجودُ الجدول ليس وجودَ كل ما فيه: نُفِّذت نسخةٌ قديمة من ملفّ التحديث، فوُجد
 * جدول الإعلانات وغاب عمود النادي منه، ووُجد نوع التصنيفات وغابت منه قيمتا
 * النادييْن. وكلّ نقصٍ من هذين يُسقط عملية النشر برسالة لا تُفهم، والفحص
 * يقول «كل شيء موجود» — فيُبحث عن العطل في الهاتف وهو في الخادم.
 */
const FIELDS = [
  ["announcements", "club", "إعلانات الأندية"],
  ["users", "code", "رمز الحساب"],
  ["club_menus", "week_start", "أسبوع قائمة الطعام"],
  ["club_menus", "images", "صور القوائم الثلاث"],
  ["activity_checkin_codes", "expires_at", "وقت انتهاء رمز الحضور"],
  ["clubs", "title", "اسم النادي"],
];

/** قيم نوعٍ مُعدَّد: القيمة الغائبة يردّها الخادم بالرمز 22P02. */
const ENUM_VALUES = [
  ["activities", "category", "OfficersClub", "تصنيف نادي الضباط"],
  ["activities", "category", "SeniorNcoClub", "تصنيف نادي كبار ضباط الصف"],
];

function ZERO() {
  return "00000000-0000-0000-0000-000000000000";
}

const BUCKETS = ["activity-images", "app-media"];

/**
 * أكبر مرفق يسمح به التطبيق — الفيديو. لو كان سقف الحاوية دونه، قُبل المقطع
 * على الجهاز ورفضه الخادم بعد أن يُرفع كاملًا، فيرى صاحبه فشلًا بلا سبب بعد
 * انتظار طويل. وهذه مقارنة لا تُغني عنها معرفةُ وجود الحاوية.
 */
const APP_MAX_UPLOAD = 25 * 1024 * 1024;
const mib = (bytes) => `${Math.round(bytes / 1024 / 1024)} ميجابايت`;

/* -------------------------------- الفحص -------------------------------- */

const results = [];
const ICONS = { ok: "✅", guarded: "🔒", missing: "❌" };
const LABELS = { ok: "موجود", guarded: "محجوب (سليم)", missing: "غير موجود" };
const record = (group, name, status, note = "") => {
  results.push({ group, name, status, note });
  console.log(`  ${ICONS[status]} ${name.padEnd(26)} ${LABELS[status]}${note ? dim("  " + note) : ""}`);
};

/**
 * يميّز «غير موجود» عن «ممنوع» عن «ردّ برسالته»: الأول خطأ في التنفيذ،
 * والثاني سلوك مقصود، والثالث دليل وجود لا غياب.
 *
 * ويُحكَم بالرمز لا بنصّ الرسالة: كان المطابِق يقبل «not found» أينما وردت،
 * فدالةٌ نوديت بمعرّف وهمي وردّت «question not found» — أي عملت وأجابت —
 * حُسبت غائبة، وقيل لصاحب المشروع إنّ مخطّطه ناقص وإنّ عليه إعادة تنفيذه.
 * ورسالةُ الدالة عن بياناتها ليست نفيًا لوجودها.
 */
const MISSING_CODES = new Set([
  "42P01", // جدول غير موجود
  "42883", // دالة غير موجودة
  "PGRST202", // لم تجد PostgREST الدالة في المخطّط
  "PGRST205", // ولا الجدول
]);

const missing = (error) => {
  if (!error) return false;
  if (error.code && MISSING_CODES.has(error.code)) return true;
  // بلا رمز: لا نقبل إلا الصيغة التي يكتبها PostgREST نفسه عن عنصر مفقود.
  if (error.code) return false;
  return /could not find the (function|table|relation)|relation .* does not exist|function .* does not exist/i.test(
    error.message ?? ""
  );
};

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

async function checkField(table, column, label) {
  const { error } = await supabase.from(table).select(column, { head: true, count: "exact" }).limit(1);
  // 42703 عمود غير موجود، وPGRST204 لا تعرفه PostgREST في ذاكرة المخطّط.
  if (error && (error.code === "42703" || error.code === "PGRST204" || missing(error))) {
    return record("أعمدة", `${table}.${column}`, "missing", label);
  }
  // خطأٌ آخر يعني أنّ الجدول محجوب عن الزائر، لا أنّ العمود موجود. وقولُ
  // «موجود» عمّا لم يُقرأ كذبٌ يطمئن صاحبه إلى ما لم يُفحص.
  record("أعمدة", `${table}.${column}`, error ? "guarded" : "ok", label);
}

async function checkEnumValue(table, column, value, label) {
  const { error } = await supabase.from(table).select("id", { head: true, count: "exact" }).eq(column, value);
  if (error && (error.code === "22P02" || /invalid input value for enum/i.test(error.message ?? ""))) {
    return record("قيم", value, "missing", label);
  }
  record("قيم", value, "ok", label);
}

async function checkBucket(name) {
  const { error } = await supabase.storage.from(name).list("", { limit: 1 });
  // حاوية غائبة يقول عنها التخزين «Bucket not found» بهذا اللفظ؛ فنقبله هنا
  // وحده، لا كل «not found» كما كان.
  if (error && /bucket not found/i.test(error.message ?? "")) {
    return record("تخزين", name, "missing", error.message?.slice(0, 60));
  }
  const status = error ? "guarded" : "ok";

  // وسقفُها إن سُمح بقراءته: بعض المشاريع تمنع قراءة وصف الحاوية بمفتاح anon،
  // وحينها نقول ذلك صراحةً بدل أن نصمت فيُفهم الصمت سلامةً.
  let note = "";
  try {
    const { data } = await supabase.storage.getBucket(name);
    if (data) {
      const limit = data.file_size_limit;
      if (!limit) note = "بلا سقف محدّد";
      else if (limit < APP_MAX_UPLOAD) {
        note = `سقفها ${mib(limit)} ودون ما يسمح به التطبيق (${mib(APP_MAX_UPLOAD)})`;
        record("تخزين", name, "missing", note);
        return;
      } else note = `سقفها ${mib(limit)}`;
    }
  } catch {
    /* لا يُقرأ الوصف بهذا المفتاح */
  }
  record("تخزين", name, status, note);
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
line(bold("أعمدة وقيم") + dim(" — ما يُضيفه آخر تحديث لقاعدة البيانات"));
for (const [table, column, label] of FIELDS) await checkField(table, column, label);
for (const [table, column, value, label] of ENUM_VALUES) await checkEnumValue(table, column, value, label);

line();
line(bold("حاويات الملفات") + dim(" — إليها تُرفع الصور والفيديو والصوت والملفّات"));
for (const b of BUCKETS) await checkBucket(b);

/* ------------------------- ماذا في التطبيق فعلًا ------------------------- */

/**
 * عدد الصفوف المنشورة في الجداول التي يقرأها كل مستخدم.
 *
 * وجودُ الجدول ليس وجودَ محتوى فيه، وقد خلط الأمران: نُشر خبر ولم يظهر في
 * الصفحة الرئيسية، فكان أول سؤال «هل الجدول موجود؟» والجواب نعم — والسؤال
 * الصحيح كان «هل فيه صفّ؟». هذه الأرقام تفصل بينهما في سطر واحد.
 */
const CONTENT = [
  ["activities", "الأنشطة", true],
  ["announcements", "الإعلانات", true],
  ["awareness_articles", "المحتوى التوعوي", true],
  // الأخبار تُقرأ للمسجَّلين وحدهم، وهذه الأداة تسأل بمفتاح الزائر: فصفر هنا
  // يعني «لا أرى»، لا «لا يوجد». وقولُ صفرٍ عنها يرسل صاحبها ينشر خبرًا مرّة
  // ثانية ظنًّا أن الأولى ضاعت — وهذا ما لا نفعله.
  ["news", "الأخبار", false],
];

line();
line(bold("المحتوى المنشور") + dim(" — ما يراه المستخدم حين يفتح التطبيق"));
for (const [table, label, countable] of CONTENT) {
  if (!countable) {
    line(`  ${dim("—")} ${label.padEnd(18)} ${dim("للمسجَّلين وحدهم — لا يُعدّ بمفتاح الزائر")}`);
    continue;
  }
  const { count, error } = await supabase.from(table).select("id", { head: true, count: "exact" });
  if (error) {
    line(`  ${dim("—")} ${label.padEnd(18)} ${dim("تعذّر العدّ")}`);
    continue;
  }
  const n = count ?? 0;
  line(`  ${n > 0 ? "✅" : "⚠️ "} ${label.padEnd(18)} ${n} ${n === 0 ? dim("— لا شيء منشور بعد") : ""}`);
}

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
  // ونقول أيّ ملفٍّ يُنفَّذ: النقص في الجديد وحده يعني أن آخر تحديث لم
  // يُنفَّذ، لا أن المخطّط كلّه ناقص — وإعادةُ المخطّط كلّه لمن ينقصه جدولٌ
  // واحد عملٌ مخيف بلا داعٍ.
  const NEW_ONES = new Set([
    "clubs", "club_menus", "news_reads", "mark_news_read", "get_check_in_code_info", "flight_schedule",
    "flight_routes", "friendships", "conversations", "conversation_members", "chat_messages",
    "my_friends", "my_conversations", "find_member_by_code", "my_member_code", "start_direct_chat",
  ]);
  const onlyNew = missingItems.every(
    (item) => NEW_ONES.has(item.name) || item.group === "أعمدة" || item.group === "قيم"
  );
  if (onlyNew) {
    line("هذا كلّه يضيفه آخر تحديث لقاعدة البيانات، ولم يُنفَّذ بعد:");
    line("   افتح Supabase ← SQL Editor ← New query، والصق supabase/update-now.sql كاملًا ثم Run.");
  } else {
    line("الغالب أن schema.sql لم يُنفَّذ كاملًا. أعِد تنفيذه من Supabase → SQL Editor.");
  }
}
line();

process.exit(missingItems.length === 0 ? 0 : 1);
