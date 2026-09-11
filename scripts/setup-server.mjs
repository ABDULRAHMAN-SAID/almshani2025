#!/usr/bin/env node
/**
 * بناء خادم التطبيق كاملًا بأمر واحد.
 *
 *   npm run setup
 *   npm run setup -- --forget     ينسى الرمز المحفوظ على هذا الجهاز
 *
 * يفعل — عبر واجهة Supabase الإدارية — ما كان يُفعل يدويًا في اللوحة:
 * ينشئ المشروع، ينتظر جهوزيته، ينفّذ المخطط ومحتوى البداية، يجلب المفتاح
 * العام، يفعّل الدخول بالهاتف مع رمز تجربة لرقمك، ثم يكتب .env.
 *
 * ما لا يفعله ولا يستطيع: إنشاء حسابك في Supabase. الحساب لك، ورمز الوصول
 * تصنعه أنت بضغطة، ومن بعدها كل شيء هنا.
 *
 * مبدأ الكتابة: لا مرحلة تفشل صامتة. كل تعثّر يطبع الخطوة اليدوية المكافئة،
 * فلا تصير هذه الأداة طريقًا مسدودًا إن تغيّرت الواجهة يومًا.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomBytes } from "node:crypto";
import {
  ApiError,
  B,
  DIM,
  GREEN,
  RED,
  YELLOW,
  api,
  fetchAnonKey,
  forgetState,
  projectStatus,
  readState,
  rule,
  runSql,
  say,
  writeState,
} from "./supabase-api.mjs";

const TOKENS_URL = "https://supabase.com/dashboard/account/tokens";
const REGION = "eu-central-1"; // فرانكفورت — الأقرب لعُمان بين المناطق المجانية
const PROJECT_NAME = "anshatati-salala";

if (process.argv.includes("--forget")) {
  forgetState();
  say();
  say(GREEN("  ✔ حُذف الرمز المحفوظ من هذا الجهاز."));
  say();
  process.exit(0);
}

/* ------------------------------ أدوات الحوار ------------------------------ */

const rl = createInterface({ input: stdin, output: stdout });
const lines = rl[Symbol.asyncIterator]();

async function readLine() {
  const { value, done } = await lines.next();
  if (done) {
    say();
    say(RED("  ✖ انتهى الإدخال قبل اكتمال الإجابات."));
    process.exit(1);
  }
  return value.trim();
}

async function ask(label, { secret = false, fallback = "" } = {}) {
  stdout.write(`  ${B(label)}: `);
  const answer = await readLine();
  if (!answer) return fallback;
  return secret ? answer.replace(/\s/g, "") : answer;
}

async function confirm(label, { fallbackYes = true } = {}) {
  stdout.write(`  ${B(label)} ${DIM(fallbackYes ? "(Enter = نعم)" : "(Enter = لا)")}: `);
  const answer = (await readLine()).toLowerCase();
  if (!answer) return fallbackYes;
  return /^(y|yes|ن|نعم)$/.test(answer);
}

/** يوقف التنفيذ ويطبع البديل اليدوي لهذه المرحلة تحديدًا. */
function stop(reason, manual) {
  say();
  say(RED(`  ✖ ${reason}`));
  say();
  say(`  ${B("افعلها يدويًا — خطوات مؤكدة:")}`);
  for (const step of manual) say(`   • ${step}`);
  say();
  say(DIM("  ثم أكمل بـ: npm run connect  ←  npm run make-app"));
  say();
  rl.close();
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* -------------------------------- البداية -------------------------------- */

say();
say(B("  بناء خادم التطبيق — أنشطتي"));
rule();
say("  سأنشئ لك قاعدة البيانات، وأركّب بنيتها، وأملؤها بمحتوى البداية،");
say("  وأفعّل الدخول بكلمة مرور، وأربط التطبيق بها. المدة 3–5 دقائق.");
say();

const state = readState();
let token = state.token ?? "";

if (token) {
  say(GREEN(`  ✔ وجدت رمز وصول محفوظًا على هذا الجهاز (${token.slice(0, 8)}…).`));
  if (!(await confirm("أستعمله؟"))) token = "";
  say();
}

if (!token) {
  say(`  ${B("أحتاج منك شيئًا واحدًا: رمز وصول من حسابك في Supabase.")}`);
  say();
  say("   1. افتح: " + B(TOKENS_URL));
  say("   2. سجّل الدخول (أو أنشئ حسابًا مجانيًا — دقيقة واحدة).");
  say("   3. اضغط " + B("Generate new token") + "، سمِّه anshatati، ثم انسخه.");
  say();
  say(YELLOW("  الرمز يظهر مرة واحدة فقط. انسخه قبل أن تغلق الصفحة."));
  say(DIM("  يُحفظ على جهازك وحده في ملف .supabase-setup.json ولا يدخل المستودع."));
  say(DIM("  ولحذفه لاحقًا: npm run setup -- --forget"));
  say();
  token = await ask("الصق الرمز", { secret: true });
  if (!token) {
    stop("لم تُدخل رمزًا.", [
      `افتح ${TOKENS_URL} وأنشئ رمزًا، ثم أعد: npm run setup`,
      "أو تجاوز هذه الأداة كلها واتبع docs/PRODUCTION.md خطوة بخطوة.",
    ]);
  }
  say();
}

/* ----------------------------- 1) المؤسسة ----------------------------- */

say(B("  [1/6] حسابك"));

let organizations;
try {
  organizations = await api(token, "/organizations");
} catch (error) {
  stop(error instanceof ApiError ? error.message : String(error), [
    `تأكد أن الرمز صحيح من ${TOKENS_URL}`,
    "ثم أعد: npm run setup",
  ]);
}

if (!Array.isArray(organizations) || organizations.length === 0) {
  stop("لا توجد أي مؤسسة (organization) في حسابك.", [
    "افتح supabase.com/dashboard وأنشئ organization جديدة (مجانية).",
    "ثم أعد: npm run setup",
  ]);
}

let organization = organizations[0];
if (organizations.length > 1) {
  say("  عندك أكثر من مؤسسة:");
  organizations.forEach((org, index) => say(`   ${index + 1}) ${org.name}`));
  const choice = Number(await ask(`اختر رقمًا (1–${organizations.length})`, { fallback: "1" }));
  organization = organizations[Number.isFinite(choice) && choice >= 1 ? choice - 1 : 0] ?? organizations[0];
}
say(GREEN(`  ✔ المؤسسة: ${organization.name}`));
say();

/* ----------------------------- 2) المشروع ----------------------------- */

say(B("  [2/6] المشروع"));

let projects = [];
try {
  projects = (await api(token, "/projects")) ?? [];
} catch (error) {
  stop(error instanceof ApiError ? error.message : String(error), [
    "افتح supabase.com/dashboard وتأكد أن حسابك يعمل.",
    "ثم أعد: npm run setup",
  ]);
}

const mine = projects.filter((p) => p.organization_id === organization.id);
let ref = state.ref ?? "";
let project = mine.find((p) => p.id === ref);

if (!project && mine.length > 0) {
  say("  مشاريع موجودة في حسابك:");
  mine.forEach((p, index) => say(`   ${index + 1}) ${p.name}  ${DIM(p.region ?? "")}`));
  say(`   ${mine.length + 1}) ${B("أنشئ مشروعًا جديدًا")}`);
  say();
  const choice = Number(await ask(`اختر رقمًا (1–${mine.length + 1})`, { fallback: String(mine.length + 1) }));
  if (Number.isFinite(choice) && choice >= 1 && choice <= mine.length) {
    project = mine[choice - 1];
  }
  say();
}

if (!project) {
  // كلمة مرور القاعدة لا نحتاجها بعد اليوم، لكن Supabase يطلبها. نولّدها قوية
  // ونحفظها في ملف الحالة، فلو احتجتها يومًا للاتصال المباشر وجدتها.
  const dbPass = randomBytes(24).toString("base64url").slice(0, 28);
  say(`  أنشئ مشروعًا جديدًا باسم ${B(PROJECT_NAME)} في ${B("Frankfurt")}...`);
  try {
    project = await api(token, "/projects", {
      method: "POST",
      body: {
        name: PROJECT_NAME,
        organization_id: organization.id,
        region: REGION,
        db_pass: dbPass,
        plan: "free",
      },
      timeoutMs: 120_000,
    });
  } catch (error) {
    stop(error instanceof ApiError ? error.message : String(error), [
      "افتح supabase.com/dashboard ← New project.",
      "الاسم: anshatati-salala، المنطقة: Central EU (Frankfurt)، الخطة: Free.",
      "ثم أعد: npm run setup — سيجد المشروع ويكمل عليه.",
    ]);
  }
  writeState({ dbPass });
  say(GREEN("  ✔ أُنشئ المشروع"));
}

say(GREEN(`  ✔ المشروع: ${project.name ?? project.id}`));

ref = project.id ?? project.ref;
if (!ref) {
  stop("لم نفهم ردّ الخادم عن المشروع.", [
    "افتح supabase.com/dashboard واختر مشروعك.",
    "ثم اتبع docs/PRODUCTION.md من الخطوة 2.",
  ]);
}
writeState({ token, ref, host: `${ref}.supabase.co`, organization: organization.name });

/* --------------------------- 3) انتظار الجهوزية --------------------------- */

say();
say(B("  [3/6] جهوزية القاعدة"));
say(DIM("  أول إنشاء يأخذ دقيقتين تقريبًا. لا تغلق النافذة."));
stdout.write("  ");

let ready = false;
for (let attempt = 0; attempt < 90; attempt += 1) {
  let status;
  try {
    status = await projectStatus(token, ref);
  } catch {
    status = "UNKNOWN"; // انقطاع لحظي أثناء الإقلاع — نواصل الانتظار
  }
  if (status === "ACTIVE_HEALTHY") {
    ready = true;
    break;
  }
  if (status === "INACTIVE") {
    say();
    stop("المشروع موقوف (Paused).", [
      `افتح supabase.com/dashboard/project/${ref} واضغط Restore.`,
      "ثم أعد: npm run setup",
    ]);
  }
  stdout.write(".");
  await sleep(10_000);
}
say();

if (!ready) {
  stop("طال انتظار جهوزية المشروع.", [
    `افتح supabase.com/dashboard/project/${ref} وتأكد أنه أصبح Active.`,
    "ثم أعد: npm run setup — سيكمل من حيث وقف.",
  ]);
}
say(GREEN(`  ✔ القاعدة جاهزة — ${ref}.supabase.co`));

/* ------------------------- 4) المخطط ومحتوى البداية ------------------------- */

say();
say(B("  [4/6] بنية القاعدة ومحتوى البداية"));

async function applySql(file, label, { required }) {
  if (!existsSync(file)) {
    if (required) stop(`الملف ${file} غير موجود.`, ["تأكد أنك داخل مجلد المشروع، ثم أعد الأمر."]);
    return;
  }
  const sql = readFileSync(file, "utf8");
  // القاعدة قد تقبل الطلب قبل أن تقبل الاستعلام بلحظات بعد الإقلاع.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await runSql(token, ref, sql);
      say(GREEN(`  ✔ ${label}`));
      return;
    } catch (error) {
      if (attempt === 3) {
        say(RED(`  ✖ ${label}: ${error instanceof ApiError ? error.message : String(error)}`));
        if (required) {
          stop("لم تُركَّب بنية القاعدة.", [
            `افتح supabase.com/dashboard/project/${ref}/sql/new`,
            `الصق محتوى ${file} كاملًا واضغط Run.`,
            "ثم أعد: npm run setup — سيتخطّى ما تمّ ويكمل.",
          ]);
        }
        say(YELLOW(`  (تجاوزنا ${label} — ليس ضروريًا لعمل التطبيق.)`));
        return;
      }
      await sleep(5_000);
    }
  }
}

await applySql("supabase/schema.sql", "المخطط: الجداول والسياسات والدوال والحاويات", { required: true });
await applySql("supabase/starter-content.sql", "محتوى البداية: مقالات وأنشطة ومجموعات ومسابقة", {
  required: false,
});

/* --------------------------- 5) طريقة الدخول --------------------------- */

say();
say(B("  [5/6] طريقة الدخول"));
say("  الدخول بكلمة مرور — بالرقم أو بالبريد. لا رسائل SMS ولا مزوّد مدفوع.");
say();

let authReady = false;
try {
  await api(token, `/projects/${ref}/config/auth`, {
    method: "PATCH",
    body: {
      // البريد وكلمة المرور هما هويّة الحساب.
      external_email_enabled: true,
      // والرقم هويّة ثانية على الحساب نفسه، ليصحّ الدخول به أيضًا.
      external_phone_enabled: true,
      // بلا تأكيد: التأكيد بالبريد يحتاج خادم بريد، وبالهاتف يحتاج مزوّد رسائل
      // مدفوعًا. وبدون هذا يُنشأ الحساب ثم يُرفض دخوله فورًا، وهو أسوأ ما يمكن
      // أن يحدث لمستخدم سجّل للتوّ.
      mailer_autoconfirm: true,
      sms_autoconfirm: true,
      password_min_length: 6,
    },
  });
  authReady = true;
  say(GREEN("  ✔ فُعّل الدخول بكلمة مرور — بالرقم أو بالبريد."));
  say(DIM("  ولا يحتاج المستخدم تأكيد بريده قبل أول دخول."));
} catch (error) {
  say(YELLOW(`  ⚠ تعذّر الضبط تلقائيًا: ${error instanceof ApiError ? error.message : String(error)}`));
  say("    اضبطه يدويًا — دقيقتان:");
  say(`     1. افتح supabase.com/dashboard/project/${ref}/auth/providers`);
  say("     2. فعّل " + B("Email") + " و" + B("Phone") + ".");
  say("     3. من Authentication ← Sign In / Providers، أطفئ " + B("Confirm email"));
  say("        و" + B("Confirm phone") + " — وإلا لن يدخل أحد بلا خادم بريد أو رسائل.");
  say();
  say(DIM("    باقي الإعداد تمّ بنجاح — هذه الخطوة وحدها هي اليدوية."));
}

/* ----------------------------- 6) ربط التطبيق ----------------------------- */

say();
say(B("  [6/6] ربط التطبيق"));

let anonKey;
try {
  anonKey = await fetchAnonKey(token, ref);
} catch (error) {
  stop(error instanceof ApiError ? error.message : String(error), [
    `افتح supabase.com/dashboard/project/${ref}/settings/api`,
    "انسخ Project URL و anon public.",
    "ثم شغّل: npm run connect والصقهما.",
  ]);
}

const url = `https://${ref}.supabase.co`;
writeFileSync(
  ".env",
  `# ملف الربط بالخادم. لا يدخل المستودع (مذكور في .gitignore).
# كُتب بأمر: npm run setup

EXPO_PUBLIC_SUPABASE_URL=${url}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${anonKey}

# false = التطبيق يقرأ ويكتب على الخادم الحقيقي.
EXPO_PUBLIC_USE_MOCK_DATA=false
`,
  "utf8"
);
say(GREEN("  ✔ كُتب .env — التطبيق مربوط بخادمك."));

if (existsSync(".env.local")) {
  say();
  say(YELLOW("  ⚠ يوجد .env.local وهو يسبق .env عند Expo — احذفه وإلا تجاهل التطبيقُ هذا الربط."));
}

rl.close();

/* -------------------------------- الخلاصة -------------------------------- */

say();
rule();
say(GREEN(B("  ✔ الخادم جاهز بالكامل.")));
rule();
say();
say(`  المشروع      ${ref}.supabase.co`);
say(`  الدخول       بكلمة مرور — بالرقم أو بالبريد${authReady ? "" : "  (يحتاج ضبطًا يدويًا، انظر أعلاه)"}`);
say();
say(`  ${B("الخطوة التالية — أمر واحد:")}`);
say();
say(`      ${B("npm run make-app")}`);
say();
say("  يبني ملف APK حقيقيًا يقرأ ويكتب على هذا الخادم. 20 دقيقة.");
say();
say(DIM("  وبعد أول تسجيل دخول من هاتفك، اجعل نفسك إداريًا بأمر واحد:"));
say(DIM("      npm run admin"));
say();
