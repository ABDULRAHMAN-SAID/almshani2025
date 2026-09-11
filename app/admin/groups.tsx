import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { deleteGroup, fetchGroups, updateGroup } from "@/services/groupService";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { showToast } from "@/store/toastStore";
import type { DiscussionGroup } from "@/types/models";
import { toArabicMessage } from "@/utils/errors";
import { useFeatures, useSetFeature } from "@/hooks/useFeatures";

export default function AdminGroupsScreen() {
  const client = useQueryClient();
  const { discussionEnabled: enabled } = useFeatures();
  const setFeatureMutation = useSetFeature();
  const logAction = useAdminSettingsStore((state) => state.logAction);
  const [pendingDelete, setPendingDelete] = useState<DiscussionGroup | null>(null);

  const query = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const groups = query.data ?? [];

  const refresh = () => client.invalidateQueries({ queryKey: ["groups"] });

  const toggleLock = async (group: DiscussionGroup) => {
    try {
      await updateGroup(group.id, { locked: !group.locked });
      await refresh();
      logAction(`${group.locked ? "فتح" : "قفل"} مجموعة: ${group.title}`);
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر تغيير حالة المجموعة"), "error");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteGroup(pendingDelete.id);
      await refresh();
      logAction(`حذف مجموعة: ${pendingDelete.title}`);
      showToast("تم حذف المجموعة", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر حذف المجموعة"), "error");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="المجموعات النقاشية"
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="مجموعة نقاشية جديدة"
            onPress={() => router.push("/admin/new-group")}
            hitSlop={8}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </Pressable>
        }
      />

      <View style={styles.masterSwitch}>
        <Ionicons name="chatbubbles-outline" size={19} color={colors.primary} />
        <View style={styles.switchBody}>
          <Text style={styles.switchLabel}>تفعيل المجموعات النقاشية</Text>
          <Text style={styles.switchHint}>
            عند الإيقاف تختفي المجموعات من التطبيق كليًا، وتبقى المشاركات محفوظة كما هي.
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={async () => {
            try {
              await setFeatureMutation.mutateAsync({ key: "discussionEnabled", value: !enabled });
              logAction(enabled ? "إيقاف المجموعات النقاشية" : "تفعيل المجموعات النقاشية");
            } catch (error) {
              showToast(toArabicMessage(error, "تعذّر تغيير حالة المجموعات"), "error");
            }
          }}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
          thumbColor={colors.surface}
        />
      </View>

      <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {groups.length === 0 ? (
            <>
              <EmptyState
                icon="chatbubbles-outline"
                title="لا توجد مجموعات"
                subtitle="أنشئ مجموعة نقاش حول نشاط أو موضوع."
              />
              <PrimaryButton label="مجموعة جديدة" onPress={() => router.push("/admin/new-group")} />
            </>
          ) : (
            groups.map((group) => (
              <View key={group.id} style={styles.card}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/groups/${group.id}`)}
                  style={styles.cardHead}
                >
                  <View style={styles.cardBody}>
                    <Text style={styles.title} numberOfLines={1}>
                      {group.title}
                    </Text>
                    <Text style={styles.meta}>
                      {group.topic} • {group.postCount} مشاركة •{" "}
                      {group.audience === "all" ? "للجميع" : "للمسجّلين"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                </Pressable>

                <View style={styles.cardActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void toggleLock(group)}
                    style={styles.action}
                  >
                    <Ionicons
                      name={group.locked ? "lock-closed" : "lock-open-outline"}
                      size={16}
                      color={group.locked ? colors.warning : colors.success}
                    />
                    <Text style={styles.actionLabel}>{group.locked ? "مقفلة — افتح" : "مفتوحة — أقفل"}</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPendingDelete(group)}
                    style={styles.action}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={[styles.actionLabel, { color: colors.danger }]}>حذف</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </QueryState>

      <BottomSheet visible={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
        <Text style={styles.sheetTitle}>حذف المجموعة</Text>
        <Text style={styles.sheetBody}>
          سيُحذف «{pendingDelete?.title}» مع كل مشاركاته ومرفقاته نهائيًا.
        </Text>
        <PrimaryButton label="تأكيد الحذف" onPress={confirmDelete} style={{ marginTop: spacing.lg }} />
        <SecondaryButton
          label="إلغاء"
          onPress={() => setPendingDelete(null)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  masterSwitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  switchBody: { flex: 1, gap: 2 },
  switchLabel: { ...typography.body, fontSize: 14, fontFamily: "Tajawal_500Medium" },
  switchHint: { ...typography.caption, fontSize: 11, lineHeight: 18 },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  cardBody: { flex: 1, gap: 3 },
  title: { ...typography.body, fontSize: 14, fontFamily: "Tajawal_500Medium" },
  meta: { ...typography.caption, fontSize: 11 },
  cardActions: {
    flexDirection: "row",
    gap: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionLabel: { ...typography.caption, fontSize: 11 },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.caption, textAlign: "center", marginTop: spacing.sm, lineHeight: 21 },
});
