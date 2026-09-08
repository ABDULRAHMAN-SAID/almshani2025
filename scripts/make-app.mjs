#!/usr/bin/env node
/**
 * أمر واحد يصنع ملف التطبيق (APK).
 *
 *   npm run make-app
 *
 * يفعل بالترتيب: تنزيل المكتبات، تثبيت أداة البناء، تسجيل الدخول إن لزم،
 * ربط المشروع بالحساب، ثم البناء على خوادم Expo.
 *
 * كُتب ليقرأه غير المبرمج: كل خطوة تُعلن عن نفسها، وكل خطأ يُترجَم إلى سبب
 * وحلّ بدل أن يُترك نصًّا إنجليزيًا غامضًا.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const B = (s) => `[1m${s}[0m`;
const DIM = (s) => `[2m${s}[0m`;
const GREEN = (s) => `[32m${s}[0m`;
const RED = (s) => `[31m${s}[0m`;
const YELLOW = (s) => `[33m${s}[0m`;

const say = (s = "") => console.log(s);
const rule = () => say(DIM("─".repeat(56)));

let step = 0;
const TOTAL = 4;
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

/* ---------------------------- 2) تسجيل الدخول ---------------------------- */

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

/* ----------------------------- 3) ربط المشروع ----------------------------- */

announce("ربط المشروع بحسابك");
say(DIM("  إن ظهر سؤال، اضغط Enter لقبول الإجابة المقترحة."));
say();
run("npx", ["--yes", "eas-cli@latest", "init"], { allowFail: true });
say(GREEN("  ✔ المشروع مربوط"));

/* -------------------------------- 4) البناء -------------------------------- */

announce("بناء التطبيق على خوادم Expo");
say("  إن سُئلت عن Android Keystore اختر " + B("Generate new keystore") + " واضغط Enter.");
say(DIM("  ثم انتظر 10–20 دقيقة. لا تغلق النافذة."));
say();

if (!run("npx", ["--yes", "eas-cli@latest", "build", "--platform", "android", "--profile", "preview"])) {
  fail("فشل البناء", [
    "افتح الرابط الذي ظهر أعلاه في المتصفح واقرأ سبب الفشل هناك.",
    "أعد الأمر: npm run make-app",
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
say(YELLOW("  احفظ حساب Expo وكلمة مروره. مفتاح التوقيع محفوظ فيه، وبدونه"));
say(YELLOW("  لن تستطيع إصدار تحديث للنسخة المثبّتة عند الناس."));
say();
