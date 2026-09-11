/**
 * طبقة التخاطب مع Supabase Management API.
 *
 * تشترك فيها أدوات الإعداد والإدارة. كل الطلبات تمرّ من هنا لسببين: ألّا يظهر
 * الرمز السرّي في أي مكان آخر، وأن يُترجَم كل فشل إلى سبب عربي وخطوة يدوية
 * بديلة — فالغرض من هذه الأدوات اختصار الطريق، لا أن تصير طريقًا مسدودًا
 * جديدًا إن تغيّرت الواجهة.
 */

import { chmodSync, existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

// يُتجاوَز في الاختبار وحده، ليُشغَّل المسار كاملًا على خادم محاكٍ محلي بدل
// مشروع حقيقي. لا يُضبط في الاستعمال العادي.
export const API = process.env.SUPABASE_API_URL ?? "https://api.supabase.com/v1";
export const STATE_FILE = ".supabase-setup.json";

export const B = (s) => `[1m${s}[0m`;
export const DIM = (s) => `[2m${s}[0m`;
export const GREEN = (s) => `[32m${s}[0m`;
export const RED = (s) => `[31m${s}[0m`;
export const YELLOW = (s) => `[33m${s}[0m`;

export const say = (s = "") => console.log(s);
export const rule = () => say(DIM("─".repeat(56)));

/* ------------------------------ الحالة المحلية ------------------------------ */

export function readState() {
  if (!existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function writeState(patch) {
  const next = { ...readState(), ...patch };
  writeFileSync(STATE_FILE, JSON.stringify(next, null, 2) + "\n", "utf8");
  // الرمز يفتح حساب Supabase كاملًا. لا نمنع قراءته من صاحب الجهاز، لكن نغلقه
  // عن بقية مستخدمي الجهاز نفسه. (يتجاهله ويندوز بلا ضرر.)
  try {
    chmodSync(STATE_FILE, 0o600);
  } catch {
    /* ويندوز */
  }
  return next;
}

export function forgetState() {
  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
}

/* -------------------------------- الطلبات -------------------------------- */

export class ApiError extends Error {
  constructor(message, { status, body, path } = {}) {
    super(message);
    this.status = status;
    this.body = body;
    this.path = path;
  }
}

/** رسالة عربية لكل حالة يُتوقَّع أن يراها المستخدم فعلًا. */
function explain(status, body) {
  const detail = (body?.message || body?.error || body?.msg || "").toString().slice(0, 200);
  switch (status) {
    case 401:
      return "الرمز غير صحيح أو انتهت صلاحيته. أنشئ رمزًا جديدًا من supabase.com/dashboard/account/tokens";
    case 403:
      return `الرمز لا يملك صلاحية هذه العملية.${detail ? ` (${detail})` : ""}`;
    case 404:
      return `المسار أو المشروع غير موجود.${detail ? ` (${detail})` : ""}`;
    case 429:
      return "تجاوزنا حدّ الطلبات المسموح. انتظر دقيقة ثم أعد الأمر.";
    case 500:
    case 502:
    case 503:
      return "خادم Supabase لا يستجيب الآن. أعد المحاولة بعد قليل.";
    default:
      return detail || `رفض الخادم الطلب (رمز ${status}).`;
  }
}

export async function api(token, path, { method = "GET", body, timeoutMs = 60_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    const offline = /fetch failed|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|abort/i.test(String(error));
    throw new ApiError(
      offline
        ? "لم نصل إلى api.supabase.com — تحقّق من الإنترنت، أو جرّب من شبكة أخرى."
        : String(error),
      { path }
    );
  }
  clearTimeout(timer);

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new ApiError(explain(response.status, parsed), {
      status: response.status,
      body: parsed ?? text.slice(0, 300),
      path,
    });
  }
  return parsed;
}

/* ------------------------------ عمليات جاهزة ------------------------------ */

/**
 * تنفيذ SQL على قاعدة المشروع.
 *
 * هذا هو المسار نفسه الذي يستعمله محرّر SQL في لوحة Supabase، فما ينجح هنا
 * ينجح هناك والعكس — ولذلك يبقى اللصق اليدوي بديلًا صالحًا دائمًا.
 */
export async function runSql(token, ref, query) {
  return api(token, `/projects/${ref}/database/query`, {
    method: "POST",
    body: { query },
    timeoutMs: 180_000,
  });
}

/** المفتاح العام. الواجهة غيّرت شكل هذا الردّ أكثر من مرة، فنقبل الشكلين. */
export async function fetchAnonKey(token, ref) {
  let keys;
  try {
    keys = await api(token, `/projects/${ref}/api-keys?reveal=true`);
  } catch {
    keys = await api(token, `/projects/${ref}/api-keys`);
  }
  const list = Array.isArray(keys) ? keys : keys?.data ?? [];
  const anon = list.find((k) => k?.name === "anon" || k?.type === "anon" || k?.name === "publishable");
  const value = anon?.api_key ?? anon?.apiKey ?? anon?.key ?? anon?.value;
  if (!value) {
    throw new ApiError("لم نجد المفتاح العام في ردّ الخادم.", { path: "api-keys", body: list });
  }
  return value;
}

/** حالة المشروع: جاهز أم ما زال يُنشأ. */
export async function projectStatus(token, ref) {
  const project = await api(token, `/projects/${ref}`);
  return project?.status ?? "UNKNOWN";
}
