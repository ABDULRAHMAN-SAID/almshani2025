import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import {
  fetchFriendRequests,
  fetchFriends,
  removeFriend,
  respondToFriendRequest,
  searchMembers,
  sendFriendRequest,
  startDirectChat,
} from "@/services/chatService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

/**
 * الأصدقاء: الطلبات الواردة، ثم أصدقائي، ثم البحث عن غيرهم.
 *
 * والبحث لا يعرض رقم أحد ولا يعمل بأقل من ثلاثة أحرف: الغرض أن تجد من
 * تعرف اسمه، لا أن يُستخرج دليل القاعدة بحروف الهجاء.
 */
export default function FriendsScreen() {
  const client = useQueryClient();
  const [query, setQuery] = useState("");

  const friends = useQuery({ queryKey: ["friends"], queryFn: fetchFriends });
  const requests = useQuery({ queryKey: ["friend-requests"], queryFn: fetchFriendRequests });
  const results = useQuery({
    queryKey: ["member-search", query.trim()],
    enabled: query.trim().length >= 3,
    queryFn: () => searchMembers(query),
  });

  const refresh = () => void client.invalidateQueries();

  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      respondToFriendRequest(id, accept),
    onSuccess: (_data, variables) => {
      refresh();
      showToast(variables.accept ? "أصبحتما صديقين" : "رُفض الطلب", "success");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر الردّ"), "error"),
  });

  const add = useMutation({
    mutationFn: (userId: string) => sendFriendRequest(userId),
    onSuccess: () => {
      refresh();
      showToast("أُرسل طلب الصداقة", "success");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر إرسال الطلب"), "error"),
  });

  const drop = useMutation({
    mutationFn: (userId: string) => removeFriend(userId),
    onSuccess: () => {
      refresh();
      showToast("حُذف من أصدقائك", "success");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر الحذف"), "error"),
  });

  const open = useMutation({
    mutationFn: (userId: string) => startDirectChat(userId),
    onSuccess: (id, userId) => {
      const friend = (friends.data ?? []).find((person) => person.id === userId);
      router.push({ pathname: "/chat/[id]", params: { id, title: friend?.fullName ?? "محادثة" } });
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر فتح المحادثة"), "error"),
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="الأصدقاء" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {(requests.data ?? []).length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>طلبات واردة</Text>
            {(requests.data ?? []).map((request) => (
              <View key={request.id} style={styles.row}>
                <View style={styles.avatar}>
                  <Ionicons name="person-add" size={17} color={colors.accent} />
                </View>
                <Text style={styles.name} numberOfLines={1}>
                  {request.fullName}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`قبول ${request.fullName}`}
                  onPress={() => respond.mutate({ id: request.id, accept: true })}
                  style={[styles.pill, styles.pillAccept]}
                >
                  <Text style={styles.pillAcceptText}>قبول</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`رفض ${request.fullName}`}
                  onPress={() => respond.mutate({ id: request.id, accept: false })}
                  style={styles.pill}
                >
                  <Text style={styles.pillText}>رفض</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.sectionLabel}>أصدقائي ({(friends.data ?? []).length})</Text>
        {(friends.data ?? []).length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="لا أصدقاء بعد"
            subtitle="ابحث عن اسم زميلك أدناه وأرسل له طلبًا."
          />
        ) : (
          (friends.data ?? []).map((friend) => (
            <View key={friend.id} style={styles.row}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={17} color={colors.primary} />
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {friend.fullName}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`محادثة ${friend.fullName}`}
                onPress={() => open.mutate(friend.id)}
                style={[styles.pill, styles.pillAccept]}
              >
                <Text style={styles.pillAcceptText}>محادثة</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`حذف ${friend.fullName}`}
                onPress={() => drop.mutate(friend.id)}
                style={styles.iconButton}
              >
                <Ionicons name="person-remove-outline" size={17} color={colors.danger} />
              </Pressable>
            </View>
          ))
        )}

        <Text style={styles.sectionLabel}>ابحث عن زميل</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="اكتب ثلاثة أحرف من اسمه"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textAlign="right"
        />
        {query.trim().length > 0 && query.trim().length < 3 ? (
          <Text style={styles.hint}>اكتب ثلاثة أحرف على الأقل.</Text>
        ) : null}
        {(results.data ?? []).map((person) => (
          <View key={person.id} style={styles.row}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={17} color={colors.textMuted} />
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {person.fullName}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`إضافة ${person.fullName}`}
              onPress={() => add.mutate(person.id)}
              style={[styles.pill, styles.pillAccept]}
            >
              <Text style={styles.pillAcceptText}>إضافة</Text>
            </Pressable>
          </View>
        ))}
        {query.trim().length >= 3 && (results.data ?? []).length === 0 && !results.isLoading ? (
          <Text style={styles.hint}>لا أحد بهذا الاسم.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  sectionLabel: { ...typography.body, fontFamily: "Tajawal_700Bold", marginTop: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { ...typography.body, fontSize: 14, flex: 1 },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: { ...typography.caption, fontSize: 11 },
  pillAccept: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillAcceptText: { ...typography.caption, fontSize: 11, color: colors.textOnPrimary },
  iconButton: { padding: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
    color: colors.textPrimary,
  },
  hint: { ...typography.caption, fontSize: 11 },
});
