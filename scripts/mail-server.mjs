#!/usr/bin/env node
/**
 * بريد إرسال حقيقي — ليصل الرمز إلى كل من يسجّل، لا إلى الأوائل فقط.
 *
 * بريد Supabase الافتراضي محدود جدًا: بضع رسائل في الساعة، للتجربة لا غير.
 * ولو سجّل عشرون شخصًا في وقت واحد لوصل الرمز إلى اثنين وانتظر البقيّة —
 * وهذا أسوأ من ألّا يكون هناك تأكيد أصلًا، لأن العطل لا يظهر إلا يوم الازدحام.
 *
 * فيربط هذا الأمر خادم بريد تملكه، ويرفع حدّ الإرسال معه.
 *
 *   npm run mail
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { ApiError, B, DIM, GREEN, RED, YELLOW, api, readState, rule, say } from "./supabase-api.mjs";

/**
 * مزوّدون تكفي باقاتهم المجانية عددًا كبيرًا.
 *
 * الأرقام تتغيّر عند المزوّدين، فاعتبرها دلالة لا عقدًا — والمهم أن الثلاثة
 * مجانية لحجم قاعدة واحدة.
 */
const PROVIDERS = [
  {
    key: "1",
    name: "Resend",
    site: "resend.com",
    free: "‏3000 رسالة شهريًا، و100 يوميًا",
    host: "smtp.resend.com",
    port: 465,
    user: "resend",
    passLabel: "مفتاح API (يبدأ بـ re_)",
    hint: "أنشئ حسابًا، ثم API Keys ← Create. وتحقّق من نطاقك أو استعمل نطاق التجربة.",
  },
  {
    key: "2",
    name: "Brevo",
    site: "brevo.com",
    free: "‏300 رسالة يوميًا",
    host: "smtp-relay.brevo.com",
    port: 587,
    user: null, // بريد الحساب
    passLabel: "مفتاح SMTP",
    hint: "أنشئ حسابًا، ثم SMTP & API ← SMTP. اسم المستخدم هو بريد حسابك.",
  },
  {
    key: "3",
    name: "غير ذلك",
    site: "",
    free: "تُدخل بياناته بنفسك",
    host: null,
    port: null,
    user: null,
    passLabel: "كلمة مرور SMTP",
    hint: "",
  },
];

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

async function ask(label, { fallback = "" } = {}) {
  stdout.write(`  ${B(label)}${fallback ? DIM(` (Enter = ${fallback})`) : ""}: `);
  const answer = await readLine();
  return answer || fallback;
}

function stop(reason, manual) {
  say();
  say(RED(`  ✖ ${reason}`));
  say();
  say(`  ${B("افعلها يدويًا:")}`);
  for (const step of manual) say(`   • ${step}`);
  say();
  rl.close();
  process.exit(1);
}

say();
rule();
say(B("  بريد الإرسال — ليصل الرمز إلى الجميع"));
rule();
say();

const state = readState();
if (!state?.token || !state?.ref) {
  stop("لا يوجد مشروع مربوط على هذا الجهاز.", [
    "شغّل npm run setup أولًا — فهو ينشئ المشروع ويحفظ بياناته.",
  ]);
}
const { token, ref } = state;

say("  بريد Supabase الافتراضي يكفي للتجربة، ولا يكفي للتوزيع:");
say(DIM("  بضع رسائل في الساعة، ثم يقف الباقون بلا رمز."));
say();
say(B("  اختر مزوّدًا:"));
for (const p of PROVIDERS) {
  say(`   ${B(p.key)}) ${p.name}${p.site ? DIM(" — " + p.site) : ""}`);
  say(DIM(`      ${p.free}`));
}
say();

const choice = await ask("الرقم", { fallback: "1" });
const provider = PROVIDERS.find((p) => p.key === choice) ?? PROVIDERS[0];

say();
if (provider.hint) {
  say(DIM(`  ${provider.hint}`));
  say();
}

const host = provider.host ?? (await ask("خادم SMTP (مثال: smtp.example.com)"));
const portText = provider.port ? String(provider.port) : await ask("المنفذ", { fallback: "587" });
const port = Number(portText);
const user = provider.user ?? (await ask("اسم المستخدم"));
const pass = await ask(provider.passLabel);
const senderEmail = await ask("بريد المرسِل (الذي تصل الرسالة منه)");
const senderName = await ask("اسم المرسِل", { fallback: "أنشطتي — قاعدة صلالة الجوية" });

if (!host || !user || !pass || !senderEmail || !Number.isFinite(port)) {
  stop("بيانات ناقصة.", ["أعد التشغيل واملأ كل حقل — لا يُحفظ شيء ناقص."]);
}

// الحدّ في الساعة. نرفعه مع خادم حقيقي، فالحدّ الافتراضي وُضع لبريد تجريبي
// ولو بقي لصار هو العنق الجديد بدل المزوّد.
const perHour = Number(await ask("أقصى عدد رسائل في الساعة", { fallback: "100" })) || 100;

say();
say(DIM("  يُرسل الضبط إلى Supabase…"));

try {
  await api(token, `/projects/${ref}/config/auth`, {
    method: "PATCH",
    body: {
      smtp_host: host,
      smtp_port: port,
      smtp_user: user,
      smtp_pass: pass,
      smtp_admin_email: senderEmail,
      smtp_sender_name: senderName,
      // ثوانٍ بين رسالتين للمستخدم الواحد: يمنع الضغط المتكرّر على «أرسل مرة
      // أخرى» من استهلاك الباقة، ولا يعيق أحدًا.
      smtp_max_frequency: 60,
      rate_limit_email_sent: perHour,
    },
  });
} catch (error) {
  stop(error instanceof ApiError ? error.message : String(error), [
    `افتح supabase.com/dashboard/project/${ref}/settings/auth`,
    "انزل إلى SMTP Settings وفعّل Enable Custom SMTP.",
    `ضع: ${host} : ${port} — المستخدم ${user} — وبريد المرسِل ${senderEmail}.`,
    "ثم من Rate Limits ارفع Emails per hour.",
  ]);
}

say();
say(GREEN(`  ✔ رُبط البريد: ${senderEmail} عبر ${host}`));
say(GREEN(`  ✔ الحدّ: ${perHour} رسالة في الساعة.`));
say();
say(B("  جرّبه قبل أن تعتمد عليه:"));
say("   1. افتح التطبيق وأنشئ حسابًا ببريدك أنت.");
say("   2. يجب أن يصل الرمز خلال ثوانٍ.");
say(DIM("   3. لم يصل؟ تحقّق من مجلد Spam، ومن أن نطاق المرسِل موثّق عند المزوّد."));
say();
say(DIM(`  السجلّ: supabase.com/dashboard/project/${ref}/auth/users`));
say();
rl.close();
