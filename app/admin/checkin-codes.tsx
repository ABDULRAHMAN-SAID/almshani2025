import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { useAllActivities } from "@/hooks/useActivities";
import { generateCheckInCode, getCheckInCode, setCheckInCode } from "@/services/adminService";
import { showToast } from "@/store/toastStore";
import { formatArabicDate } from "@/utils/date";
import { toArabicMessage } from "@/utils/errors";

/**
 * رموز الحضور، نشاطًا نشاطًا — ولمسةٌ واحدة إلى الرمز المعروض.
 *
 * وكانت موجودة قبل هذا، لكن في آخر شاشة إدارة النشاط الواحد: تفتح الإدارة،
 * ثم الأنشطة، ثم النشاط، ثم تنزل إلى أسفله. فمن لم يكن يعرف أنها هناك لم
 * يجدها — وهذا ما وقع. والرمز يُطبع ويُعلَّق في القاعة، فطريقه يجب أن يكون
 * أقصر من ذلك.
 */
export default function AdminCheckInCodesScreen() {
  const client = useQueryClient();
  const { data: activities, isLoading, error, refetch } = useAllActivities();

  const codes = useQuery({
    queryKey: ["checkin-codes", (activities ?? []).map((a) => a.id).join(",")],
    enabled: Boolean(activities?.length),
    queryFn: async () => {
      const entries = await Promise.all(
        (activities ?? []).map(async (activity) => {
          // رمز واحد يتعذّر قراءته لا يُسقط القائمة كلّها.
          const code = await getCheckInCode(activity.id).catch(() => null);
          return [activity.id, code] as const;
        })
      );
      return Object.fromEntries(entries) as Record<string, string | null>;
    },
  });

  const open = (id: string, title: string, code: string) =>
    router.push({ pathname: "/admin/checkin-qr", params: { code, title } });

  // رمزٌ بلمسة: يولَّد، ويُحفظ على الخادم، ثم يُعرض. وبلا الحفظ يكون رمزًا
  // جميلًا على الشاشة يرفضه الخادم عند أول مسح.
  const create = useMutation({
    mutationFn: async (activity: { id: string; title: string }) => {
      const code = await setCheckInCode(activity.id, generateCheckInCode());
      return { ...activity, code };
    },
    onSuccess: ({ id, title, code }) => {
      void client.invalidateQueries({ queryKey: ["checkin-codes"] });
      showToast("أُنشئ رمز الحضور", "success");
      open(id, title, code);
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر إنشاء الرمز"), "error"),
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="رموز الحضور" />
      <QueryState isLoading={isLoading} error={error} onRetry={() => void refetch()}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.hint}>
            لكل نشاط رمز واحد. اعرضه في القاعة أو اطبعه، ويمسحه الحاضر من «تسجيل الحضور» في
            التطبيق فتُحتسب له نقاط الحضور. ولا يظهر الرمز لأي عضو داخل التطبيق.
          </Text>

          {(activities ?? []).length > 0 ? (
            (activities ?? []).map((activity) => {
              const code = codes.data?.[activity.id] ?? null;
              return (
                <Pressable
                  key={activity.id}
                  accessibilityRole="button"
                  accessibilityLabel={
                    code ? `اعرض رمز ${activity.title}` : `أنشئ رمزًا لـ ${activity.title}`
                  }
                  disabled={create.isPending}
                  onPress={() =>
                    code
                      ? open(activity.id, activity.title, code)
                      : create.mutate({ id: activity.id, title: activity.title })
                  }
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={[styles.icon, code ? styles.iconOn : styles.iconOff]}>
                    <Ionicons
                      name={code ? "qr-code" : "add"}
                      size={19}
                      color={code ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {activity.title}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {formatArabicDate(activity.date)} ·{" "}
                      {code ? `الرمز ${code}` : "بلا رمز — المس لإنشائه"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-back" size={17} color={colors.textMuted} />
                </Pressable>
              );
            })
          ) : (
            <EmptyState icon="qr-code-outline" title="لا توجد أنشطة بعد" />
          )}
        </ScrollView>
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  hint: { ...typography.caption, lineHeight: 20, marginBottom: spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconOn: { backgroundColor: "rgba(11,37,69,0.08)" },
  iconOff: { backgroundColor: colors.background },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  rowMeta: { ...typography.caption, fontSize: 11 },
});
