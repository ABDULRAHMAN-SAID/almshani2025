#!/usr/bin/env node
/**
 * يحوّل app.json إلى نسخة التجربة — في مجلّد البناء فقط، لا في المستودع.
 *
 *   node scripts/variant.mjs lab
 *
 * ولماذا لا يُكتب app.json ثانٍ في فرع التجربة؟ لأنه سيختلف عن فرع الإصدار
 * إلى الأبد: كل دمجٍ من التجربة إلى الإصدار سيحمل معه اسم نسخة التجربة
 * ومعرّف حزمتها، فيُنشر ذلك على هواتف الناس. والفرعان هنا متطابقان حرفًا
 * بحرف، والفرقُ يُصنع لحظة البناء ثم يُرمى.
 *
 * وما يتغيّر: الاسم على الشاشة، ومعرّف الحزمة — وبه تتجاور النسختان على
 * الهاتف الواحد بدل أن تحلّ إحداهما محلّ الأخرى — ولون خلفية الأيقونة،
 * ليُفرّق بينهما بنظرة.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const VARIANTS = {
  lab: {
    name: "أنشطتي · تجربة",
    suffix: ".lab",
    // فيروزي بحري بدل الكحلي — الفرق يُرى على شاشة الهاتف بلا قراءة.
    background: "#0F6E7B",
  },
};

const key = process.argv[2];
const variant = VARIANTS[key];
if (!variant) {
  console.error(`نسخة غير معروفة: ${key}. المعروف: ${Object.keys(VARIANTS).join("، ")}`);
  process.exit(1);
}

const path = resolve(ROOT, "app.json");
const config = JSON.parse(readFileSync(path, "utf8"));
const expo = config.expo;

expo.name = variant.name;
expo.android.package += variant.suffix;
expo.ios.bundleIdentifier += variant.suffix;
expo.android.adaptiveIcon.backgroundColor = variant.background;
expo.splash.backgroundColor = variant.background;
for (const plugin of expo.plugins) {
  if (Array.isArray(plugin) && plugin[0] === "expo-splash-screen") {
    plugin[1].backgroundColor = variant.background;
  }
}

writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
console.log(`نسخة «${variant.name}» — الحزمة ${expo.android.package}`);
