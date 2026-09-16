import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { FormField } from "@/components/FormField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography, themed } from "@/constants";
import {
  type AdminRole,
  type FoundMember,
  fetchAdminAccounts,
  fetchMyRole,
  findMember,
  grantAdmin,
  revokeAdmin,
  ROLE_HINT,
  ROLE_LABEL,
} from "@/services/adminAuthService";
import { maskPhone } from "@/store/adminSettingsStore";
import { useAuthStore } from "@/store/authStore";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

/**
 * الحسابات الإدارية — منحًا وسحبًا، على الخادم.
 *
 * كانت هذه الشاشة تكتب في ذاكرة الجهاز وحدها: يظهر الاسم في القائمة ولا يصل
 * الخادم، فيظنّ من أضاف أنه فوّض ولم يفوّض. والمنع كان مقصودًا (ألّا يكفي
 * هاتفٌ مفتوح لترقية حسابات) لكنّ شاشةً تُوهم بما لا تفعله أسوأ من غيابها.
 *
 * فصار المنع تدرّجًا: المالك يمنح ما شاء، والإداري يمنح درجة المحرّر وحدها،
 * والمحرّر لا يرى هذه الشاشة أصلًا. والخادم يفحص كل ذلك مرّة أخرى في الدالة
 * نفسها، فلا ينفع تلاعبٌ بالتطبيق.
 */
export default function AdminAccountsScreen() {
  const client = useQueryClient();
  const myId = useAuthStore((state) => state.user?.id);

  const roleQuery = useQuery({ queryKey: ["my-admin-role"], queryFn: fetchMyRole });
  const listQuery = useQuery({ queryKey: ["admin-accounts"], queryFn: fetchAdminAccounts });

  const myRole = roleQuery.data;
  const canGrantAdmin = myRole === "owner";
  const canManage = myRole === "owner" || myRole === "admin";

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<FoundMember[] | null>(null);
  const [picked, setPicked] = useState<FoundMember | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);

  const doSearch = useMutation({
    mutationFn: () => findMember(search),
    onSuccess: (found) => setResults(found),
    onError: (e) => showToast(toArabicMessage(e, "تعذّر البحث"), "error"),
  });

  const doGrant = useMutation({
    mutationFn: (vars: { userId: string; role: Exclude<AdminRole, "owner"> }) =>
      grantAdmin(vars.userId, vars.role),
    onSuccess: () => {
      setPicked(null);
      setResults(null);
      setSearch("");
      void client.invalidateQueries({ queryKey: ["admin-accounts"] });
      showToast("مُنحت الصلاحية", "success");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر المنح"), "error"),
  });

  const doRevoke = useMutation({
    mutationFn: (userId: string) => revokeAdmin(userId),
    onSuccess: () => {
      setPendingRemove(null);
      void client.invalidateQueries({ queryKey: ["admin-accounts"] });
      showToast("سُحبت الصلاحية");
    },
    onError: (e) => {
      setPendingRemove(null);
      showToast(toArabicMessage(e, "تعذّر السحب"), "error");
    },
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="الحسابات الإدارية" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {myRole ? (
          <View style={styles.myRole}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text style={styles.myRoleText}>درجتك: {ROLE_LABEL[myRole]}</Text>
          </View>
        ) : null}

        {canManage ? (
          <>
            <Text style={styles.sectionLabel}>منح صلاحية</Text>
            <View style={styles.card}>
              <FormField
                label="ابحث عن العضو"
                value={search}
                onChangeText={setSearch}
                placeholder="البريد أو الرقم أو الاسم"
                autoCapitalize="none"
              />
              <PrimaryButton
                label="بحث"
                onPress={() => doSearch.mutate()}
                disabled={search.trim().length < 3}
                loading={doSearch.isPending}
              />

              {results?.length === 0 ? (
                <Text style={styles.none}>لا يوجد عضو مطابق. تأكّد أنه أنشأ حسابه في التطبيق.</Text>
              ) : null}

              {(results ?? []).map((member) => (
                <Pressable
                  key={member.userId}
                  accessibilityRole="button"
                  onPress={() => setPicked(member)}
                  style={styles.result}
                >
                  <View style={styles.resultText}>
                    <Text style={styles.resultName}>{member.name}</Text>
                    <Text style={styles.resultMeta}>
                      {maskPhone(member.phone)}
                      {member.role ? ` · ${ROLE_LABEL[member.role]}` : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>من يملك صلاحية الآن</Text>
        <QueryState
          isLoading={listQuery.isLoading}
          error={listQuery.error}
          onRetry={() => void listQuery.refetch()}
        >
          {(listQuery.data ?? []).length > 0 ? (
            (listQuery.data ?? []).map((admin) => {
              const role = (admin.role ?? "admin") as AdminRole;
              const removable =
                canManage && role !== "owner" && admin.id !== myId && (canGrantAdmin || role === "editor");
              return (
                <View key={admin.id} style={styles.row}>
                  <View style={styles.resultText}>
                    <Text style={styles.resultName}>{admin.name}</Text>
                    <Text style={styles.resultMeta}>
                      {maskPhone(admin.phone)} · {ROLE_LABEL[role]}
                    </Text>
                  </View>
                  {removable ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`سحب صلاحية ${admin.name}`}
                      onPress={() => setPendingRemove({ id: admin.id, name: admin.name })}
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle-outline" size={21} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          ) : (
            <EmptyState icon="shield-outline" title="لا توجد حسابات إدارية" />
          )}
        </QueryState>

        {!canManage ? (
          <Text style={styles.none}>
            درجتك لا تمنح صلاحيات. المالك أو الإداري وحدهما يفعلان ذلك.
          </Text>
        ) : null}
      </ScrollView>

      {/* اختيار الدرجة */}
      <BottomSheet visible={Boolean(picked)} onClose={() => setPicked(null)}>
        <Text style={styles.sheetTitle}>{picked?.name}</Text>
        <Text style={styles.sheetBody}>اختر الدرجة التي تمنحها:</Text>

        {(canGrantAdmin ? (["admin", "editor"] as const) : (["editor"] as const)).map((role) => (
          <Pressable
            key={role}
            accessibilityRole="button"
            onPress={() => picked && doGrant.mutate({ userId: picked.userId, role })}
            style={styles.roleOption}
          >
            <View style={styles.resultText}>
              <Text style={styles.resultName}>{ROLE_LABEL[role]}</Text>
              <Text style={styles.resultMeta}>{ROLE_HINT[role]}</Text>
            </View>
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          </Pressable>
        ))}

        <SecondaryButton label="إلغاء" onPress={() => setPicked(null)} style={{ marginTop: spacing.md }} />
      </BottomSheet>

      {/* تأكيد السحب */}
      <BottomSheet visible={Boolean(pendingRemove)} onClose={() => setPendingRemove(null)}>
        <Text style={styles.sheetTitle}>سحب الصلاحية</Text>
        <Text style={styles.sheetBody}>
          لن يتمكّن «{pendingRemove?.name}» من فتح لوحة الإدارة بعد ذلك. يبقى حسابه في التطبيق كعضو.
        </Text>
        <PrimaryButton
          label="سحب الصلاحية"
          onPress={() => pendingRemove && doRevoke.mutate(pendingRemove.id)}
          loading={doRevoke.isPending}
          style={{ marginTop: spacing.md }}
        />
        <SecondaryButton
          label="إلغاء"
          onPress={() => setPendingRemove(null)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  myRole: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  myRoleText: { ...typography.body },
  sectionLabel: { ...typography.caption, marginTop: spacing.sm },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
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
  resultText: { flex: 1, gap: 2 },
  resultName: { ...typography.body },
  resultMeta: { ...typography.caption, fontSize: 12 },
  none: { ...typography.caption, lineHeight: 22 },
  sheetTitle: { ...typography.h3, marginBottom: spacing.xs },
  sheetBody: { ...typography.caption, lineHeight: 22, marginBottom: spacing.sm },
}));
