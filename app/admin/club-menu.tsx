import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/BottomSheet";
import { ImageField } from "@/components/ImageField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { CATEGORY_META } from "@/constants/categories";
import {
  deleteClubMenu,
  fetchClub,
  fetchClubMenu,
  publishClubMenu,
  updateClub,
  weekStartOf,
} from "@/services/menuService";
import { showToast } from "@/store/toastStore";
import type { ClubKey } from "@/types/models";
import { formatArabicDate } from "@/utils/date";
import { toArabicMessage } from "@/utils/errors";

const CLUBS: ClubKey[] = ["OfficersClub", "SeniorNcoClub"];

/** ثلاث خانات صور، لا أكثر. */
const SLOTS = [0, 1, 2];

/**
 * النادي وقائمته: عنوانٌ وثلاث صور.
 *
 * وكان هنا وصفٌ وملاحظةٌ وسبع خانات تُكتب فيها وجبة كل يوم. والقائمة ورقة
 * معلّقة على الباب تُصوَّر في ثانية، وإعادةُ كتابتها كل أسبوع عملٌ لا يُعاد
 * مرّتين — فتبقى الخانات فارغة ويبقى الناس بلا قائمة. فحُذف كل ما يُكتب إلا
 * الاسم، وبقي ما يُرفع.
 */
export default function AdminClubMenuScreen() {
  const client = useQueryClient();
  const [club, setClub] = useState<ClubKey>("OfficersClub");
  const [images, setImages] = useState<string[]>(["", "", ""]);
  const [clubTitle, setClubTitle] = useState("");
  const [askDelete, setAskDelete] = useState(false);

  const weekStart = weekStartOf();

  const current = useQuery({ queryKey: ["club-menu", club], queryFn: () => fetchClubMenu(club) });
  const profile = useQuery({ queryKey: ["club", club], queryFn: () => fetchClub(club) });

  useEffect(() => {
    setClubTitle(profile.data?.title ?? "");
  }, [profile.data]);

  const saveTitle = useMutation({
    mutationFn: () => updateClub(club, { title: clubTitle }),
    onSuccess: () => {
      void client.invalidateQueries();
      showToast("حُفظ اسم النادي", "success");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر الحفظ"), "error"),
  });

  // تبديل النادي يعيد تعبئة الصور بقائمته هو — لا بقائمة النادي السابق.
  useEffect(() => {
    const menu = current.data;
    const published = menu && menu.weekStart === weekStart ? menu.images : [];
    setImages([published[0] ?? "", published[1] ?? "", published[2] ?? ""]);
  }, [current.data, weekStart]);

  const publish = useMutation({
    mutationFn: () => publishClubMenu({ club, weekStart, images }),
    onSuccess: () => {
      void client.invalidateQueries();
      showToast("نُشرت قائمة الأسبوع", "success");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر نشر القائمة"), "error"),
  });

  const remove = useMutation({
    mutationFn: () => deleteClubMenu(club, weekStart),
    onSuccess: () => {
      void client.invalidateQueries();
      setImages(["", "", ""]);
      setAskDelete(false);
      showToast("حُذفت قائمة هذا الأسبوع", "success");
    },
    onError: (e) => {
      setAskDelete(false);
      showToast(toArabicMessage(e, "تعذّر حذف القائمة"), "error");
    },
  });

  const uploaded = images.filter((url) => url.trim().length > 0).length;
  const published = current.data?.weekStart === weekStart && current.data.images.length > 0;
  // اسم النادي المختار — يُكتب على الأزرار نفسها لا فوق الشاشة وحدها: من
  // نشر في النادي الخطأ لم يكن الاسم أمام إصبعه لحظة الضغط.
  const clubName = CATEGORY_META[club].label;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="النادي وقائمته" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.chipWrap}>
          {CLUBS.map((key) => {
            const active = key === club;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => setClub(key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {CATEGORY_META[key].label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>العنوان</Text>
        <TextInput
          value={clubTitle}
          onChangeText={setClubTitle}
          placeholder="نادي الضباط"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textAlign="right"
        />
        <PrimaryButton
          label="احفظ عنوان هذا النادي"
          onPress={() => saveTitle.mutate()}
          disabled={clubTitle.trim().length < 2}
          loading={saveTitle.isPending}
        />

        <View style={styles.divider} />

        <Text style={styles.week}>قائمة أسبوع {formatArabicDate(weekStart)}</Text>
        <Text style={styles.weekHint}>
          نشرها مرّة ثانية يصحّح المنشورة ولا يضيف قائمة جديدة.
        </Text>

        {SLOTS.map((slot) => (
          <ImageField
            key={slot}
            label={`الصورة ${slot + 1}`}
            value={images[slot] ?? ""}
            onChange={(url) =>
              setImages((prev) => prev.map((old, index) => (index === slot ? url : old)))
            }
            folder="menus"
          />
        ))}

        <PrimaryButton
          label={`انشر قائمة ${clubName}`}
          onPress={() => publish.mutate()}
          disabled={uploaded === 0}
          loading={publish.isPending}
          style={{ marginTop: spacing.lg }}
        />

        {published ? (
          <SecondaryButton label="احذف قائمة هذا الأسبوع" onPress={() => setAskDelete(true)} />
        ) : null}
      </ScrollView>

      <BottomSheet visible={askDelete} onClose={() => setAskDelete(false)}>
        <Text style={styles.sheetTitle}>حذف القائمة</Text>
        <Text style={styles.sheetBody}>
          ستُحذف قائمة هذا الأسبوع من {clubName} بصورها، ولن يراها أحد بعدها.
        </Text>
        <PrimaryButton
          label="حذف نهائيًا"
          onPress={() => remove.mutate()}
          loading={remove.isPending}
          style={{ marginTop: spacing.lg, backgroundColor: colors.danger }}
        />
        <SecondaryButton
          label="تراجع"
          onPress={() => setAskDelete(false)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  label: { ...typography.caption, marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
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
  week: { ...typography.body, fontFamily: "Tajawal_700Bold" },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.bodyMuted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
  weekHint: { ...typography.caption, fontSize: 11, lineHeight: 18, marginTop: -spacing.sm },
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
});
