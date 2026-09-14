import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { saveContact } from "@/services/contactService";
import { type ContactInfo, useAdminSettingsStore } from "@/store/adminSettingsStore";
import { toArabicMessage } from "@/utils/errors";
import { showToast } from "@/store/toastStore";

const FIELDS: {
  key: keyof ContactInfo;
  label: string;
  placeholder: string;
  keyboard?: "phone-pad" | "email-address";
  multiline?: boolean;
}[] = [
  { key: "department", label: "اسم الجهة", placeholder: "قسم الأنشطة — قاعدة صلالة الجوية" },
  { key: "phone", label: "رقم الهاتف", placeholder: "23299000", keyboard: "phone-pad" },
  { key: "whatsapp", label: "رقم واتساب (بمفتاح الدولة)", placeholder: "96823299000", keyboard: "phone-pad" },
  { key: "email", label: "البريد الإلكتروني", placeholder: "example@domain.om", keyboard: "email-address" },
  { key: "office", label: "مقر القسم", placeholder: "مبنى الأنشطة — الدور الأول" },
  { key: "hours", label: "ساعات العمل", placeholder: "الأحد إلى الخميس، 8:00 — 2:00", multiline: true },
];

export default function AdminContactScreen() {
  const contact = useAdminSettingsStore((state) => state.contact);
  const logAction = useAdminSettingsStore((state) => state.logAction);
  const client = useQueryClient();
  const [draft, setDraft] = useState<ContactInfo>(contact);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (draft.department.trim().length < 3) {
      showToast("اكتب اسم الجهة", "error");
      return;
    }
    const cleaned = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [key, value.trim()])
    ) as ContactInfo;

    setSaving(true);
    try {
      await saveContact(cleaned);
      await client.invalidateQueries({ queryKey: ["contact"] });
      logAction("تعديل بيانات التواصل");
      showToast("تم حفظ بيانات التواصل", "success");
      router.back();
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر حفظ بيانات التواصل"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="بيانات التواصل" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          هذه البيانات تظهر لكل المستخدمين في شاشة «تواصل معنا». اكتب خط القسم الرسمي فقط، لا رقمًا شخصيًا.
        </Text>

        {FIELDS.map((field) => (
          <View key={field.key}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              value={draft[field.key]}
              onChangeText={(text) => setDraft((current) => ({ ...current, [field.key]: text }))}
              placeholder={field.placeholder}
              placeholderTextColor={colors.textMuted}
              keyboardType={field.keyboard ?? "default"}
              style={[styles.input, field.multiline && styles.multiline]}
              multiline={field.multiline}
              textAlign="right"
            />
          </View>
        ))}

        <PrimaryButton
          label="حفظ البيانات"
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  intro: { ...typography.caption, lineHeight: 21, marginBottom: spacing.sm },
  label: { ...typography.h3, fontSize: 14, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  multiline: { height: 84, paddingTop: spacing.md, textAlignVertical: "top" },
});
