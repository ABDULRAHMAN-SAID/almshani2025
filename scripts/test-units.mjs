#!/usr/bin/env node
/**
 * اختبار منطق التطبيق الخالص.
 *
 *   npm run test:units
 *
 * الفحوص الأخرى تسأل الخادم. وهذا يسأل الدوال التي تعمل على الجهاز: توحيد
 * الأرقام، وتحويل صفوف القاعدة إلى نماذج، والتواريخ العربية، والتقويم،
 * وصياغة العدد، وترجمة الأخطاء.
 *
 * ويُعاد تشغيل كل شيء في أربع مناطق زمنية، لأن أخطاء التاريخ لا تظهر إلا خارج
 * منطقة من كتبها: عُمان شرقيّ غرينتش، فعطلٌ يقرأ التاريخ بتوقيت غرينتش يبدو
 * سليمًا هنا ويتأخّر يومًا كاملًا عند أول جهاز غربيّها.
 *
 * لا يحتاج إطار اختبارات ولا شبكة: يجرّد الأنواع بـ tsc ثم ينفّذ ويقارن.
 */

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const B = (s) => `[1m${s}[0m`;
const DIM = (s) => `[2m${s}[0m`;
const GREEN = (s) => `[32m${s}[0m`;
const RED = (s) => `[31m${s}[0m`;
const say = (s = "") => console.log(s);

/* ------------------------- تجريد الأنواع ثم التحميل ------------------------- */

/** الوحدات الخالصة: لا تستورد شيئًا يعمل وقت التشغيل، فتُحمَّل وحدها. */
const MODULES = [
  "src/utils/identity.ts",
  "src/utils/date.ts",
  "src/utils/calendar.ts",
  "src/utils/arabic.ts",
  "src/utils/errors.ts",
  "src/services/rowMappers.ts",
  "src/utils/media.ts",
];

const work = mkdtempSync(join(tmpdir(), "anshatati-units-"));
mkdirSync(join(work, "src/utils"), { recursive: true });
mkdirSync(join(work, "src/services"), { recursive: true });

for (const file of MODULES) {
  // استيراد الأنواع وحده يُمحى عند التجريد؛ نُبدّل مسار الاسم المستعار بملف
  // فارغ حتى لا يبحث عنه المترجم.
  const source = readFileSync(file, "utf8").replace(/from "@\/types\/models"/g, 'from "./__types"');
  writeFileSync(join(work, file), source, "utf8");
}
writeFileSync(join(work, "src/utils/__types.ts"), "export type Unused = never;\n", "utf8");
writeFileSync(join(work, "src/services/__types.ts"), "export type Unused = never;\n", "utf8");

const compiled = spawnSync(
  "npx",
  ["tsc", "--outDir", join(work, "out"), "--module", "esnext", "--target", "es2020",
   "--moduleResolution", "bundler", "--skipLibCheck", "--rootDir", work,
   ...MODULES.map((f) => join(work, f))],
  { encoding: "utf8" }
);
const noise = (compiled.stdout ?? "").split("\n").filter((l) => l && !/TS2307|TS2305|TS6059/.test(l));
if (noise.length) {
  say(RED("فشل تجريد الأنواع:"));
  say(noise.slice(0, 10).join("\n"));
  process.exit(1);
}

// ملفات .js صادرة من مشروع بلا "type":"module" — نعيد تسميتها ليقرأها node كوحدات.
const outDir = join(work, "out");
for (const file of MODULES) {
  const js = join(outDir, file.replace(/\.ts$/, ".js"));
  cpSync(js, js.replace(/\.js$/, ".mjs"));
}
const load = async (file) =>
  import(pathToFileURL(join(outDir, file.replace(/^src\//, "src/").replace(/\.ts$/, ".mjs"))).href);

// المسارات النسبية بين الوحدات ما زالت بلا لاحقة؛ نُصلحها في الصادر.
for (const file of MODULES) {
  const target = join(outDir, file.replace(/\.ts$/, ".mjs"));
  const patched = readFileSync(target, "utf8").replace(/from ['"](\.[^'"]*?)['"]/g, (m, rel) =>
    rel.endsWith(".mjs") ? m : `from "${rel}.mjs"`
  );
  writeFileSync(target, patched, "utf8");
}

const identity = await load("src/utils/identity.ts");
const dates = await load("src/utils/date.ts");
const calendar = await load("src/utils/calendar.ts");
const arabic = await load("src/utils/arabic.ts");
const errors = await load("src/utils/errors.ts");
const mappers = await load("src/services/rowMappers.ts");
const media = await load("src/utils/media.ts");

/* -------------------------------- الاختبارات -------------------------------- */

let passed = 0;
const failures = [];

function check(area, rule, expected, actual) {
  const same = JSON.stringify(expected) === JSON.stringify(actual);
  if (same) passed += 1;
  else failures.push({ area, rule, expected, actual });
}

function runAll(tz) {
  // ---- هويّة الحساب ----
  check("الهوية", "رقم محلي ← دولي", "+96891234567", identity.normalizePhone("91234567"));
  check("الهوية", "رقم بمسافات وشرطات", "+96891234567", identity.normalizePhone(" 9123-4567 "));
  check("الهوية", "رقم دولي يبقى كما هو", "+96891234567", identity.normalizePhone("+96891234567"));
  check("الهوية", "صفر بادئ لا يُعدّ محليًا", "+096891234", identity.normalizePhone("096891234"));
  check("الهوية", "الرقم المحلي صالح", true, identity.isValidPhone("91234567"));
  check("الهوية", "رقم قصير غير صالح", false, identity.isValidPhone("123"));
  check("الهوية", "بريد صحيح", true, identity.looksLikeEmail("a@b.co"));
  check("الهوية", "بريد بلا نطاق", false, identity.looksLikeEmail("a@b"));
  check("الهوية", "رقم ليس بريدًا", false, identity.looksLikeEmail("91234567"));

  // ---- التواريخ ----
  check(`التواريخ (${tz})`, "اليوم والشهر", "11 سبتمبر", dates.formatArabicDate("2026-09-11"));
  check(`التواريخ (${tz})`, "يوم الأسبوع", "الجمعة", dates.formatArabicWeekday("2026-09-11"));
  check(`التواريخ (${tz})`, "أول يوم في السنة", "1 يناير", dates.formatArabicDate("2026-01-01"));
  check(`التواريخ (${tz})`, "آخر يوم في السنة", "31 ديسمبر", dates.formatArabicDate("2026-12-31"));
  check(`التواريخ (${tz})`, "تاريخ بوقت ملحق", "11 سبتمبر", dates.formatArabicDate("2026-09-11T22:00:00Z"));

  check("الوقت", "صباح", "09:00 صباحًا", dates.formatArabicTime("09:00"));
  check("الوقت", "مساء", "01:30 مساءً", dates.formatArabicTime("13:30"));
  check("الوقت", "منتصف الليل", "12:00 صباحًا", dates.formatArabicTime("00:00"));
  check("الوقت", "الظهر", "12:00 مساءً", dates.formatArabicTime("12:00"));

  // ساعة عُمان تُحسب من غرينتش: الجواب واحد في المناطق الأربع كلها، وهو
  // الغرض منها — أن تقول توقيت القاعدة لا توقيت الجهاز.
  const omanAt = (iso) => dates.omanDateTimeLabel(new Date(iso));
  check(`ساعة عُمان (${tz})`, "ظهرًا", "الثلاثاء 15 سبتمبر · 4:00 م", omanAt("2026-09-15T12:00:00Z"));
  check(`ساعة عُمان (${tz})`, "منتصف الليل بغرينتش", "الثلاثاء 15 سبتمبر · 4:00 ص", omanAt("2026-09-15T00:00:00Z"));
  check(`ساعة عُمان (${tz})`, "قبل منتصف الليل بغرينتش يعبر اليوم", "الأربعاء 16 سبتمبر · 2:30 ص", omanAt("2026-09-15T22:30:00Z"));
  check(`ساعة عُمان (${tz})`, "الثانية عشرة ظهرًا", "الثلاثاء 15 سبتمبر · 12:00 م", omanAt("2026-09-15T08:00:00Z"));
  check(`ساعة عُمان (${tz})`, "الثانية عشرة ليلًا", "الثلاثاء 15 سبتمبر · 12:00 ص", omanAt("2026-09-14T20:00:00Z"));

  const today = calendar.toLocalIso(new Date());
  const plus = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return calendar.toLocalIso(d);
  };
  check(`النسبي (${tz})`, "اليوم", "اليوم", dates.relativeDayLabel(today));
  check(`النسبي (${tz})`, "غدًا", "غدًا", dates.relativeDayLabel(plus(1)));
  check(`النسبي (${tz})`, "بعد يومين", "بعد 2 يومين", dates.relativeDayLabel(plus(2)));
  check(`النسبي (${tz})`, "بعد ثلاثة", "بعد 3 أيام", dates.relativeDayLabel(plus(3)));

  // ---- التقويم ----
  const grid = calendar.buildMonthGrid(2026, 8); // سبتمبر 2026: يبدأ ثلاثاء، 30 يومًا
  check("التقويم", "الشبكة صفوف كاملة", 0, grid.length % 7);
  check("التقويم", "خانتا حشو قبل الأول", 2, grid.findIndex((c) => c.day === 1));
  check("التقويم", "عدد أيام سبتمبر", 30, grid.filter((c) => c.day !== null).length);
  check("التقويم", "أول يوم في موضعه", "2026-09-01", grid[2].iso);
  check("التقويم", "فبراير الكبيسة", 29, calendar.buildMonthGrid(2028, 1).filter((c) => c.day !== null).length);
  check("التقويم", "فبراير العادية", 28, calendar.buildMonthGrid(2026, 1).filter((c) => c.day !== null).length);

  const acts = [
    { id: "1", date: "2026-09-11" },
    { id: "2", date: "2026-09-11" },
    { id: "3", date: "2026-10-02" },
    { id: "4", date: "2025-09-11" },
  ];
  check("التقويم", "تجميع حسب اليوم", 2, calendar.groupActivitiesByDate(acts)["2026-09-11"].length);
  const byMonth = calendar.groupActivitiesByMonth(acts, 2026);
  check(`التقويم (${tz})`, "سبتمبر فيه نشاطان", 2, byMonth[8]?.length ?? 0);
  check(`التقويم (${tz})`, "أكتوبر فيه نشاط", 1, byMonth[9]?.length ?? 0);
  check(`التقويم (${tz})`, "سنة أخرى تُستبعد", undefined, byMonth[11]);

  // ---- صياغة العدد ----
  check("العدد", "واحد", "نشاط واحد", arabic.pluralizeAr(1, arabic.ACTIVITY_FORMS));
  check("العدد", "اثنان", "نشاطان", arabic.pluralizeAr(2, arabic.ACTIVITY_FORMS));
  check("العدد", "ثلاثة", "3 أنشطة", arabic.pluralizeAr(3, arabic.ACTIVITY_FORMS));
  check("العدد", "عشرة", "10 أنشطة", arabic.pluralizeAr(10, arabic.ACTIVITY_FORMS));
  check("العدد", "أحد عشر", "11 نشاطًا", arabic.pluralizeAr(11, arabic.ACTIVITY_FORMS));

  // ---- ترجمة الأخطاء ----
  check("الأخطاء", "رسالة الخدمة العربية تمرّ", "كلمة المرور غير صحيحة",
    errors.toArabicMessage(new Error("كلمة المرور غير صحيحة")));
  // المجهول يسقط للبديل، ويحمل معه كلام الخادم: البديل وحده لا يُعرَف منه شيء.
  check("الأخطاء", "الإنجليزية المجهولة تسقط للبديل", "بديل\n(Unexpected)",
    errors.toArabicMessage(new Error("Unexpected"), "بديل"));
  check("الأخطاء", "بلا نصّ يبقى البديل وحده", "بديل", errors.toArabicMessage({}, "بديل"));
  check("الأخطاء", "كلام الخادم يُقصّ ولا يُطيل الرسالة", true,
    errors.toArabicMessage(new Error("x".repeat(400)), "بديل").length < 170);
  check("الأخطاء", "الشبكة", "لا يوجد اتصال بالإنترنت. تحقّق من الشبكة وحاول مرة أخرى.",
    errors.toArabicMessage(new Error("Network request failed")));
  check("الأخطاء", "رمز التكرار", "هذا العنصر مسجَّل مسبقًا.", errors.toArabicMessage({ code: "23505" }));
  check("الأخطاء", "منع 403", "ليست لديك صلاحية لهذه العملية.", errors.toArabicMessage({ status: 403 }));
  check("الأخطاء", "انقطاع الشبكة يُعرف", true, errors.isNetworkError(new Error("Failed to fetch")));
  // حدود الرفع: من يرفع مقطعًا ويرى «تعذّر إتمام العملية» لا يعرف أعليه أن
  // يختار ملفًّا أصغر أم أن المشكلة ليست عنده.
  check("الأخطاء", "ملف أكبر من الحدّ (413)", "الملفّ أكبر من الحدّ المسموح به. اختر ملفًّا أصغر.",
    errors.toArabicMessage({ status: 413 }));
  check("الأخطاء", "مساحة الخادم ممتلئة (507)",
    "مساحة التخزين على الخادم ممتلئة. على الإدارة حذف مرفقات قديمة أو توسيع الخطة.",
    errors.toArabicMessage({ status: 507 }));
  check("الأخطاء", "امتلاء المساحة من نصّ الرسالة",
    "مساحة التخزين على الخادم ممتلئة. على الإدارة حذف مرفقات قديمة أو توسيع الخطة.",
    errors.toArabicMessage(new Error("Storage limit exceeded for project")));
  check("الأخطاء", "حجم كبير من نصّ الرسالة", "الملفّ أكبر من الحدّ المسموح به. اختر ملفًّا أصغر.",
    errors.toArabicMessage(new Error("Payload too large")));

  // نقص الخادم: صنفٌ كان كلّه يسقط في الرسالة البديلة، فيقرأ الناشر «تعذّر
  // نشر القائمة» ويعيد المحاولة عشرًا وهي لا تنجح مرّة — والعطل أنّ الجدول
  // لم يُنشأ بعد. وهذه الفحوص تثبت أن كل صورة من صوره تقول ما يُعمل.
  const behind = errors.toArabicMessage({ code: "42P01", message: "relation \"club_menus\" does not exist" }, "تعذّر نشر القائمة");
  check("الأخطاء", "جدول غير موجود يُسمّى الحلّ", true, behind.includes("update-now.sql"));
  check("الأخطاء", "جدول غير موجود ليس البديل", false, behind === "تعذّر نشر القائمة");
  for (const [name, err] of [
    ["عمود غير موجود", { code: "42703", message: 'column announcements.club does not exist' }],
    ["دالة غير موجودة", { code: "42883", message: "function mark_news_read(uuid) does not exist" }],
    ["لا مفتاح فريد للـ upsert", { code: "42P10", message: "there is no unique or exclusion constraint matching the ON CONFLICT specification" }],
    ["جدول خارج ذاكرة المخطّط", { code: "PGRST205", message: "Could not find the table 'public.club_menus' in the schema cache" }],
    ["عمود خارج ذاكرة المخطّط", { code: "PGRST204", message: "Could not find the 'club' column of 'announcements' in the schema cache" }],
    ["قيمة تصنيف لا يعرفها الخادم", { code: "22P02", message: 'invalid input value for enum activity_category: "OfficersClub"' }],
    ["نصّ بلا رمز", new Error('Could not find the table \'public.clubs\' in the schema cache')],
  ]) {
    check("الأخطاء", name + " ← تحديث قاعدة البيانات", true,
      errors.toArabicMessage(err, "تعذّر نشر القائمة").includes("update-now.sql"));
  }
  // ولا يبتلع هذا ما ليس منه: صلاحيةٌ مرفوضة تبقى صلاحية.
  check("الأخطاء", "منع RLS يبقى منعًا", "ليست لديك صلاحية لهذه العملية.",
    errors.toArabicMessage({ code: "42501", message: "new row violates row-level security policy" }));

  // ---- المرفقات ----
  // طبقة الرفع كلّها كانت بلا تحقّق واحد: حدودها وامتداداتها وفكّ ترميزها.
  const overLimit = (kind, size) => {
    try { media.assertWithinLimit(kind, size); return false; } catch { return true; }
  };
  check("المرفقات", "صورة دون الحدّ تمرّ", false, overLimit("image", 2 * 1024 * 1024));
  check("المرفقات", "صورة كاميرا حديثة تمرّ", false, overLimit("image", 5 * 1024 * 1024));
  check("المرفقات", "صورة فوق الحدّ تُرفض", true, overLimit("image", 7 * 1024 * 1024));
  check("المرفقات", "الحدّ نفسه يمرّ", false, overLimit("image", 6 * 1024 * 1024));
  check("المرفقات", "فيديو ٢٠ ميجا يمرّ", false, overLimit("video", 20 * 1024 * 1024));
  check("المرفقات", "فيديو ٣٠ ميجا يُرفض", true, overLimit("video", 30 * 1024 * 1024));
  check("المرفقات", "صوت ٩ ميجا يُرفض", true, overLimit("audio", 9 * 1024 * 1024));
  check("المرفقات", "ملف ٩ ميجا يمرّ", false, overLimit("file", 9 * 1024 * 1024));
  // حدّ الحاوية على الخادم ٢٥ ميجابايت؛ فلو تجاوزه حدّ التطبيق لقُبل الملف
  // في الجهاز ورفضه الخادم بعد انتظار الرفع كلّه.
  check("المرفقات", "لا حدّ يتجاوز حدّ الحاوية", true,
    Object.values(media.MEDIA_LIMITS).every((l) => l.bytes <= 26214400));

  // النوع من نوعه الصِّرف: صورة اختيرت من متصفّح الملفات تبقى صورة بحدّها هي
  check("المرفقات", "صورة من متصفّح الملفات تبقى صورة", "image", media.kindOfMime("image/png"));
  check("المرفقات", "مستند يبقى ملفًا", "file", media.kindOfMime("application/pdf"));
  check("المرفقات", "مجهول النوع ملفّ", "file", media.kindOfMime("application/octet-stream"));

  check("المرفقات", "امتداد من النوع", "jpg", media.extensionOf({ mimeType: "image/jpeg", name: "x" }));
  check("المرفقات", "امتداد m4a للصوت", "m4a", media.extensionOf({ mimeType: "audio/mp4", name: "x" }));
  check("المرفقات", "نوع مجهول يأخذ امتداد الاسم", "docx",
    media.extensionOf({ mimeType: "application/x-unknown", name: "تقرير.docx" }));
  check("المرفقات", "بلا نوع ولا امتداد", "bin",
    media.extensionOf({ mimeType: "application/x-unknown", name: "ملف" }));

  // فكّ base64: بايت خاطئ واحد يرفع ملفًا تالفًا لا يُفتح، ولا يظهر إلا عند فتحه
  check("المرفقات", "فكّ base64 يعيد البايتات", [72, 105],
    Array.from(media.base64ToBytes("SGk=")));
  check("المرفقات", "فكّ base64 يتجاهل الفراغ والأسطر", [72, 105],
    Array.from(media.base64ToBytes("SG\nk=")));
  check("المرفقات", "حجم base64 تقريبي", 3, media.bytesOfBase64("AAAA"));

  check("المرفقات", "الحجم بالكيلوبايت", "420 كيلوبايت", media.formatBytes(430080));
  check("المرفقات", "الحجم بالميجابايت", "1٫8 ميجابايت", media.formatBytes(1887437));
  check("المرفقات", "حجم صفر لا يُعرض", "", media.formatBytes(0));
  check("المرفقات", "المدة دقيقة وثانيتان", "1:02", media.formatDuration(62000));
  check("المرفقات", "المدة صفر", "0:00", media.formatDuration(0));

  // ---- تحويل صفوف القاعدة ----
  const activity = mappers.toActivity({
    id: "a1", title: "محاضرة", description: "وصف", category: "Lecture",
    cover_image: null, date: "2026-09-18", start_time: "10:00:00", end_time: "11:30:00",
    location: "قاعة", capacity: 80, registration_status: "open",
    registration_deadline: null, is_annual: false, created_at: "2026-09-11T17:56:33.692971+00:00",
  });
  check("المحوّلات", "الوقت يُقصّ إلى ساعة ودقيقة", "10:00", activity.startTime);
  check("المحوّلات", "وقت النهاية كذلك", "11:30", activity.endTime);
  check("المحوّلات", "حالة التسجيل تصل", "open", activity.registrationStatus);
  check("المحوّلات", "الطابع الزمني يصير يومًا", "2026-09-11", activity.createdAt);
  check("المحوّلات", "الصورة الفارغة تصير undefined", undefined, activity.coverImage);
  check("المحوّلات", "السعة رقم", 80, activity.capacity);

  const announcement = mappers.toAnnouncement({
    id: "n1", title: "إعلان", description: "نص", type: "عام",
    image: null, attachments: null, published_at: "2026-09-10T08:00:00+00:00",
  });
  check("المحوّلات", "تاريخ النشر يومًا", "2026-09-10", announcement.publishedAt);
  check("المحوّلات", "المرفقات الفارغة مصفوفة", [], announcement.attachments);

  const points = mappers.toPointsTransaction({
    id: "p1", user_id: "u1", reason: "quiz_correct", points: 10,
    created_at: "2026-09-11T00:00:00Z", activities: { title: "مسابقة" },
  });
  check("المحوّلات", "عنوان النشاط من العلاقة", "مسابقة", points.activityTitle);
  check("المحوّلات", "النقاط رقم", 10, points.points);

  // قوائم النادي: صورةٌ واحدة كانت، فصارت ثلاثًا بأنواعها. ومن نشر قائمته
  // قبل التغيير لا ينبغي أن تختفي صورته لأنّ شكل الحقل تبدّل.
  const legacyMenu = mappers.toClubMenu({
    id: "m1", club: "OfficersClub", week_start: "2026-09-06",
    image: "https://old/one.jpg", images: [], days: [], note: "", published_at: "2026-09-06T00:00:00Z",
  });
  check("المحوّلات", "صورة القائمة القديمة لا تضيع", "https://old/one.jpg", legacyMenu.images[0]?.image);
  check("المحوّلات", "وتُقرأ على أنّها الغداء", "غداء", legacyMenu.images[0]?.meal);

  const menu = mappers.toClubMenu({
    id: "m2", club: "OfficersClub", week_start: "2026-09-13", image: "https://old/one.jpg",
    images: [{ meal: "فطور", image: "a.jpg" }, { meal: "عشاء", image: "c.jpg" }],
    days: [], note: "", published_at: "2026-09-13T00:00:00Z",
  });
  check("المحوّلات", "الصور الجديدة تسبق القديمة", 2, menu.images.length);
  check("المحوّلات", "ترتيب الصور محفوظ", "فطور", menu.images[0]?.meal);

  const emptyMenu = mappers.toClubMenu({
    id: "m3", club: "SeniorNcoClub", week_start: "2026-09-13", image: null,
    images: [{ meal: "فطور", image: "" }], days: [], note: "", published_at: "2026-09-13T00:00:00Z",
  });
  check("المحوّلات", "صورة فارغة لا تُعدّ صورة", 0, emptyMenu.images.length);
}

/* -------------------------------- التشغيل -------------------------------- */

const ZONES = ["Asia/Muscat", "UTC", "Europe/London", "America/New_York"];

say();
say(B("  منطق التطبيق"));
say(DIM("  " + "─".repeat(54)));

for (const tz of ZONES) {
  process.env.TZ = tz;
  runAll(tz);
}

rmSync(work, { recursive: true, force: true });

const total = passed + failures.length;
say(`  ${total} تحقّقًا في ${ZONES.length} مناطق زمنية: ${ZONES.join("، ")}`);
say();

if (failures.length === 0) {
  say(GREEN(B("  ✔ كل شيء سليم.")));
  say();
  process.exit(0);
}

say(RED(B(`  ✖ ${failures.length} من ${total}:`)));
say();
for (const f of failures) {
  say(`   • ${B(f.area)} — ${f.rule}`);
  say(`     المتوقّع: ${JSON.stringify(f.expected)}`);
  say(`     ما حدث:  ${JSON.stringify(f.actual)}`);
}
say();
process.exit(1);
