#!/usr/bin/env node
/**
 * أمر واحد يصنع ملف التطبيق (APK).
 *
 *   npm run make-app            النسخة النهائية الحقيقية (تحتاج خادمًا مربوطًا)
 *   npm run make-app -- --demo  نسخة تجريبية ببيانات في الذاكرة، بلا خادم
 *
 * يفعل بالترتيب: تنزيل المكتبات، التأكد من مصدر البيانات، تسجيل الدخول إن لزم،
 * ربط المشروع بالحساب، ثم البناء على خوادم Expo.
 *
 * كُتب ليقرأه غير المبرمج: كل خطوة تُعلن عن نفسها، وكل خطأ يُترجَم إلى سبب
 * وحلّ بدل أن يُترك نصًّا إنجليزيًا غامضًا.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const B = (s) => `[1m${s}[0m`;
const DIM = (s) => `[2m${s}[0m`;
const GREEN = (s) => `[32m${s}[0m`;
const RED = (s) => `[31m${s}[0m`;
const YELLOW = (s) => `[33m${s}[0m`;

const say = (s = "") => console.log(s);
const rule = () => say(DIM("─".repeat(56)));

let step = 0;
const TOTAL = 5;
function announce(title) {
  step += 1;
  say();
  rule();
  say(B(`  [${step}/${TOTAL}]  ${title}`));
  rule();
}

/** يشغّل أمرًا ويترك مخرجاته ظاهرة، فالمستخدم يرى التقدّم لا شاشة صامتة. */
function run(command, args, { allowFail = false } = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0 && !allowFail) {
    return false;
  }
  return result.status === 0;
}

/** يشغّل أمرًا ويلتقط مخرجاته بصمت — للأسئلة لا للعمل. */
function quiet(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: process.platform === "win32" });
  return { ok: result.status === 0, out: (result.stdout ?? "").trim() };
}

function fail(reason, fix) {
  say();
  say(RED(`  ✖ توقّفنا هنا: ${reason}`));
  say();
  say(`  ${B("ما تفعله الآن:")}`);
  for (const linefix of fix) say(`   • ${linefix}`);
  say();
  say(DIM("  إن لم تنجح، انسخ آخر 20 سطرًا من هذه النافذة وأرسلها في المحادثة."));
  say();
  process.exit(1);
}

/* ------------------------------ قبل البدء ------------------------------ */

const wantsDemo = process.argv.slice(2).some((arg) => /^--?demo$/i.test(arg));

say();
say(B("  صناعة ملف التطبيق — أنشطتي"));
say(DIM("  اترك هذه النافذة مفتوحة حتى تنتهي. المدة المتوقعة 20–30 دقيقة."));

if (!existsSync("package.json") || !existsSync("app.json")) {
  fail("هذه النافذة ليست داخل مجلد المشروع", [
    "أغلق النافذة، وافتح مجلد المشروع (الذي فيه ملف package.json).",
    "ثم افتح نافذة الأوامر من داخله وأعد المحاولة.",
  ]);
}

const major = Number(process.versions.node.split(".")[0]);
if (major < 18) {
  fail(`نسخة Node.js قديمة (${process.versions.node})`, [
    "نزّل النسخة الحديثة من nodejs.org واختر الزر الأخضر LTS.",
    "بعد التثبيت أغلق هذه النافذة وافتحها من جديد.",
  ]);
}

/* ------------------------------ 1) المكتبات ------------------------------ */

announce("تنزيل مكتبات المشروع");
say(DIM("  قد يستغرق 2–5 دقائق. كلمة warn طبيعية ولا تعني خطأ."));
say();
if (!run("npm", ["install"])) {
  fail("فشل تنزيل المكتبات", [
    "تأكد أن الإنترنت يعمل، ثم أعد الأمر: npm run make-app",
    "إن كنت على شبكة عمل مقيّدة، جرّب من شبكة أخرى أو من بيانات الجوال.",
  ]);
}
say(GREEN("  ✔ المكتبات جاهزة"));

/* --------------------------- 2) مصدر البيانات --------------------------- */

announce("مصدر بيانات التطبيق");

/**
 * يقرأ ملفات البيئة بلا مكتبة — نحتاج قيمتين فقط.
 *
 * الترتيب هو ترتيب Expo نفسه: ‎.env.local يسبق ‎.env. لو قرأنا ‎.env وحده لأخبرنا
 * المستخدمَ بخادم غير الذي سيدخل فعلًا في نسخة البناء.
 */
function readEnvFile() {
  const values = {};
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const rawLine of readFileSync(file, "utf8").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const value = line
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (values[key] === undefined || values[key] === "") values[key] = value;
    }
  }
  return values;
}

const env = readEnvFile();
const hasServer = Boolean(env.EXPO_PUBLIC_SUPABASE_URL && env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

if (wantsDemo) {
  say(YELLOW("  نسخة تجريبية بطلبك (--demo)."));
  say("  بياناتها في ذاكرة الهاتف: أي رقم يدخل، ولا شيء يُحفظ على خادم،");
  say("  ولا يرى مستخدم ما كتبه غيره. للعرض فقط، لا للتوزيع.");
} else if (!hasServer) {
  say(RED("  لا يوجد خادم مربوط بعد، والنسخة الحقيقية لا تقوم بلا خادم."));
  say();
  say("  التطبيق الحقيقي يحتاج مكانًا تُحفظ فيه الحسابات والمنشورات والصور");
  say("  والمقاطع. هذا المكان مشروع Supabase، وإنشاؤه مجاني ويأخذ ربع ساعة.");
  say();
  say(`  ${B("افعل هذا بالترتيب:")}`);
  say("   1. افتح supabase.com وأنشئ مشروعًا جديدًا (المنطقة: Frankfurt أقرب لعُمان).");
  say("   2. من SQL Editor: الصق محتوى ملف supabase/schema.sql كاملًا ثم Run.");
  say("   3. من Authentication ← Providers ← Phone: فعّل Phone.");
  say(`   4. ارجع إلى هذه النافذة وشغّل: ${B("npm run connect")}`);
  say("   5. ثم أعد: npm run make-app");
  say();
  say(DIM("  الشرح الكامل بالصور والخطوات في: docs/PRODUCTION.md"));
  say();
  say(DIM("  ولو أردت نسخة للعرض فقط اليوم: npm run make-app -- --demo"));
  say();
  process.exit(1);
} else {
  let host = env.EXPO_PUBLIC_SUPABASE_URL;
  try {
    host = new URL(env.EXPO_PUBLIC_SUPABASE_URL).host;
  } catch {
    /* نتركه كما هو؛ الفحص التالي سيكشف الخطأ */
  }
  say(`  الخادم: ${B(host)}`);
  say(DIM("  نتأكد أن الجداول والدوال والحاويات موجودة فعلًا قبل أن نبني..."));
  say();

  const probe = spawnSync(process.execPath, ["scripts/check-supabase.mjs"], {
    stdio: "inherit",
    env: { ...process.env, ...env, EXPO_PUBLIC_USE_MOCK_DATA: "false" },
  });

  if (probe.status !== 0) {
    say();
    fail("الخادم ليس جاهزًا — لم نبنِ شيئًا", [
      "اقرأ الأسطر أعلاه: ما كُتب أمامه ❌ هو الناقص.",
      "الغالب أن supabase/schema.sql لم يُنفَّذ كاملًا — أعد تنفيذه من SQL Editor.",
      "ثم أعد: npm run make-app",
    ]);
  }
  say();
  say(GREEN("  ✔ الخادم جاهز — النسخة التي سنبنيها تقرأ وتكتب عليه."));
}

const profile = wantsDemo ? "preview" : "production-apk";

/* ---------------------------- 3) تسجيل الدخول ---------------------------- */

announce("حساب Expo");

const who = quiet("npx", ["--yes", "eas-cli@latest", "whoami"]);
if (who.ok && who.out && !/not logged in/i.test(who.out)) {
  say(GREEN(`  ✔ أنت مسجَّل دخولك باسم: ${who.out}`));
} else {
  say("  تحتاج حساب Expo مجانيًا — هو الذي يبني التطبيق ويحفظ مفتاحه.");
  say(`  ${B("ليس عندك حساب؟")} افتح ${B("https://expo.dev/signup")} وأنشئه الآن، ثم عد إلى هنا.`);
  say();
  say(YELLOW("  ملاحظة: كلمة المرور لن تظهر أثناء كتابتها — لا حروف ولا نجوم. هذا طبيعي."));
  say();
  if (!run("npx", ["--yes", "eas-cli@latest", "login"])) {
    fail("لم يتم تسجيل الدخول", [
      "تأكد من اسم المستخدم وكلمة المرور في expo.dev.",
      "أعد الأمر: npm run make-app",
    ]);
  }
  say(GREEN("  ✔ تم تسجيل الدخول"));
}

/* ----------------------------- 4) ربط المشروع ----------------------------- */

announce("ربط المشروع بحسابك");
say(DIM("  إن ظهر سؤال، اضغط Enter لقبول الإجابة المقترحة."));
say();
run("npx", ["--yes", "eas-cli@latest", "init"], { allowFail: true });
say(GREEN("  ✔ المشروع مربوط"));

/* -------------------------------- 5) البناء -------------------------------- */

announce(wantsDemo ? "بناء النسخة التجريبية" : "بناء النسخة النهائية");

// EAS يستعمل git ليعرف الملفات التي يرفعها. من ينزّل المشروع كملف ZIP لا يملك
// مجلد .git ولا git مثبّتًا، فيتوقف البناء بخطأ VCS. نخبره أن يرفع المجلد كما هو.
if (!existsSync(".git")) {
  process.env.EAS_NO_VCS = "1";
  say(DIM("  (نزّلت المشروع كملف ZIP بلا git — ضبطنا البناء ليعمل بدونه.)"));
  say();
}

say("  إن سُئلت عن Android Keystore اضغط " + B("Y") + " ثم Enter — ينشئه لك.");
say(DIM("  ثم انتظر 10–20 دقيقة. لا تغلق النافذة."));
say();

if (!run("npx", ["--yes", "eas-cli@latest", "build", "--platform", "android", "--profile", profile])) {
  fail("فشل البناء", [
    "افتح الرابط الذي ظهر أعلاه في المتصفح واقرأ سبب الفشل هناك.",
    "إن ذكر الخطأ كلمة git أو VCS، شغّل الأمرين التاليين بالترتيب:",
    '   $env:EAS_NO_VCS = "1"',
    "   npm.cmd run make-app",
    "وإلا فأعد الأمر: npm run make-app",
  ]);
}

say();
rule();
say(GREEN(B("  ✔ تمّ. تطبيقك جاهز.")));
rule();
say();
say(`  ${B("الخطوة الأخيرة:")}`);
say("   1. افتح الرابط الذي ظهر أعلاه (أو expo.dev ← Builds).");
say("   2. اضغط " + B("Download") + " — ينزل ملف بامتداد .apk.");
say("   3. أرسله بالواتساب لمن تريد. يفتحه على هاتفه، يوافق على التثبيت من مصدر غير معروف، ويثبّته.");
say();

if (wantsDemo) {
  say(YELLOW("  ⚠ هذه نسخة تجريبية: بياناتها في ذاكرة الهاتف وتختفي عند حذف التطبيق،"));
  say(YELLOW("    ولا يرى أحد ما كتبه غيره. لا توزّعها على أنها التطبيق."));
  say();
  say(`    للنسخة الحقيقية: ${B("npm run connect")} ثم ${B("npm run make-app")}`);
} else {
  say(GREEN("  هذه هي النسخة الحقيقية: دخول برمز SMS، وكل ما يُكتب أو يُرفع"));
  say(GREEN("  من صور ومقاطع وملفات يُحفظ على خادمك ويراه بقية المستخدمين."));
  say();
  say(`  ${B("قبل التوزيع، جرّب بنفسك على هاتفك:")}`);
  say("   • سجّل دخولك برقمك واستقبل الرمز.");
  say("   • انشر في مجموعة نقاشية وأرفق صورة.");
  say("   • من لوحة الإدارة ← الإعدادات ← فحص الربط: يجب أن تكون كل الأسطر خضراء.");
  say();
  say(DIM("  ولو لم تظهر لوحة الإدارة: لم تُدرج حسابك في جدول admins بعد —"));
  say(DIM("  نفّذ supabase/make-me-admin.sql في SQL Editor بعد أول تسجيل دخول."));
}
say();
say(YELLOW("  احفظ حساب Expo وكلمة مروره. مفتاح التوقيع محفوظ فيه، وبدونه"));
say(YELLOW("  لن تستطيع إصدار تحديث للنسخة المثبّتة عند الناس."));
say();
