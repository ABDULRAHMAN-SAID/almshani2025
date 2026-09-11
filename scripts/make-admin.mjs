#!/usr/bin/env node
/**
 * ترقية حساب إلى الإدارة، بأمر واحد بدل زيارة لوحة Supabase.
 *
 *   npm run admin                    يرقّي رقمك المحفوظ
 *   npm run admin -- +96891234567    يرقّي رقمًا بعينه
 *   npm run admin -- --list          يعرض الإداريين الحاليين
 *   npm run admin -- --remove +968…  يسحب الصلاحية
 *
 * يمرّ من واجهة Supabase الإدارية، أي من خارج التطبيق — وهذا هو المقصود:
 * لا يرقّي أحدٌ أحدًا من داخل التطبيق، حتى لا يكون اختراق حساب إداري واحد
 * كافيًا لصناعة إداريين آخرين. والصلاحية هنا صلاحية مالك المشروع لا صلاحية
 * إداري.
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  ApiError,
  B,
  DIM,
  GREEN,
  RED,
  YELLOW,
  readState,
  rule,
  runSql,
  say,
} from "./supabase-api.mjs";

/** اقتباس آمن لنصّ داخل SQL — لا نبني الاستعلام بلصق خام. */
const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

const args = process.argv.slice(2);
const wantsList = args.includes("--list");
const removeIndex = args.indexOf("--remove");
const removePhone = removeIndex >= 0 ? args[removeIndex + 1] : "";
const positional = args.find((arg) => !arg.startsWith("--") && arg !== removePhone);

const { token, ref, phone: savedPhone } = readState();

say();
say(B("  صلاحية الإدارة"));
rule();

if (!token || !ref) {
  say(RED("  لا يوجد خادم مربوط عبر هذه الأداة."));
  say();
  say("  شغّل أولًا: " + B("npm run setup"));
  say();
  say(DIM("  أو افعلها يدويًا: افتح supabase.com ← SQL Editor، والصق"));
  say(DIM("  محتوى supabase/make-me-admin.sql بعد وضع رقمك فيه."));
  say();
  process.exit(1);
}

function noPhone() {
  say(RED("  لم تحدّد رقمًا."));
  say();
  say("  الاستعمال: " + B("npm run admin -- +96891234567"));
  say(DIM("  بالصيغة نفسها التي سجّلت بها في التطبيق."));
  say();
  process.exit(1);
}

/** هل هذا الرقم إداري الآن؟ سؤال قراءة، يُوثق به في الحكم. */
async function isAdmin(targetPhone) {
  const result = await runSql(
    token,
    ref,
    `select 1 as found
       from public.admins a
       join public.users u on u.id = a.user_id
      where u.phone = ${quote(targetPhone)}`
  );
  const rows = Array.isArray(result) ? result : result?.data ?? [];
  return rows.length > 0;
}

async function showAdmins() {
  const result = await runSql(
    token,
    ref,
    `select u.full_name, u.phone, a.created_at
       from public.admins a
       join public.users u on u.id = a.user_id
      order by a.created_at;`
  );
  const rows = Array.isArray(result) ? result : result?.data ?? [];
  say();
  if (rows.length === 0) {
    say(YELLOW("  لا يوجد أي إداري بعد."));
    return rows;
  }
  say(B("  الإداريون الحاليون:"));
  for (const row of rows) {
    say(`   • ${row.full_name ?? "—"}  ${DIM(row.phone ?? "")}`);
  }
  return rows;
}

try {
  if (wantsList) {
    await showAdmins();
    say();
    process.exit(0);
  }

  if (removePhone) {
    // نقرأ قبل وبعد بدل أن نستنتج النتيجة من ردّ عملية الحذف. الحذف لا يُرجع
    // دائمًا صفوفه، فكان الأمر يقول «لم يكن إداريًا أصلًا» وقد سحب صلاحيته
    // فعلًا — وهذه جملة خاطئة في مسألة صلاحيات، لا مجرّد صياغة.
    if (!(await isAdmin(removePhone))) {
      say();
      say(YELLOW(`  لم يكن ${removePhone} إداريًا أصلًا — لم نغيّر شيئًا.`));
      say();
      say(DIM("  لرؤية الإداريين: npm run admin -- --list"));
      say();
      process.exit(0);
    }

    await runSql(
      token,
      ref,
      `delete from public.admins
        where user_id = (select id from public.users where phone = ${quote(removePhone)});`
    );

    if (await isAdmin(removePhone)) {
      say();
      say(RED(`  ✖ ما زال ${removePhone} إداريًا — لم يُنفَّذ الحذف.`));
      say();
      process.exit(1);
    }

    say();
    say(GREEN(`  ✔ سُحبت صلاحية الإدارة من ${removePhone}`));
    await showAdmins();
    say();
    process.exit(0);
  }

  let phone = positional ?? "";
  if (!phone) {
    if (savedPhone) {
      say(`  رقمك المحفوظ: ${B(savedPhone)}`);
      stdout.write(`  ${B("اضغط Enter لترقيته، أو اكتب رقمًا آخر")}: `);
      const rl = createInterface({ input: stdin, output: stdout });
      const lines = rl[Symbol.asyncIterator]();
      const { value } = await lines.next();
      rl.close();
      phone = (value ?? "").trim() || savedPhone;
    } else {
      noPhone();
    }
  }

  phone = phone.replace(/[^\d+]/g, "");
  if (!phone) noPhone();

  say();
  say(DIM(`  أبحث عن حساب بالرقم ${phone}...`));

  // الترقية والتحقّق في استعلام واحد: إمّا أن يوجد الحساب فيُرقّى، أو يُرفع خطأ
  // عربي صريح — فلا يمرّ الأمر بنجاح ظاهري بلا أثر.
  await runSql(
    token,
    ref,
    `do $$
     declare target uuid;
     begin
       select id into target from public.users where phone = ${quote(phone)};
       if target is null then
         raise exception 'NO_USER';
       end if;
       insert into public.admins (user_id) values (target) on conflict (user_id) do nothing;
     end $$;`
  );

  say();
  say(GREEN(`  ✔ ${phone} صار إداريًا.`));
  say(DIM("  أغلق التطبيق على هاتفك وافتحه — تظهر لوحة الإدارة."));
  await showAdmins();
  say();
} catch (error) {
  const message = error instanceof ApiError ? error.message : String(error);
  say();
  if (/NO_USER/.test(message) || /NO_USER/.test(JSON.stringify(error?.body ?? ""))) {
    say(RED("  لا يوجد حساب بهذا الرقم على الخادم."));
    say();
    say("  السبب في الغالب أحد اثنين:");
    say("   • لم تسجّل الدخول من التطبيق بعد — سجّل مرة واحدة ثم أعد الأمر.");
    say("   • الرقم مكتوب بصيغة مختلفة عن التي سجّلت بها.");
    say();
    say(DIM("  لرؤية الأرقام المسجّلة: npm run admin -- --list"));
  } else {
    say(RED(`  ✖ ${message}`));
    say();
    say("  البديل اليدوي المؤكد:");
    say(`   1. افتح supabase.com/dashboard/project/${ref}/sql/new`);
    say("   2. الصق محتوى supabase/make-me-admin.sql بعد وضع رقمك فيه، ثم Run.");
  }
  say();
  process.exit(1);
}
