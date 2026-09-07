import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { showToast } from "@/store/toastStore";

function formatStamp(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("ar-OM", { hour: "2-digit", minute: "2-digit" });
  return `${date.toISOString().slice(0, 10)} · ${time}`;
}

/** سجل بكل ما تمّ من لوحة الإدارة — يجعل التغييرات قابلة للمراجعة. */
export default function AdminLogScreen() {
  const log = useAdminSettingsStore((state) => state.log);
  const clearLog = useAdminSettingsStore((state) => state.clearLog);
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="سجل العمليات"
        action={
          log.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="مسح السجل"
              onPress={() => setConfirming(true)}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={19} color={colors.danger} />
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {log.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="السجل فارغ"
            subtitle="ستظهر هنا كل عملية تتم من لوحة الإدارة"
          />
        ) : (
          <View style={styles.listCard}>
            {log.map((entry, index) => (
              <View key={entry.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.row}>
                  <View style={styles.dot} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.action}>{entry.action}</Text>
                    <Text style={styles.stamp}>{formatStamp(entry.at)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.note}>
          يُحفظ آخر 100 عملية. عند ربط Supabase يُكتب السجل على الخادم مع معرّف الحساب الذي نفّذ كل
          عملية، فلا يمكن التعديل عليه من التطبيق.
        </Text>
      </ScrollView>

      <BottomSheet visible={confirming} onClose={() => setConfirming(false)}>
        <Text style={styles.sheetTitle}>مسح السجل</Text>
        <Text style={styles.sheetBody}>سيُحذف سجل العمليات بالكامل ولا يمكن استرجاعه.</Text>
        <PrimaryButton
          label="مسح نهائيًا"
          onPress={() => {
            clearLog();
            setConfirming(false);
            showToast("تم مسح السجل", "success");
          }}
          style={{ marginTop: spacing.lg, backgroundColor: colors.danger }}
        />
        <SecondaryButton
          label="تراجع"
          onPress={() => setConfirming(false)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  action: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  stamp: { ...typography.caption, fontSize: 12 },
  divider: { height: 1, backgroundColor: colors.border },
  note: { ...typography.caption, lineHeight: 20, marginTop: spacing.xl, textAlign: "center" },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.bodyMuted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
});
