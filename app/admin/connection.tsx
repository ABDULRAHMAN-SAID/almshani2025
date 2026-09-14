import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { useConnection } from "@/hooks/useConnection";
import { verifyAdminAccess } from "@/services/adminAuthService";
import { SUPABASE_URL, USE_MOCK_DATA } from "@/services/config";
import { supabase } from "@/services/supabase";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

type Verdict = "ok" | "warn" | "fail";

interface CheckResult {
  key: string;
  label: string;
  verdict: Verdict;
  detail: string;
  ms?: number;
}

const VERDICT_META: Record<Verdict, { icon: keyof typeof Ionicons.glyphMap; tint: string; soft: string }> = {
  ok: { icon: "checkmark-circle", tint: colors.success, soft: colors.successSoft },
  warn: { icon: "alert-circle", tint: colors.warning, soft: colors.warningSoft },
  fail: { icon: "close-circle", tint: colors.danger, soft: colors.dangerSoft },
};

/** اسم المضيف فقط — لا نعرض الرابط كاملًا ولا المفتاح. */
function projectHost(): string {
  if (!SUPABASE_URL) return "غير مضبوط";
  try {
    return new URL(SUPABASE_URL).host;
  } catch {
    return "رابط غير صالح";
  }
}

/**
 * أداة فحص الربط داخل التطبيق.
 *
 * تجيب عن السؤال الذي يتكرّر في الميدان: «هل التطبيق يقرأ من الخادم فعلًا،
 * أم ما زال على البيانات التجريبية؟» — وتقيس الزمن، فيُعرف البطء من الانقطاع.
 * للقراءة فقط: لا تكتب أي صف ولا تعرض أي مفتاح.
 */
export default function AdminConnectionScreen() {
  const { isOnline } = useConnection();
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  const runChecks = async () => {
    setRunning(true);
    const found: CheckResult[] = [];

    if (USE_MOCK_DATA) {
      found.push({
        key: "mode",
        label: "مصدر البيانات",
        verdict: "warn",
        detail: "بيانات تجريبية في الذاكرة — لا يُقرأ من الخادم بعد",
      });
      setResults(found);
      setRunning(false);
      showToast("التطبيق على البيانات التجريبية", "info");
      return;
    }

    found.push({
      key: "mode",
      label: "مصدر البيانات",
      verdict: "ok",
      detail: `الخادم الحقيقي — ${projectHost()}`,
    });

    // 1) قراءة عامة: أبسط طلب يمرّ بكامل المسار (شبكة، مصادقة، RLS)
    const t0 = Date.now();
    try {
      const { error } = await supabase.from("activities").select("id", { head: true, count: "exact" });
      const ms = Date.now() - t0;
      found.push(
        error
          ? { key: "read", label: "قراءة الأنشطة", verdict: "fail", detail: toArabicMessage(error, "فشل"), ms }
          : {
              key: "read",
              label: "قراءة الأنشطة",
              verdict: ms > 2500 ? "warn" : "ok",
              detail: ms > 2500 ? "بطيء — تحقّق من الشبكة" : "الاتصال سليم",
              ms,
            }
      );
    } catch (error) {
      found.push({
        key: "read",
        label: "قراءة الأنشطة",
        verdict: "fail",
        detail: toArabicMessage(error, "تعذّر الوصول إلى الخادم"),
        ms: Date.now() - t0,
      });
    }

    // 2) الجلسة: بدونها تفشل كل السياسات المبنية على auth.uid()
    try {
      const { data } = await supabase.auth.getSession();
      found.push(
        data.session
          ? { key: "session", label: "جلسة الحساب", verdict: "ok", detail: "الحساب مسجَّل دخوله على الخادم" }
          : {
              key: "session",
              label: "جلسة الحساب",
              verdict: "fail",
              detail: "لا توجد جلسة — سياسات الحماية ستمنع كل شيء",
            }
      );
    } catch (error) {
      found.push({
        key: "session",
        label: "جلسة الحساب",
        verdict: "fail",
        detail: toArabicMessage(error, "تعذّرت قراءة الجلسة"),
      });
    }

    // 3) الصلاحية: نفس السؤال الذي تسأله اللوحة قبل أن تُفتح
    try {
      const admin = await verifyAdminAccess();
      found.push({
        key: "admin",
        label: "صلاحية الإدارة",
        verdict: admin ? "ok" : "fail",
        detail: admin ? "الحساب مُدرج في جدول admins" : "الحساب غير مُدرج",
      });
    } catch (error) {
      found.push({
        key: "admin",
        label: "صلاحية الإدارة",
        verdict: "fail",
        detail: toArabicMessage(error, "تعذّر سؤال الخادم"),
      });
    }

    // 4) حاوية المرفقات: الرفع يفشل صامتًا بدونها
    try {
      const { error } = await supabase.storage.from("app-media").list("", { limit: 1 });
      found.push({
        key: "storage",
        label: "حاوية المرفقات",
        verdict: error ? "warn" : "ok",
        detail: error ? toArabicMessage(error, "غير متاحة") : "app-media جاهزة",
      });
    } catch (error) {
      found.push({
        key: "storage",
        label: "حاوية المرفقات",
        verdict: "warn",
        detail: toArabicMessage(error, "غير متاحة"),
      });
    }

    setResults(found);
    setRunning(false);
    const failed = found.filter((item) => item.verdict === "fail").length;
    showToast(failed === 0 ? "الربط سليم" : `${failed} فحصًا فشل`, failed === 0 ? "success" : "error");
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="فحص الربط" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <Row label="مصدر البيانات" value={USE_MOCK_DATA ? "بيانات تجريبية" : "خادم حقيقي"} />
          <View style={styles.divider} />
          <Row label="المشروع" value={USE_MOCK_DATA ? "—" : projectHost()} />
          <View style={styles.divider} />
          <Row label="شبكة الجهاز" value={isOnline ? "متصلة" : "منقطعة"} />
        </View>

        <PrimaryButton
          label="ابدأ الفحص"
          onPress={runChecks}
          loading={running}
          style={{ marginTop: spacing.lg }}
        />

        {results.map((item) => {
          const meta = VERDICT_META[item.verdict];
          return (
            <View key={item.key} style={styles.result}>
              <View style={[styles.resultIcon, { backgroundColor: meta.soft }]}>
                <Ionicons name={meta.icon} size={18} color={meta.tint} />
              </View>
              <View style={styles.resultBody}>
                <Text style={styles.resultLabel}>{item.label}</Text>
                <Text style={styles.resultDetail}>{item.detail}</Text>
              </View>
              {item.ms !== undefined ? <Text style={styles.ms}>{item.ms} ms</Text> : null}
            </View>
          );
        })}

        <View style={styles.notice}>
          <Ionicons name="terminal-outline" size={17} color={colors.marineDeep} />
          <Text style={styles.noticeText}>
            هذا فحص سريع من داخل التطبيق. الفحص الكامل للجداول والدوال والحاويات من الطرفية:
            {"\n"}
            <Text style={styles.mono}>npm run check:supabase</Text>
            {"\n"}
            ثم اختبارات الصلاحيات العدائية: <Text style={styles.mono}>supabase/security-tests.sql</Text>
          </Text>
        </View>

        <View style={styles.privacy}>
          <Ionicons name="eye-off-outline" size={17} color={colors.textMuted} />
          <Text style={styles.noticeText}>
            لا تعرض هذه الشاشة أي مفتاح ولا رابطًا كاملًا — اسم المشروع فقط.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md },
  rowLabel: { ...typography.body, fontSize: 14 },
  rowValue: { ...typography.caption, fontSize: 12.5, fontFamily: "Tajawal_500Medium", color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  resultIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  resultBody: { flex: 1, gap: 2 },
  resultLabel: { ...typography.body, fontSize: 13.5, fontFamily: "Tajawal_500Medium" },
  resultDetail: { ...typography.caption, fontSize: 11.5, lineHeight: 18 },
  ms: { ...typography.caption, fontSize: 11, fontFamily: "Tajawal_500Medium", color: colors.textMuted },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  privacy: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  noticeText: { ...typography.caption, flex: 1, lineHeight: 21, color: colors.textSecondary },
  mono: { fontFamily: "Tajawal_700Bold", color: colors.marineDeep },
});
