import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { fetchContact } from "@/services/contactService";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { showToast } from "@/store/toastStore";
import { useFeatures } from "@/hooks/useFeatures";

/** يفتح تطبيق الهاتف/الرسائل/البريد، ويخبر المستخدم بوضوح إن لم يكن متاحًا. */
async function open(url: string, fallbackMessage: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      showToast(fallbackMessage, "error");
      return;
    }
    await Linking.openURL(url);
  } catch {
    showToast(fallbackMessage, "error");
  }
}

export default function ContactScreen() {
  const localContact = useAdminSettingsStore((state) => state.contact);
  // النسخة المحلية تُعرض فورًا، ثم تحلّ محلها نسخة الخادم عند وصولها.
  const { data: contact = localContact } = useQuery({ queryKey: ["contact"], queryFn: fetchContact });
  const { messagesEnabled } = useFeatures();

  const digits = contact.phone.replace(/\D/g, "");
  const whatsapp = contact.whatsapp.replace(/\D/g, "");

  return (
    <View style={styles.screen}>
      <ScreenHeader title="تواصل معنا" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="headset-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.department}>{contact.department}</Text>
          <Text style={styles.hours}>{contact.hours}</Text>
        </View>

        <Text style={styles.sectionTitle}>قنوات التواصل</Text>

        {digits ? (
          <ChannelRow
            icon="call-outline"
            title="اتصال هاتفي"
            value={contact.phone}
            tint={colors.success}
            onPress={() => open(`tel:${digits}`, "لا يمكن إجراء مكالمة من هذا الجهاز")}
          />
        ) : null}

        {digits ? (
          <ChannelRow
            icon="chatbubble-ellipses-outline"
            title="رسالة نصية"
            value={contact.phone}
            tint={colors.marine}
            onPress={() =>
              open(
                Platform.OS === "ios" ? `sms:${digits}` : `sms:${digits}?body=`,
                "لا يمكن إرسال رسالة نصية من هذا الجهاز"
              )
            }
          />
        ) : null}

        {whatsapp ? (
          <ChannelRow
            icon="logo-whatsapp"
            title="واتساب"
            value={`+${whatsapp}`}
            tint="#1F8A5B"
            onPress={() => open(`https://wa.me/${whatsapp}`, "تعذّر فتح واتساب على هذا الجهاز")}
          />
        ) : null}

        {contact.email ? (
          <ChannelRow
            icon="mail-outline"
            title="البريد الإلكتروني"
            value={contact.email}
            tint={colors.primaryLight}
            onPress={() => open(`mailto:${contact.email}`, "لا يوجد تطبيق بريد على هذا الجهاز")}
          />
        ) : null}

        {contact.office ? (
          <View style={styles.infoRow}>
            <View style={[styles.rowIcon, { backgroundColor: colors.backgroundDeep }]}>
              <Ionicons name="business-outline" size={19} color={colors.textSecondary} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>مقر القسم</Text>
              <Text style={styles.infoValue}>{contact.office}</Text>
            </View>
          </View>
        ) : null}

        {messagesEnabled ? (
          <>
            <Text style={styles.sectionTitle}>مراسلة داخل التطبيق</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/compose")}
              style={({ pressed }) => [styles.composeCard, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="create-outline" size={22} color={colors.textOnPrimary} />
              <View style={styles.composeBody}>
                <Text style={styles.composeTitle}>اكتب إلى الإدارة</Text>
                <Text style={styles.composeHint}>
                  اقتراح أو طلب أو استفسار، مع إمكانية إرفاق صورة أو فيديو أو مقطع صوتي.
                </Text>
              </View>
              <Ionicons name="chevron-back" size={18} color={colors.textOnPrimaryMuted} />
            </Pressable>
          </>
        ) : null}

        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={17} color={colors.marineDeep} />
          <Text style={styles.noticeText}>
            هذه قنوات القسم الرسمية فقط. التطبيق لا يعرض أرقام المستخدمين لبعضهم، ولا يُشارك أي بيانات
            شخصية خارج ما تكتبه أنت في رسالتك.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ChannelRow({
  icon,
  title,
  value,
  tint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={19} color={tint} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  department: { ...typography.h3, textAlign: "center" },
  hours: { ...typography.caption, textAlign: "center", marginTop: spacing.xs, lineHeight: 20 },
  sectionTitle: { ...typography.h3, fontSize: 14, marginTop: spacing.xl, marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, fontSize: 14, fontFamily: "Tajawal_500Medium" },
  rowValue: { ...typography.caption, fontSize: 12 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoBody: { flex: 1, gap: 2 },
  infoTitle: { ...typography.body, fontSize: 14, fontFamily: "Tajawal_500Medium" },
  infoValue: { ...typography.caption, fontSize: 12 },
  composeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  composeBody: { flex: 1, gap: 4 },
  composeTitle: { ...typography.h3, fontSize: 15, color: colors.textOnPrimary },
  composeHint: { ...typography.caption, fontSize: 12, color: colors.textOnPrimaryMuted, lineHeight: 19 },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  noticeText: { ...typography.caption, flex: 1, lineHeight: 20, color: colors.textSecondary },
});
