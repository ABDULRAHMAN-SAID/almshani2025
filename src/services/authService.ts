import * as Linking from "expo-linking";
import type { User } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { supabase } from "./supabase";

/**
 * المصادقة بكلمة مرور.
 *
 * الدخول برقم الهاتف أو بالبريد، وكلاهما هويّة على الحساب نفسه في Supabase،
 * فلا حاجة إلى بحثٍ يحوّل رقمًا إلى بريد — والبحث كان سيكون تسريبًا: من ملك
 * رقمًا عرف بريد صاحبه، وهذا يناقض قاعدة التطبيق في ألّا تُكشف بيانات تواصل
 * الأعضاء لبعضهم.
 *
 * ولأن الدخول بكلمة مرور، لم تعد هناك رسائل SMS ولا مزوّد مدفوع. يبقى البريد
 * وحده مطلوبًا لاستعادة كلمة المرور.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_DIGITS = /^\+?\d{8,15}$/;

export const looksLikeEmail = (value: string) => EMAIL_REGEX.test(value.trim());

/**
 * توحيد صيغة الرقم إلى الصيغة الدولية.
 *
 * الخادم يطابق الرقم حرفًا بحرف، فلو سجّل المستخدم بـ 91234567 ودخل بـ
 * ‎+96891234567 لعُدّ حسابين مختلفين. نوحّدها هنا مرة واحدة.
 */
export function normalizePhone(raw: string): string {
  const value = raw.replace(/[\s-]/g, "");
  if (value.startsWith("+")) return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) return `+968${digits}`; // رقم عماني محلي
  return `+${digits}`;
}

export const isValidPhone = (value: string) => PHONE_DIGITS.test(normalizePhone(value));

export interface SignUpInput {
  firstName: string;
  secondName: string;
  familyName: string;
  phone: string;
  email: string;
  password: string;
}

const fullNameOf = (input: Pick<SignUpInput, "firstName" | "secondName" | "familyName">) =>
  [input.firstName, input.secondName, input.familyName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

/** رسائل الخادم إنجليزية؛ نترجم المتوقّع منها ونمرّر الباقي. */
function authError(error: { message?: string } | null, fallback: string): Error {
  const message = error?.message ?? "";
  if (/invalid login credentials/i.test(message)) {
    return new Error("بيانات الدخول غير صحيحة. تأكد من الرقم أو البريد ومن كلمة المرور.");
  }
  if (/already registered|already been registered/i.test(message)) {
    return new Error("هذا الحساب مسجَّل من قبل. ادخل بكلمة مرورك أو استعدها.");
  }
  if (/password.*at least|should be at least/i.test(message)) {
    return new Error("كلمة المرور قصيرة — ستة أحرف على الأقل.");
  }
  if (/email.*not confirmed|confirm/i.test(message)) {
    return new Error("الحساب يحتاج تأكيدًا. افتح الرابط المرسل إلى بريدك ثم أعد المحاولة.");
  }
  if (/rate limit|too many/i.test(message)) {
    return new Error("محاولات كثيرة متتالية. انتظر دقيقة ثم أعد المحاولة.");
  }
  return new Error(message || fallback);
}

/* -------------------------------- التسجيل -------------------------------- */

export async function signUpWithPassword(input: SignUpInput): Promise<User> {
  const phone = normalizePhone(input.phone);
  const email = input.email.trim().toLowerCase();
  const name = fullNameOf(input);

  if (USE_MOCK_DATA) {
    return { id: `dev-${phone}`, name, phone, email, createdAt: new Date().toISOString() };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: { data: { full_name: name, phone } },
  });
  if (error) throw authError(error, "تعذّر إنشاء الحساب");

  const userId = data.user?.id;
  if (!userId) throw new Error("تعذّر إنشاء الحساب — لم يُرجع الخادم معرّفًا.");

  // ربط الرقم بالحساب نفسه ليصحّ الدخول به لاحقًا. قد يرفضه الخادم إن كان
  // تأكيد الهاتف مفعّلًا (فيطلب رسالة SMS)، وحينها يبقى الدخول بالبريد عاملًا
  // ولا نُفشل التسجيل كلّه من أجله. والدالة تُعيد الخطأ ولا ترميه، فنقرأ الردّ
  // بدل الاكتفاء بـ try/catch لا يلتقط شيئًا.
  const { error: phoneError } = await supabase.auth.updateUser({ phone });

  const { error: profileError } = await supabase.from("users").upsert({
    id: userId,
    full_name: name,
    first_name: input.firstName.trim(),
    second_name: input.secondName.trim(),
    family_name: input.familyName.trim(),
    phone,
    email,
  });
  if (profileError) {
    // الرقم محفوظ فريدًا في الجدول: تكراره يعني أن شخصًا آخر سجّل به.
    if ((profileError as { code?: string }).code === "23505") {
      throw new Error("هذا الرقم مسجَّل بحساب آخر. استعمل رقمًا غيره، أو استعد كلمة مرور حسابك.");
    }
    throw profileError;
  }

  // نُبلغ هنا لا بصمت: من لم يُربط رقمه يدخل ببريده، وعليه أن يعرف ذلك قبل أن
  // يجرّب الدخول برقمه ويُقال له إن بياناته خاطئة.
  if (phoneError) {
    console.warn("[auth] لم يُربط الرقم بالحساب — الدخول بالبريد فقط:", phoneError.message);
  }

  return {
    id: userId,
    name,
    firstName: input.firstName.trim(),
    secondName: input.secondName.trim(),
    familyName: input.familyName.trim(),
    phone,
    email,
    createdAt: new Date().toISOString(),
  };
}

/* --------------------------------- الدخول --------------------------------- */

export async function signInWithPassword(identifier: string, password: string): Promise<User> {
  const value = identifier.trim();

  if (USE_MOCK_DATA) {
    if (password.length < 4) throw new Error("كلمة المرور غير صحيحة");
    const phone = looksLikeEmail(value) ? "+96890000000" : normalizePhone(value);
    return {
      id: `dev-${value}`,
      name: "مستخدم",
      phone,
      email: looksLikeEmail(value) ? value : undefined,
      createdAt: new Date().toISOString(),
    };
  }

  const credentials = looksLikeEmail(value)
    ? { email: value.toLowerCase(), password }
    : { phone: normalizePhone(value), password };

  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error) throw authError(error, "تعذّر تسجيل الدخول");

  const userId = data.user?.id;
  if (!userId) throw new Error("تعذّر تسجيل الدخول");

  return (await fetchProfile(userId)) ?? {
    id: userId,
    name: (data.user?.user_metadata?.full_name as string) ?? "",
    phone: data.user?.phone ?? "",
    email: data.user?.email ?? undefined,
    createdAt: new Date().toISOString(),
  };
}

/** الملف الشخصي من جدول users — سياسة القراءة تقصره على صاحبه. */
export async function fetchProfile(userId: string): Promise<User | null> {
  if (USE_MOCK_DATA) return null;
  const { data } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    name: String(row.full_name ?? ""),
    firstName: (row.first_name as string) ?? undefined,
    secondName: (row.second_name as string) ?? undefined,
    familyName: (row.family_name as string) ?? undefined,
    phone: String(row.phone ?? ""),
    email: (row.email as string) ?? undefined,
    createdAt: String(row.created_at ?? "").slice(0, 10),
  };
}

/* --------------------------- استعادة كلمة المرور --------------------------- */

/** الرابط الذي يعيد فتح التطبيق نفسه: anshatati://reset-password */
export const passwordResetRedirect = () => Linking.createURL("reset-password");

/**
 * الاستعادة بالبريد وحده: الرابط يصل إلى صندوق لا يملكه إلا صاحب الحساب.
 * ولو أُرسلت إلى رقم لاحتاجت رسالة SMS ومزوّدًا مدفوعًا.
 *
 * ونمرّر وجهة العودة صراحةً، وإلا فتح الرابطُ صفحةَ ويب لا التطبيق، ووقف
 * المستخدم أمام رابط لا يوصله إلى مكان — وهذا أسوأ من غياب الميزة أصلًا.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: passwordResetRedirect(),
  });
  if (error) throw authError(error, "تعذّر إرسال رابط الاستعادة");
}

/**
 * فتح جلسة الاستعادة من الرابط القادم في البريد.
 *
 * تتغيّر صيغة الرابط بتغيّر إعداد المشروع: إمّا رمز تبادل (PKCE) في
 * الاستعلام، أو توكنان في جزء الوسم (implicit). نقبل الصيغتين حتى لا يتوقّف
 * المستخدم على إعدادٍ لا يعرفه ولا يملك تغييره.
 */
export async function openRecoverySession(url: string): Promise<void> {
  if (USE_MOCK_DATA) return;

  // تحليل نصّي مباشر لا عبر URL: الرابط بمخطّط خاص (anshatati://) ومعالجته
  // تختلف بين المنصّات، بينما موضع "?" و"#" واحد في كل الحالات.
  const afterScheme = url.slice(url.indexOf("://") + 3);
  const queryPart = afterScheme.includes("?")
    ? afterScheme.slice(afterScheme.indexOf("?") + 1).split("#")[0]
    : "";
  const hashPart = afterScheme.includes("#") ? afterScheme.slice(afterScheme.indexOf("#") + 1) : "";

  const query = new URLSearchParams(queryPart);
  const hash = new URLSearchParams(hashPart);
  const pick = (key: string) => hash.get(key) ?? query.get(key);

  const failure = pick("error_description") ?? pick("error");
  if (failure) {
    throw new Error("انتهت صلاحية الرابط أو استُعمل من قبل. اطلب رابطًا جديدًا.");
  }

  const code = pick("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw authError(error, "الرابط غير صالح أو انتهت صلاحيته");
    return;
  }

  const accessToken = pick("access_token");
  const refreshToken = pick("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw authError(error, "الرابط غير صالح أو انتهت صلاحيته");
    return;
  }

  throw new Error("لم نفهم رابط الاستعادة. اطلب رابطًا جديدًا من شاشة الدخول.");
}

/** تغيير كلمة المرور بعد فتح رابط الاستعادة، أو من الإعدادات. */
export async function changePassword(newPassword: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw authError(error, "تعذّر تغيير كلمة المرور");
}

export async function signOutFromServer(): Promise<void> {
  if (USE_MOCK_DATA) return;
  await supabase.auth.signOut();
}

/* ------------------------------ تعديل الملف ------------------------------ */

export async function updateFullName(userId: string, fullName: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.from("users").update({ full_name: fullName }).eq("id", userId);
  if (error) throw error;
}
