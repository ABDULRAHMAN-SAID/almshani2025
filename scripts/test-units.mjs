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
  check("الأخطاء", "الإنجليزية المجهولة تسقط للبديل", "بديل",
    errors.toArabicMessage(new Error("Unexpected"), "بديل"));
  check("الأخطاء", "الشبكة", "لا يوجد اتصال بالإنترنت. تحقّق من الشبكة وحاول مرة أخرى.",
    errors.toArabicMessage(new Error("Network request failed")));
  check("الأخطاء", "رمز التكرار", "هذا العنصر مسجَّل مسبقًا.", errors.toArabicMessage({ code: "23505" }));
  check("الأخطاء", "منع 403", "ليست لديك صلاحية لهذه العملية.", errors.toArabicMessage({ status: 403 }));
  check("الأخطاء", "انقطاع الشبكة يُعرف", true, errors.isNetworkError(new Error("Failed to fetch")));

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
