import { type ContactInfo, adminSettings } from "@/store/adminSettingsStore";
import { USE_MOCK_DATA } from "./config";
import { supabase } from "./supabase";

/**
 * بيانات التواصل الرسمية.
 *
 * في وضع البيانات التجريبية تعيش في إعدادات اللوحة على الجهاز؛ وعلى الخادم
 * صفّ واحد في app_contact يقرأه الجميع ولا يكتبه إلا حساب إداري — فتظهر
 * التعديلات لكل المستخدمين لا على جهاز المسؤول وحده.
 */
export async function fetchContact(): Promise<ContactInfo> {
  if (USE_MOCK_DATA) {
    return adminSettings().contact;
  }

  const { data, error } = await supabase.from("app_contact").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  if (!data) return adminSettings().contact;

  const row = data as Record<string, string>;
  return {
    department: row.department ?? "",
    phone: row.phone ?? "",
    whatsapp: row.whatsapp ?? "",
    email: row.email ?? "",
    office: row.office ?? "",
    hours: row.hours ?? "",
  };
}

export async function saveContact(contact: ContactInfo): Promise<void> {
  // نحدّث النسخة المحلية دائمًا حتى تظهر التعديلات فورًا على جهاز المسؤول.
  adminSettings().setContact(contact);

  if (USE_MOCK_DATA) return;

  const { error } = await supabase
    .from("app_contact")
    .update({ ...contact, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}
