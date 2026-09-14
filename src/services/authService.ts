import * as Linking from "expo-linking";
import type { User } from "@/types/models";
import { isValidPhone, looksLikeEmail, normalizePhone } from "@/utils/identity";
import { USE_MOCK_DATA, VERIFY_CHANNEL } from "./config";
import type { VerifyChannel } from "./config";
import { supabase } from "./supabase";

// تُعاد التصدير ليبقى مسار الاستيراد في الشاشات كما هو؛ والمنطق نفسه في
// utils/identity حيث يُختبر وحده بلا تبعيات.
export { isValidPhone, looksLikeEmail, normalizePhone };

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

/**
 * ما يُعاد بعد طلب إنشاء الحساب.
 *
 * `pending` يعني أن الحساب أُنشئ ولم يُفتح بعد: أُرسل رمز إلى `destination`،
 * ولا جلسة قبل إدخاله. و`user` يُملأ حين لا تأكيد فيدخل صاحبه مباشرة.
 */
export interface SignUpResult {
  pending: boolean;
  channel: VerifyChannel;
  destination: string;
  user?: User;
}

/**
 * بيانات الحساب تُحفظ في `user_metadata` عند الطلب، لا في جدول users.
 *
 * قبل إدخال الرمز لا جلسة، وسياسة الإدراج على الجدول تشترط أن يكون الصفّ
 * لصاحبه (auth.uid() = id) — فالكتابة قبل التأكيد مرفوضة أصلًا. ولمّا كانت
 * البيانات في البيانات الوصفية، يبقى الصفّ قابلًا للإنشاء بعد التأكيد ولو
 * أُغلق التطبيق بينهما.
 */
function metadataOf(input: SignUpInput) {
  return {
    full_name: fullNameOf(input),
    first_name: input.firstName.trim(),
    second_name: input.secondName.trim(),
    family_name: input.familyName.trim(),
    phone: normalizePhone(input.phone),
    email: input.email.trim().toLowerCase(),
  };
}

export async function signUpWithPassword(input: SignUpInput): Promise<SignUpResult> {
  const phone = normalizePhone(input.phone);
  const email = input.email.trim().toLowerCase();
  const name = fullNameOf(input);

  if (USE_MOCK_DATA) {
    if (VERIFY_CHANNEL === "off") {
      return {
        pending: false,
        channel: "off",
        destination: "",
        user: { id: `dev-${phone}`, name, phone, email, createdAt: new Date().toISOString() },
      };
    }
    return {
      pending: true,
      channel: VERIFY_CHANNEL,
      destination: VERIFY_CHANNEL === "sms" ? phone : email,
    };
  }

  const data_ = metadataOf(input);

  // بالرسالة القصيرة يكون الرقم هو هويّة الحساب عند الإنشاء، فالرمز يُرسل
  // إليه. والبريد يُربط بعد التأكيد.
  const credentials =
    VERIFY_CHANNEL === "sms"
      ? { phone, password: input.password, options: { data: data_ } }
      : { email, password: input.password, options: { data: data_ } };

  const { data, error } = await supabase.auth.signUp(credentials);
  if (error) throw authError(error, "تعذّر إنشاء الحساب");

  const userId = data.user?.id;
  if (!userId) throw new Error("تعذّر إنشاء الحساب — لم يُرجع الخادم معرّفًا.");

  // جلسة فورية تعني أن الخادم لا يطلب تأكيدًا: نكمل كما كنّا.
  if (data.session) {
    await linkIdentitiesAndProfile(userId, data_);
    return { pending: false, channel: "off", destination: "", user: userOf(userId, data_) };
  }

  return {
    pending: true,
    channel: VERIFY_CHANNEL,
    destination: VERIFY_CHANNEL === "sms" ? phone : email,
  };
}

const userOf = (id: string, meta: ReturnType<typeof metadataOf>): User => ({
  id,
  name: meta.full_name,
  firstName: meta.first_name,
  secondName: meta.second_name,
  familyName: meta.family_name,
  phone: meta.phone,
  email: meta.email,
  createdAt: new Date().toISOString(),
});

/**
 * بعد أن تُفتح الجلسة: نربط الهويّة الثانية ونكتب صفّ الملف الشخصي.
 *
 * الهويّة الثانية ليست ترفًا: من سجّل ببريده يريد أن يدخل برقمه أيضًا،
 * والعكس. وقد يرفضها الخادم إن طلب تأكيدًا لها، فلا نُسقط التسجيل كلّه من
 * أجلها — لكن لا نسكت عنها أيضًا.
 */
async function linkIdentitiesAndProfile(
  userId: string,
  meta: ReturnType<typeof metadataOf>
): Promise<void> {
  const second = VERIFY_CHANNEL === "sms" ? { email: meta.email } : { phone: meta.phone };
  const { error: linkError } = await supabase.auth.updateUser(second);

  const { error: profileError } = await supabase.from("users").upsert({
    id: userId,
    full_name: meta.full_name,
    first_name: meta.first_name,
    second_name: meta.second_name,
    family_name: meta.family_name,
    phone: meta.phone,
    email: meta.email,
  });
  if (profileError) {
    // الرقم محفوظ فريدًا في الجدول: تكراره يعني أن شخصًا آخر سجّل به.
    if ((profileError as { code?: string }).code === "23505") {
      throw new Error("هذا الرقم مسجَّل بحساب آخر. استعمل رقمًا غيره، أو استعد كلمة مرور حسابك.");
    }
    throw profileError;
  }

  if (linkError) {
    const missing = VERIFY_CHANNEL === "sms" ? "البريد" : "الرقم";
    console.warn(`[auth] لم تُربط ${missing} بالحساب:`, linkError.message);
  }
}

/** رمز مكوّن من ستة أرقام، كما ترسله Supabase. */
export const CODE_LENGTH = 6;

/**
 * إدخال الرمز: يفتح الجلسة، ثم يُنشأ صفّ الملف الشخصي.
 *
 * الترتيب مقصود — قبل الجلسة لا هويّة للمستخدم، وسياسة الإدراج تشترط أن
 * يكون الصفّ لصاحبه، فالكتابة قبل التأكيد كانت تُرفض بصمت.
 */
export async function confirmSignUpCode(destination: string, code: string): Promise<User> {
  const token = code.replace(/\D/g, "");

  if (USE_MOCK_DATA) {
    if (token.length !== CODE_LENGTH) throw new Error("الرمز ستة أرقام.");
    return {
      id: `dev-${destination}`,
      name: "مستخدم",
      phone: looksLikeEmail(destination) ? "+96890000000" : destination,
      email: looksLikeEmail(destination) ? destination : undefined,
      createdAt: new Date().toISOString(),
    };
  }

  const params = looksLikeEmail(destination)
    ? ({ email: destination, token, type: "signup" } as const)
    : ({ phone: destination, token, type: "sms" } as const);

  const { data, error } = await supabase.auth.verifyOtp(params);
  if (error) throw authError(error, "الرمز غير صحيح أو انتهت صلاحيته");

  const user = data.user;
  if (!user) throw new Error("تعذّر تأكيد الحساب.");

  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  const filled = {
    full_name: meta.full_name ?? "",
    first_name: meta.first_name ?? "",
    second_name: meta.second_name ?? "",
    family_name: meta.family_name ?? "",
    phone: meta.phone ?? user.phone ?? "",
    email: meta.email ?? user.email ?? "",
  };
  await linkIdentitiesAndProfile(user.id, filled);
  return userOf(user.id, filled);
}

/** إعادة إرسال الرمز إلى الوجهة نفسها. */
export async function resendSignUpCode(destination: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const params = looksLikeEmail(destination)
    ? ({ type: "signup", email: destination } as const)
    : ({ type: "sms", phone: destination } as const);
  const { error } = await supabase.auth.resend(params);
  if (error) throw authError(error, "تعذّر إرسال رمز جديد");
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
