import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QrCode } from "@/components/QrCode";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography, themed } from "@/constants";
import {
  CODE_DURATIONS,
  generateCheckInCode,
  getCheckInCode,
  setCheckInCode,
} from "@/services/adminService";
import { showToast } from "@/store/toastStore";
import { isExpired, omanClockLabel, remainingLabel } from "@/utils/date";
import { toArabicMessage } from "@/utils/errors";

/**
 * رمز الحضور بملء الشاشة — يُرفع أمام الحاضرين أو يُطبع ويُعلَّق.
 *
 * الخلفية بيضاء والرمز أسود مهما كان لون التطبيق: القارئ يميّز بالتباين، وكل
 * تلوينٍ هنا يقلّل نسبة المسح الناجح. والرمز النصيّ مكتوب تحته كبيرًا لمن
 * تعطّلت كاميرته أو وقف بعيدًا.
 *
 * ووقت الانتهاء مكتوب مع الرمز لا في شاشة أخرى: الرمز الذي لا يُعرف متى
 * ينتهي يُصوَّر ويُرسل إلى من لم يحضر، فتُحتسب له نقاط حضورٍ لم يحضره — ومن
 * يعرض الرمز هو وحده من يقدر أن يقرّر كم يعيش.
 */
export default function CheckInQrScreen() {
  const client = useQueryClient();
  const params = useLocalSearchParams<{ id?: string; code?: string; title?: string }>();
  const activityId = (params.id ?? "").trim();
  const title = params.title ?? "";

  const [minutes, setMinutes] = useState(60);
  // ثانيةً بثانية: العدّ التنازلي يجب أن يتحرّك أمام من يعرض الرمز، فيرى
  // انتهاءه قبل أن يقف أحدهم أمام الشاشة ويمسح رمزًا ميّتًا.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const saved = useQuery({
    queryKey: ["checkin-code", activityId],
    enabled: activityId.length > 0,
    queryFn: () => getCheckInCode(activityId),
  });

  const create = useMutation({
    mutationFn: () => setCheckInCode(activityId, generateCheckInCode(), minutes),
    onSuccess: () => {
      void client.invalidateQueries();
      showToast("أُنشئ رمز جديد", "success");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر إنشاء الرمز"), "error"),
  });

  // ما يُعرض: آخر ما أُنشئ في هذه الجلسة، وإلا المحفوظ، وإلا ما جاء في الرابط.
  const current = create.data ?? saved.data ?? (params.code ? { code: params.code, expiresAt: null } : null);
  const value = (current?.code ?? "").trim().toUpperCase();
  const dead = isExpired(current?.expiresAt ?? null, now);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="رمز الحضور" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {title ? <Text style={styles.activity}>{title}</Text> : null}

        {value ? (
          <>
            <View style={dead ? styles.dimmed : undefined}>
              <QrCode value={value} size={260} />
            </View>
            <Text style={styles.code}>{value}</Text>

            {/* الوقت أوضح ما في الشاشة بعد الرمز نفسه. */}
            {current?.expiresAt ? (
              <View style={[styles.timeBox, dead ? styles.timeBoxDead : styles.timeBoxLive]}>
                <Ionicons
                  name={dead ? "close-circle" : "time-outline"}
                  size={20}
                  color={dead ? colors.danger : colors.success}
                />
                <Text style={[styles.timeText, dead ? styles.timeDead : styles.timeLive]}>
                  {dead
                    ? "انتهت صلاحية هذا الرمز — أنشئ غيره"
                    : `ينتهي ${omanClockLabel(new Date(current.expiresAt))} · ${remainingLabel(current.expiresAt, now)}`}
                </Text>
              </View>
            ) : (
              <View style={[styles.timeBox, styles.timeBoxPlain]}>
                <Ionicons name="infinite-outline" size={20} color={colors.textMuted} />
                <Text style={styles.timeText}>هذا الرمز بلا وقت انتهاء</Text>
              </View>
            )}

            <Text style={styles.hint}>
              يمسحه الحاضر من «حسابي ← تسجيل الحضور»، أو يكتبه يدويًّا.
            </Text>
          </>
        ) : (
          <Text style={styles.hint}>لا يوجد رمز لهذا النشاط بعد — اختر المدّة وأنشئه.</Text>
        )}

        {activityId ? (
          <View style={styles.maker}>
            <Text style={styles.makerTitle}>رمز جديد ينتهي بعد</Text>
            <View style={styles.chips}>
              {CODE_DURATIONS.map((option) => {
                const active = option.minutes === minutes;
                return (
                  <Pressable
                    key={option.minutes}
                    accessibilityRole="button"
                    onPress={() => setMinutes(option.minutes)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <PrimaryButton
              label="أنشئ رمزًا جديدًا"
              onPress={() => create.mutate()}
              loading={create.isPending}
            />
            <Text style={styles.makerHint}>
              الرمز الجديد يُبطل القديم فورًا، فلا يُحتسب حضورٌ برمزٍ صُوِّر وأُرسل.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { alignItems: "center", gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  activity: { ...typography.h3, textAlign: "center" },
  dimmed: { opacity: 0.25 },
  code: {
    ...typography.h1,
    letterSpacing: 6,
    writingDirection: "ltr",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  timeBoxLive: { backgroundColor: colors.successSoft, borderColor: "rgba(19,122,86,0.35)" },
  timeBoxDead: { backgroundColor: colors.dangerSoft, borderColor: "rgba(163,34,24,0.35)" },
  timeBoxPlain: { backgroundColor: colors.surface, borderColor: colors.border },
  timeText: { ...typography.body, fontFamily: "Tajawal_700Bold", textAlign: "center" },
  timeLive: { color: colors.success },
  timeDead: { color: colors.danger },
  hint: { ...typography.caption, textAlign: "center", lineHeight: 22 },
  maker: {
    alignSelf: "stretch",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  makerTitle: { ...typography.body, fontFamily: "Tajawal_700Bold" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textPrimary },
  chipTextActive: { color: colors.textOnPrimary },
  makerHint: { ...typography.caption, fontSize: 11, lineHeight: 18 },
}));
