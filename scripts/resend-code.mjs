#!/usr/bin/env node
/**
 * إعادة إرسال رمز تأكيد الحساب — لعضوٍ سجّل ولم يصله الرمز.
 *
 * تشغيل:  npm run resend -- name@example.com
 *
 * ولماذا أداة أصلًا؟ لأن الرمز قد لا يصل لسببين مختلفين تمامًا يبدوان
 * للمستخدم سواءً: بريدٌ كُتب خطأً، أو خدمة بريدٍ بلغت حدّها فلم تُرسل شيئًا.
 * الأولى يصلحها المستخدم، والثانية لا يصلحها إلا صاحب المشروع — ولا يُعرف
 * أيّهما وقع إلا من ردّ الخادم نفسه. فهذه الأداة تطبع الردّ كما هو.
 *
 * تستعمل مفتاح anon وحده — نفس ما يحمله التطبيق على الهاتف — ولا تكتب صفًّا.
 */

import { readFileSync, existsSync } from "node:fs";

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
      const value = line
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (env[key] === undefined || env[key] === "") env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();
const url = (env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const email = (process.argv[2] ?? env.RESEND_EMAIL ?? "").trim().toLowerCase();

const ESC = String.fromCharCode(27);
const line = (s = "") => console.log(s);
const bold = (s) => `${ESC}[1m${s}${ESC}[0m`;
const dim = (s) => `${ESC}[2m${s}${ESC}[0m`;

line();
line(bold("إعادة إرسال رمز التأكيد"));
line(dim("-".repeat(52)));

if (!url || !key) {
  line("لا توجد مفاتيح الخادم.");
  process.exit(1);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  line("اكتب بريدًا صحيحًا:  npm run resend -- name@example.com");
  process.exit(1);
}

line(`المشروع            ${url.replace(/^https?:\/\//, "")}`);
line(`البريد             ${email}`);
line(dim("-".repeat(52)));
line();

const response = await fetch(`${url}/auth/v1/resend`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
  body: JSON.stringify({ type: "signup", email }),
});

const text = await response.text();
let body = {};
try {
  body = JSON.parse(text);
} catch {
  body = { raw: text };
}

// الخادم يردّ 200 ولو لم يكن للبريد حساب — عمدًا، لئلّا تُعرف العناوين
// المسجَّلة بالتجربة. فالنجاح هنا يعني «قُبل الطلب»، لا «وصل الرمز».
if (response.ok) {
  line("تم — " + bold("قُبل الطلب، وأُرسل الرمز إن كان للبريد حسابٌ غير مؤكَّد."));
  line();
  line("   افتح البريد — وصندوق الرسائل غير المرغوبة أيضًا — واكتب الرمز في التطبيق.");
  line(dim("   ولو لم يصل خلال دقيقتين فالخلل في خدمة البريد لا في الحساب."));
  line();
  process.exit(0);
}

const message = body.msg || body.message || body.error_description || body.error || text;
const code = body.error_code ?? "";

line(`${bold("رفض الخادم الطلب")}  (HTTP ${response.status})`);
line();
line(`   ${message}`);
if (code) line(dim(`   رمز الخطأ: ${code}`));
line();

if (/rate limit|too many|over_email_send|sending/i.test(`${message} ${code}`)) {
  line(bold("   ما معنى هذا:"));
  line("   خدمة البريد المدمجة في Supabase لا ترسل إلا رسائل قليلة في الساعة،");
  line("   وهي للتجربة لا للاستعمال الحقيقي. بلغت الحدّ، فلم تُرسل شيئًا —");
  line("   والحسابات التي أُنشئت موجودة لكنها تنتظر رمزًا لم يخرج.");
  line();
  line(bold("   الحلّ الدائم:"));
  line("   اربط خدمة بريد خاصة بالمشروع من صفحته:");
  line("   Authentication ← Emails ← SMTP Settings ← Enable custom SMTP");
  line("   عندها يصل الرمز لكل من يسجّل، بلا حدٍّ يُذكر.");
  line();
  line(dim("   وحتى ذلك الحين: انتظر نحو ساعة ثم أعد المحاولة."));
  line();
}

process.exit(1);
