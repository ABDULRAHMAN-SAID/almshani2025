#!/usr/bin/env node
/**
 * بناء نسخة الويب ووضعها في docs/app لتنشرها صفحات GitHub.
 *
 * الرابط الناتج:  https://<الحساب>.github.io/<المستودع>/app/
 *
 * ولماذا مجلّد داخل مجلّد؟ لأن صفحات GitHub لا تقرأ إلا من جذر الفرع أو من
 * docs، وفي docs توثيق المشروع — فلو وُضع البناء فيه مباشرة لمحا التوثيق عند
 * كل بناء. ووجود app يجعل الأمرين لا يلتقيان.
 *
 * والبادئة تُمرّر إلى البناء لا تُترك للحظّ: بدونها تُطلب الملفّات من جذر
 * النطاق فلا تُوجد، وتذهب روابط الشاشات إلى مسارات لا شيء فيها.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = process.argv[2] ?? "almshani2025";
const base = `/${repo}/app`;
const out = resolve(root, "docs/app");

console.log(`\nبناء نسخة الويب على البادئة ${base}\n`);

rmSync(out, { recursive: true, force: true });
execFileSync("npx", ["expo", "export", "--platform", "web", "--clear", "--output-dir", "docs/app"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, EXPO_BASE_URL: base, EXPO_OFFLINE: "1" },
});

// صفحة السقوط: الاستضافة الساكنة لا تعرف المسارات المتغيّرة — نشاطٌ بمعرّفه
// أو قسمٌ بمفتاحه ليس ملفًّا على القرص. فمن فتح رابطًا مباشرًا إلى شاشة، أو
// حدّث صفحةً هو فيها، يقع على 404. وصفحات GitHub تقدّم 404.html لكل مسار لا
// تجده، وهي نسخة التطبيق نفسها — فيقرأ المُوجِّه العنوان عند الإقلاع ويفتح
// الشاشة الصحيحة. جُرِّب: /sections/sports و/news يُفتحان مباشرةً بعده.
copyFileSync(resolve(out, "+not-found.html"), resolve(out, "404.html"));

// بلا هذا الملفّ يتجاهل Jekyll كل مجلّد يبدأ بشرطة سفلية — ومنها _expo التي
// فيها شفرة التطبيق كلّها، فتُقدَّم صفحة بيضاء.
mkdirSync(resolve(root, "docs"), { recursive: true });
writeFileSync(resolve(root, "docs/.nojekyll"), "");

console.log(`\n✅ تمّ. الملفّات في docs/app`);
console.log(`   ادفع الفرع، ثم من Settings ← Pages اجعل المصدر هذا الفرع ومجلّد /docs.`);
console.log(`   الرابط:  https://<الحساب>.github.io/${repo}/app/\n`);
