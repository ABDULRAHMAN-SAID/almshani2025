#!/usr/bin/env node
/**
 * يقابل كل استعلام في التطبيق بمخطط قاعدة البيانات.
 *
 *   npm run check:queries
 *
 * لماذا هذا الفحص موجود: التطبيق يعمل بوضعين، والوضع التجريبي لا يمرّ على
 * الخادم إطلاقًا. فلو كُتب اسم عمود خطأً في استعلام، ظلّ كل شيء يبدو سليمًا في
 * التجربة، ثم فشلت الشاشة على هاتف المستخدم بعد التوزيع. هذا الفحص يقرأ
 * `supabase/schema.sql` ويقرأ استعلامات `src/` و`app/`، ويقارن: كل جدول، وكل
 * عمود، وكل دالة، وكل حاوية ملفات، وكل اسم وسيط.
 *
 * لا يحتاج شبكة ولا مشروعًا مستضافًا — يقرأ الملفات فقط، فيصلح قبل البناء.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const B = (s) => `[1m${s}[0m`;
const DIM = (s) => `[2m${s}[0m`;
const GREEN = (s) => `[32m${s}[0m`;
const RED = (s) => `[31m${s}[0m`;

const say = (s = "") => console.log(s);

/* ============================ قراءة المخطط ============================ */

const schema = readFileSync("supabase/schema.sql", "utf8");

/** أسماء لا تُعدّ أعمدة داخل تعريف الجدول. */
const NOT_A_COLUMN = /^(primary|foreign|unique|check|constraint|exclude)\b/i;

function parseTables(sql) {
  const tables = new Map();
  const re = /create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g;
  let match;
  while ((match = re.exec(sql))) {
    const [, name, body] = match;
    const columns = new Set();
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("--") || NOT_A_COLUMN.test(line)) continue;
      const column = line.match(/^(\w+)\s/);
      if (column) columns.add(column[1]);
    }
    tables.set(name, columns);
  }

  // أعمدة تُضاف بعد إنشاء الجدول. إغفالها يجعل الفاحص يبلّغ عن أعمدة موجودة
  // فعلًا — وفاحص يُنذر كذبًا أسوأ من لا فاحص، لأنه يدفع إلى «إصلاح» سليم.
  const alterRe = /alter table public\.(\w+) add column(?: if not exists)? (\w+)/g;
  let altered;
  while ((altered = alterRe.exec(sql))) {
    const [, table, column] = altered;
    if (!tables.has(table)) tables.set(table, new Set());
    tables.get(table).add(column);
  }

  return tables;
}

/** العروض: نأخذ أسماء الأعمدة الظاهرة في قائمة الاختيار (مع الأسماء المستعارة). */
function parseViews(sql) {
  const views = new Map();
  const re = /create or replace view public\.(\w+) as\s+select ([\s\S]*?);/g;
  let match;
  while ((match = re.exec(sql))) {
    const [, name, selectList] = match;
    const head = selectList.split(/\n\s*from\b/i)[0];
    const columns = new Set();
    for (const piece of head.split(",")) {
      const part = piece.trim();
      if (!part) continue;
      const alias = part.match(/\bas\s+(\w+)\s*$/i);
      if (alias) {
        columns.add(alias[1]);
        continue;
      }
      const bare = part.match(/(\w+)\s*$/);
      if (bare) columns.add(bare[1]);
    }
    views.set(name, columns);
  }
  return views;
}

function parseFunctions(sql) {
  const functions = new Map();
  const re = /create or replace function public\.(\w+)\(([^)]*)\)/g;
  let match;
  while ((match = re.exec(sql))) {
    const [, name, argList] = match;
    const args = new Set();
    for (const piece of argList.split(",")) {
      const arg = piece.trim().match(/^(\w+)\s/);
      if (arg) args.add(arg[1]);
    }
    functions.set(name, args);
  }
  return functions;
}

function parseBuckets(sql) {
  const buckets = new Set();
  const re = /insert into storage\.buckets[^;]*?values \('([^']+)'/g;
  let match;
  while ((match = re.exec(sql))) buckets.add(match[1]);
  return buckets;
}

const TABLES = parseTables(schema);
const VIEWS = parseViews(schema);
const FUNCTIONS = parseFunctions(schema);
const BUCKETS = parseBuckets(schema);

const relationColumns = (name) => TABLES.get(name) ?? VIEWS.get(name) ?? null;

/* ========================== قراءة استعلامات الكود ========================== */

function sourceFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(entry)) found.push(path);
  }
  return found;
}

const problems = [];
let checked = 0;

const report = (file, line, message) => problems.push({ file, line, message });
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** يقرأ كائنًا نصيًا `{...}` متوازن الأقواس ابتداءً من موضع القوس. */
function readObject(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return "";
}

/**
 * مفاتيح المستوى الأول في كائن حرفي — تتجاهل الكائنات المتداخلة والنصوص.
 *
 * المفتاح لا يُقرأ إلا في موضع يصحّ أن يبدأ فيه: بعد `{` أو `,` مباشرةً على
 * العمق الأول. بغير هذا الشرط يطابق النمطُ داخلَ الكلمة نفسها فيُنتج
 * «ategory» و«tegory» من «category».
 */
function topLevelKeys(objectText) {
  const keys = [];
  let depth = 0;
  let inString = null;
  let expectKey = false;
  for (let i = 0; i < objectText.length; i += 1) {
    const ch = objectText[i];

    if (inString) {
      if (ch === inString && objectText[i - 1] !== "\\") inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      if (expectKey && depth === 1) {
        const quoted = objectText.slice(i).match(/^"(\w+)"\s*:/);
        if (quoted) {
          keys.push(quoted[1]);
          i += quoted[0].length - 1;
          expectKey = false;
          continue;
        }
      }
      inString = ch;
      expectKey = false;
      continue;
    }
    if (ch === "{" || ch === "[" || ch === "(") {
      depth += 1;
      expectKey = depth === 1;
      continue;
    }
    if (ch === "}" || ch === "]" || ch === ")") {
      depth -= 1;
      expectKey = false;
      continue;
    }
    if (ch === "," ) {
      expectKey = depth === 1;
      continue;
    }
    if (/\s/.test(ch)) continue;

    if (expectKey && depth === 1) {
      const key = objectText.slice(i).match(/^(\w+)\s*:/);
      if (key) {
        keys.push(key[1]);
        i += key[0].length - 1;
      } else {
        // اختصار الكائن: { title } يعني title: title
        const shorthand = objectText.slice(i).match(/^(\w+)\s*(,|\})/);
        if (shorthand) {
          keys.push(shorthand[1]);
          i += shorthand[1].length - 1;
        }
      }
    }
    expectKey = false;
  }
  return keys;
}

/**
 * أعمدة قائمة select. تدعم صيغة العلاقات المضمّنة `users(full_name, phone)`
 * التي يستعملها PostgREST، فتُفحص أعمدتها على جدولها لا على الجدول الأصلي.
 */
function parseSelectList(list) {
  const own = [];
  const embedded = [];
  let depth = 0;
  let current = "";
  for (const ch of list) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      if (current.trim()) own.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) own.push(current.trim());

  const plain = [];
  for (const piece of own) {
    const relation = piece.match(/^(\w+)\s*\(([\s\S]*)\)$/);
    if (relation) {
      embedded.push({ table: relation[1], columns: parseSelectList(relation[2]).plain });
      continue;
    }
    const alias = piece.match(/^(\w+):(\w+)$/); // aliasName:realColumn
    plain.push(alias ? alias[2] : piece.replace(/!.*$/, "").trim());
  }
  return { plain, embedded };
}

/** الدوال التي وسيطها الأول اسم عمود. */
const COLUMN_FILTERS = [
  "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in",
  "contains", "containedBy", "order",
];

const WRITE_METHODS = ["insert", "update", "upsert"];

for (const file of [...sourceFiles("src"), ...sourceFiles("app")]) {
  const text = readFileSync(file, "utf8");
  if (!text.includes("supabase")) continue;

  // ---- from("table") ----
  // [\w-] لا \w: أسماء حاويات الملفات فيها شرطات (activity-images، app-media)،
  // وبنمط \w وحده لم تكن تُطابَق أصلًا فمرّت الحاويات بلا فحص.
  const fromRe = /\.from\(\s*"([\w-]+)"\s*\)/g;
  let match;
  while ((match = fromRe.exec(text))) {
    const table = match[1];
    const line = lineOf(text, match.index);
    const isStorage = /\.storage\s*$/.test(text.slice(Math.max(0, match.index - 40), match.index));

    if (isStorage) {
      checked += 1;
      if (!BUCKETS.has(table)) {
        report(file, line, `حاوية ملفات غير موجودة في المخطط: ${table}`);
      }
      continue;
    }

    checked += 1;
    const columns = relationColumns(table);
    if (!columns) {
      report(file, line, `جدول غير موجود في المخطط: ${table}`);
      continue;
    }

    // منطقة السلسلة: حتى نهاية العبارة أو بداية استعلام آخر
    const after = text.slice(match.index + match[0].length);
    const nextQuery = after.search(/\.from\(\s*"|supabase\.rpc\(/);
    const region = after.slice(0, nextQuery === -1 ? 900 : Math.min(nextQuery, 900));

    // select(...)
    const selectRe = /\.select\(\s*"([^"]*)"/g;
    let selectMatch;
    while ((selectMatch = selectRe.exec(region))) {
      const list = selectMatch[1].trim();
      if (!list || list === "*") continue;
      const { plain, embedded } = parseSelectList(list);
      for (const column of plain) {
        if (!column || column === "*") continue;
        if (!columns.has(column)) {
          report(file, line, `عمود غير موجود في ${table}: ${column}`);
        }
      }
      for (const relation of embedded) {
        const relationCols = relationColumns(relation.table);
        if (!relationCols) {
          report(file, line, `جدول مرتبط غير موجود: ${relation.table}`);
          continue;
        }
        for (const column of relation.columns) {
          if (column && column !== "*" && !relationCols.has(column)) {
            report(file, line, `عمود غير موجود في ${relation.table}: ${column}`);
          }
        }
      }
    }

    // المرشّحات التي وسيطها الأول عمود
    for (const method of COLUMN_FILTERS) {
      const filterRe = new RegExp(`\\.${method}\\(\\s*"([^"]+)"`, "g");
      let filterMatch;
      while ((filterMatch = filterRe.exec(region))) {
        const column = filterMatch[1];
        if (!columns.has(column)) {
          report(file, line, `عمود غير موجود في ${table}: ${column}  ${DIM(`(في .${method})`)}`);
        }
      }
    }

    // insert / update / upsert — مفاتيح الكائن أعمدة
    for (const method of WRITE_METHODS) {
      const writeRe = new RegExp(`\\.${method}\\(\\s*\\{`, "g");
      let writeMatch;
      while ((writeMatch = writeRe.exec(region))) {
        const braceAt = region.indexOf("{", writeMatch.index);
        for (const key of topLevelKeys(readObject(region, braceAt))) {
          if (!columns.has(key)) {
            report(file, line, `عمود غير موجود في ${table}: ${key}  ${DIM(`(في .${method})`)}`);
          }
        }
      }
    }
  }

  // ---- rpc("function", { args }) ----
  const rpcRe = /\.rpc\(\s*"(\w+)"\s*(,\s*\{)?/g;
  while ((match = rpcRe.exec(text))) {
    const name = match[1];
    const line = lineOf(text, match.index);
    checked += 1;
    const args = FUNCTIONS.get(name);
    if (!args) {
      report(file, line, `دالة غير موجودة في المخطط: ${name}`);
      continue;
    }
    if (!match[2]) continue;
    const braceAt = text.indexOf("{", match.index + match[1].length);
    for (const key of topLevelKeys(readObject(text, braceAt))) {
      if (!args.has(key)) {
        report(file, line, `وسيط غير موجود في الدالة ${name}: ${key}`);
      }
    }
  }
}

/* ================================ التقرير ================================ */

say();
say(B("  مطابقة استعلامات التطبيق بالمخطط"));
say(DIM("  " + "─".repeat(54)));
say(
  `  المخطط: ${TABLES.size} جدولًا، ${VIEWS.size} عرضًا، ${FUNCTIONS.size} دالة، ${BUCKETS.size} حاويتين`
);
say(`  فُحص ${checked} استعلامًا في التطبيق.`);
say();

if (problems.length === 0) {
  say(GREEN(B("  ✔ كل استعلام يطابق المخطط.")));
  say();
  say(DIM("  هذا لا يثبت أن الخادم مُنفَّذ عليه المخطط — لذلك npm run check:supabase."));
  say();
  process.exit(0);
}

say(RED(B(`  ✖ ${problems.length} استعلامًا لا يطابق المخطط:`)));
say();
let lastFile = "";
for (const problem of problems) {
  if (problem.file !== lastFile) {
    say(`  ${B(problem.file)}`);
    lastFile = problem.file;
  }
  say(`    ${problem.file}:${problem.line}  ${problem.message}`);
}
say();
say("  كل سطر أعلاه يعني شاشة تفشل على الخادم الحقيقي بينما تعمل في الوضع التجريبي.");
say();
process.exit(1);
