import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { useAllActivities } from "@/hooks/useActivities";
import { getCheckInCode } from "@/services/adminService";
import type { CheckInCode } from "@/services/adminService";
import { formatArabicDate, isExpired, remainingLabel } from "@/utils/date";

/**
 * رموز الحضور، نشاطًا نشاطًا — ولمسةٌ واحدة إلى الرمز المعروض.
 *
 * وكانت موجودة قبل هذا، لكن في آخر شاشة إدارة النشاط الواحد: تفتح الإدارة،
 * ثم الأنشطة، ثم النشاط، ثم تنزل إلى أسفله. فمن لم يكن يعرف أنها هناك لم
 * يجدها — وهذا ما وقع. والرمز يُطبع ويُعلَّق في القاعة، فطريقه يجب أن يكون
 * أقصر من ذلك.
 */
export default function AdminCheckInCodesScreen() {
  const { data: activities, isLoading, error, refetch } = useAllActivities();

  // دقيقةً بدقيقة: ما يُعرض هنا هو «باقٍ كذا»، وعددٌ لا ينقص كذبٌ صغير.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const codes = useQuery({
    queryKey: ["checkin-codes", (activities ?? []).map((a) => a.id).join(",")],
    enabled: Boolean(activities?.length),
    queryFn: async () => {
      const entries = await Promise.all(
        (activities ?? []).map(async (activity) => {
          // رمز واحد يتعذّر قراءته لا يُسقط القائمة كلّها.
          const saved = await getCheckInCode(activity.id).catch(() => null);
          return [activity.id, saved] as const;
        })
      );
      return Object.fromEntries(entries) as Record<string, CheckInCode | null>;
    },
  });

  // الشاشة تفتح دائمًا على شاشة الرمز: هي التي تُنشئ وتُبدّل وتعرض الوقت.
  // وكان الإنشاء هنا بلمسة بلا اختيار مدّة، فيُولَد رمز دائم لا ينتهي.
  const open = (id: string, title: string) =>
    router.push({ pathname: "/admin/checkin-qr", params: { id, title } });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="رموز الحضور" />
      <QueryState isLoading={isLoading} error={error} onRetry={() => void refetch()}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.hint}>
            لكل نشاط رمز واحد. المس النشاط لتفتح رمزه، ومن هناك تختار مدّته وتنشئ غيره.
            ويمسحه الحاضر من «تسجيل الحضور» فتُحتسب له نقاط الحضور، ولا يظهر الرمز لأي عضو.
          </Text>

          {(activities ?? []).length > 0 ? (
            (activities ?? []).map((activity) => {
              const saved = codes.data?.[activity.id] ?? null;
              const code = saved?.code ?? null;
              const dead = isExpired(saved?.expiresAt ?? null, now);
              return (
                <Pressable
                  key={activity.id}
                  accessibilityRole="button"
                  accessibilityLabel={
                    code ? `اعرض رمز ${activity.title}` : `أنشئ رمزًا لـ ${activity.title}`
                  }
                  onPress={() => open(activity.id, activity.title)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={[styles.icon, code && !dead ? styles.iconOn : styles.iconOff]}>
                    <Ionicons
                      name={code ? "qr-code" : "add"}
                      size={19}
                      color={dead ? colors.danger : code ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {activity.title}
                    </Text>
                    <Text style={[styles.rowMeta, dead && styles.rowMetaDead]}>
                      {formatArabicDate(activity.date)} ·{" "}
                      {!code
                        ? "بلا رمز — المس لإنشائه"
                        : dead
                          ? "انتهت صلاحية رمزه"
                          : saved?.expiresAt
                            ? `${code} · ${remainingLabel(saved.expiresAt, now)}`
                            : `الرمز ${code}`}
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
  rowMetaDead: { color: colors.danger },
});
