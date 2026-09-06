import type { User } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { supabase } from "./supabase";

/**
 * طبقة المصادقة. في وضع البيانات التجريبية تعمل بـ "Development Login" محلي
 * (بدون OTP حقيقي) بحيث يمكن اختبار التطبيق فورًا. عند ضبط
 * EXPO_PUBLIC_USE_MOCK_DATA=false يتم استخدام Supabase Phone OTP الحقيقي مباشرة
 * بنفس الواجهات دون تعديل أي شاشة.
 */

export async function requestOtp(phone: string): Promise<void> {
  if (USE_MOCK_DATA) {
    return; // في وضع التطوير لا يُرسل OTP فعلي — أي رمز مكوّن من 4 أرقام يُقبل.
  }
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyOtp(phone: string, code: string): Promise<{ isNewUser: boolean; userId: string }> {
  if (USE_MOCK_DATA) {
    if (code.length !== 4) throw new Error("رمز التحقق غير صحيح");
    return { isNewUser: true, userId: `dev-${phone}` };
  }
  const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
  if (error) throw error;
  const userId = data.user?.id ?? "";
  const { data: existing } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
  return { isNewUser: !existing, userId };
}

export async function completeProfile(userId: string, phone: string, fullName: string): Promise<User> {
  const user: User = { id: userId, name: fullName, phone, createdAt: new Date().toISOString() };
  if (USE_MOCK_DATA) {
    return user;
  }
  const { error } = await supabase.from("users").upsert({ id: userId, phone, full_name: fullName });
  if (error) throw error;
  return user;
}

export async function updateFullName(userId: string, fullName: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.from("users").update({ full_name: fullName }).eq("id", userId);
  if (error) throw error;
}
