import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { createGroupChat, fetchFriends } from "@/services/chatService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

/**
 * مجموعة جديدة: اسمها ومن يدخلها.
 *
 * ولا يُضاف إلا صديق — والخادم يرفض غيره ولو أُرسل معرّفه: مجموعةٌ يُدخَل
 * إليها من لا يعرفك تصير بابًا لمن شاء أن يكتب إلى من شاء.
 */
export default function NewGroupScreen() {
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const friends = useQuery({ queryKey: ["friends"], queryFn: fetchFriends });

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const create = useMutation({
    mutationFn: () => createGroupChat(title, picked),
    onSuccess: (id) => {
      void client.invalidateQueries();
      showToast("أُنشئت المجموعة", "success");
      router.replace({ pathname: "/chat/[id]", params: { id, title: title.trim() } });
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر إنشاء المجموعة"), "error"),
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="مجموعة جديدة" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>اسم المجموعة</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="مثال: فريق الرماية"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textAlign="right"
        />

        <Text style={styles.label}>الأعضاء ({picked.length})</Text>
        {(friends.data ?? []).length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="لا أصدقاء بعد"
            subtitle="أضف أصدقاء أوّلًا لتنشئ مجموعة."
          />
        ) : (
          (friends.data ?? []).map((friend) => {
            const on = picked.includes(friend.id);
            return (
              <Pressable
                key={friend.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggle(friend.id)}
                style={[styles.row, on && styles.rowOn]}
              >
                <Ionicons
                  name={on ? "checkbox" : "square-outline"}
                  size={20}
                  color={on ? colors.primary : colors.textMuted}
                />
                <Text style={styles.name}>{friend.fullName}</Text>
              </Pressable>
            );
          })
        )}

        <PrimaryButton
          label="أنشئ المجموعة"
          onPress={() => create.mutate()}
          disabled={title.trim().length < 2 || picked.length === 0}
          loading={create.isPending}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  label: { ...typography.caption, marginTop: spacing.sm },
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  rowOn: { borderColor: colors.primary },
  name: { ...typography.body, fontSize: 14, flex: 1 },
});
