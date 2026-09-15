#!/usr/bin/env node
/**
 * توليد غلاف قسم: تدرّج بلون القسم فوقه نقشة الأقواس نفسها التي في التطبيق.
 *
 *   node scripts/make-cover.mjs OfficersClub "#1C4468"
 *
 * ولماذا نكتب PNG بأيدينا بدل مكتبة صور؟ لأن إضافة مكتبة رسم إلى مشروعٍ لا
 * يرسم شيئًا وقت التشغيل ثمنٌ دائم لأجل ملفَّين. والصيغة بسيطة: ترويسة،
 * وبيانات مضغوطة بـ zlib، وثلاثة مقاطع — وكلّها في نواة Node.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const W = 480;
const H = 300;

const [, , name, tintArg] = process.argv;
if (!name) {
  console.log("الاستعمال: node scripts/make-cover.mjs <الاسم> <#لون>");
  process.exit(1);
}
const tint = tintArg ?? "#0B2545";

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const [tr, tg, tb] = hex(tint);
// الكحلي العميق نفسه الذي في لوحة التطبيق — إليه ينتهي التدرّج.
const [dr, dg, db] = [8, 26, 48];

const mix = (a, b, t) => Math.round(a + (b - a) * t);

/** مسافة النقطة عن محيط دائرة — لرسم أقواس رفيعة بلا مكتبة رسم. */
const ring = (x, y, cx, cy, r) => Math.abs(Math.hypot(x - cx, y - cy) - r);

const rows = [];
for (let y = 0; y < H; y += 1) {
  // بايت المرشّح في أول كل سطر: 0 يعني «بلا مرشّح».
  const row = Buffer.alloc(1 + W * 3);
  for (let x = 0; x < W; x += 1) {
    // تدرّج قطريّ من لون القسم إلى الكحلي، كما في بقيّة الأغلفة.
    const t = Math.min(1, (x / W) * 0.55 + (y / H) * 0.65);
    let r = mix(tr, dr, t);
    let g = mix(tg, dg, t);
    let b = mix(tb, db, t);

    // نقشة أقواس خفيفة: ثلاث حلقات كبيرة، أثرها في الإضاءة لا في اللون.
    let glow = 0;
    for (const [cx, cy, rad] of [
      [W * 0.78, H * 0.18, 150],
      [W * 0.78, H * 0.18, 210],
      [W * 0.12, H * 0.92, 170],
    ]) {
      const d = ring(x, y, cx, cy, rad);
      if (d < 1.6) glow += (1.6 - d) * 26;
    }
    // وهجٌ ناعم أعلى اليمين ليبدو الغلاف مضاءً لا مسطّحًا.
    const light = Math.max(0, 1 - Math.hypot(x - W * 0.82, y - H * 0.1) / (W * 0.85)) * 22;

    const add = glow + light;
    r = Math.min(255, r + add);
    g = Math.min(255, g + add);
    b = Math.min(255, b + add);

    row[1 + x * 3] = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  rows.push(row);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // عمق ٨ بت
ihdr[9] = 2; // ألوان RGB بلا شفافية
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "..", "assets", "images", "covers", `cover-${name}.png`);
writeFileSync(out, png);
console.log(`كُتب ${out} — ${W}×${H}، ${(png.length / 1024).toFixed(0)} ك.ب`);
