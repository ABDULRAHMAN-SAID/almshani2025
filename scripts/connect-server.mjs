#!/usr/bin/env node
/**
 * ربط التطبيق بخادمه الحقيقي.
 *
 *   npm run connect
 *
 * يسأل عن قيمتين فقط — رابط المشروع والمفتاح العام — ثم يكتب ملف .env
 * ويجرّب الاتصال فورًا. بعده يتوقف التطبيق عن استعمال البيانات التجريبية.
 *
 * يرفض المفتاح السرّي (service_role) رفضًا صريحًا: وضعه في تطبيق يوزَّع على
 * الهواتف يعني تسليم صلاحية كاملة على القاعدة لكل من يملك الملف.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const B = (s) => `[1m${s}[0m`;
const DIM = (s) => `[2m${s}[0m`;
const GREEN = (s) => `[32m${s}[0m`;
const RED = (s) => `[31m${s}[0m`;
const YELLOW = (s) => `[33m${s}[0m`;

const say = (s = "") => console.log(s);
const rule = () => say(DIM("─".repeat(56)));

/* --------------------------- قراءة ما هو موجود --------------------------- */

function readEnvFile() {
  const values = {};
  if (!existsSync(".env")) return values;
  for (const rawLine of readFileSync(".env", "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    values[line.slice(0, eq).trim()] = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return values;
}

/* ------------------------------ فحص المدخلات ------------------------------ */

function checkUrl(value) {
  const url = value.trim().replace(/\/+$/, "");
  if (!url) return { error: "لم تُدخل شيئًا." };
  if (!/^https:\/\//i.test(url)) return { error: "الرابط يجب أن يبدأ بـ https://" };
  try {
    const host = new URL(url).host;
    if (!/supabase\.(co|in|net)$/i.test(host)) {
      return { error: `هذا ليس رابط مشروع Supabase: ${host}` };
    }
    return { value: url };
  } catch {
    return { error: "الرابط غير صالح." };
  }
}

/** يقرأ ادّعاء role من توكن JWT دون أي مكتبة — لا نتحقق من التوقيع، نقرأ نوعه فقط. */
function jwtRole(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function checkKey(value) {
  const key = value.trim();
  if (!key) return { error: "لم تُدخل شيئًا." };

  // الصيغة الجديدة: sb_publishable_… عام، sb_secret_… سرّي.
  if (key.startsWith("sb_secret_")) return { error: "secret" };
  if (key.startsWith("sb_publishable_")) return { value: key };

  // الصيغة القديمة: JWT يحمل ادّعاء role.
  const role = jwtRole(key);
  if (role === "service_role") return { error: "secret" };
  if (role === "anon") return { value: key };
  if (role) return { error: `نوع المفتاح غير متوقع (${role}). المطلوب anon أو publishable.` };

  return { error: "هذا لا يشبه مفتاح Supabase. انسخه كاملًا من Settings ← API." };
}

/* --------------------------------- الحوار --------------------------------- */

say();
say(B("  ربط التطبيق بخادمه"));
rule();
say("  تحتاج قيمتين من لوحة Supabase:");
say(`    ${B("Settings")} ← ${B("API")}`);
say("    • Project URL");
say("    • anon public key");
say();
say(DIM("  إن لم تنشئ مشروعًا بعد: supabase.com ← New project، ثم نفّذ"));
say(DIM("  محتوى supabase/schema.sql في SQL Editor. التفاصيل في docs/PRODUCTION.md"));
say();

const current = readEnvFile();

// Expo يقدّم ‎.env.local على ‎.env. لو بقي ملف قديم هنا لأخذ التطبيق قيمه وتجاهل
// ما سنكتبه الآن، وبدا الربط فاشلًا بلا سبب ظاهر.
if (existsSync(".env.local")) {
  say(YELLOW("  ⚠ يوجد ملف .env.local — وهو يسبق .env عند Expo."));
  say("    احذفه أو انقله، وإلا أخذ التطبيق قيمه بدل ما سنكتبه الآن.");
  say();
}

const rl = createInterface({ input: stdin, output: stdout });

// نقرأ الأسطر من مكرِّر واحد بدل rl.question المتكرّر: الثاني يفقد ما تبقّى في
// المخزن حين لا يكون المُدخَل لوحة مفاتيح (أنبوب أو ملف)، فيتوقّف السكربت صامتًا.
const lines = rl[Symbol.asyncIterator]();
const nextLine = async () => {
  const { value, done } = await lines.next();
  if (done) {
    say();
    say(RED("  ✖ انتهى الإدخال قبل اكتمال الإجابات."));
    process.exit(1);
  }
  return value;
};

async function ask(label, hint, validate, existing) {
  for (;;) {
    if (existing) say(DIM(`  الموجود حاليًا: ${hint(existing)}  — اضغط Enter لإبقائه`));
    stdout.write(`  ${B(label)}: `);
    const answer = (await nextLine()).trim();
    const raw = answer || existing || "";
    const result = validate(raw);
    if (result.value) {
      say(GREEN(`  ✔ ${hint(result.value)}`));
      say();
      return result.value;
    }
    if (result.error === "secret") {
      say();
      say(RED("  ✖ هذا هو المفتاح السرّي (service_role)."));
      say("    لا تضعه هنا إطلاقًا: التطبيق يُوزَّع كملف، ومن يفتحه يقرأه،");
      say("    فتصبح القاعدة كلها مفتوحة له. ارجع إلى نفس الصفحة وانسخ");
      say(`    المفتاح المكتوب تحته ${B("anon public")}.`);
      say();
      continue;
    }
    say(RED(`  ✖ ${result.error}`));
    say();
  }
}

const url = await ask(
  "الصق رابط المشروع",
  (v) => {
    try {
      return new URL(v).host;
    } catch {
      return v;
    }
  },
  checkUrl,
  current.EXPO_PUBLIC_SUPABASE_URL
);

const key = await ask(
  "الصق المفتاح العام",
  (v) => `${v.slice(0, 10)}…${v.slice(-4)}`,
  checkKey,
  current.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

rl.close();

/* -------------------------------- الكتابة -------------------------------- */

const contents = `# ملف الربط بالخادم. لا يدخل المستودع (مذكور في .gitignore).
# كُتب بأمر: npm run connect

EXPO_PUBLIC_SUPABASE_URL=${url}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${key}

# false = التطبيق يقرأ ويكتب على الخادم الحقيقي.
# true  = بيانات تجريبية في الذاكرة، للتجربة فقط.
EXPO_PUBLIC_USE_MOCK_DATA=false
`;

writeFileSync(".env", contents, "utf8");
say(GREEN("  ✔ كُتب ملف .env — التطبيق الآن على الخادم الحقيقي، لا على البيانات التجريبية."));
say();

/* -------------------------------- التجربة -------------------------------- */

say(B("  تجربة الاتصال..."));
say();

const probe = spawnSync(process.execPath, ["scripts/check-supabase.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_PUBLIC_SUPABASE_URL: url,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: key,
    EXPO_PUBLIC_USE_MOCK_DATA: "false",
  },
});

rule();
if (probe.status === 0) {
  say(GREEN(B("  ✔ الخادم جاهز.")));
  say();
  say(`  ${B("الخطوة التالية:")}  npm run make-app`);
  say(DIM("  تصنع ملف التطبيق الحقيقي وتضع فيه هذه المفاتيح."));
} else {
  say(YELLOW(B("  ⚠ الاتصال يعمل، لكن ينقص الخادمَ شيء.")));
  say();
  say("  الغالب أن supabase/schema.sql لم يُنفَّذ بعد أو نُفِّذ ناقصًا:");
  say("   1. افتح Supabase ← SQL Editor ← New query");
  say("   2. الصق محتوى supabase/schema.sql كاملًا واضغط Run");
  say("   3. أعد: npm run connect");
}
say();
