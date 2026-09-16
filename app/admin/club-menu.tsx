import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageField } from "@/components/ImageField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { CATEGORY_META } from "@/constants/categories";
import { fetchClub, fetchClubMenu, publishClubMenu, updateClub, weekStartOf } from "@/services/menuService";
import { showToast } from "@/store/toastStore";
import { CLUB_MEALS } from "@/types/models";
import type { ClubKey } from "@/types/models";
import { formatArabicDate } from "@/utils/date";
import { toArabicMessage } from "@/utils/errors";

const CLUBS: ClubKey[] = ["OfficersClub", "SeniorNcoClub"];

/** الأسبوع يبدأ الأحد، والعطلة الجمعة والسبت — فالأيام بهذا الترتيب. */
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/**
 * نشر قائمة طعام الأسبوع لنادٍ.
 *
 * والحقول تُملأ بقائمة الأسبوع المنشورة إن وُجدت، فالنشر الثاني تصحيحٌ لا
 * بداية من فراغ: من نسي طبق الخميس يفتح الشاشة فيجد الأربعة الأولى مكتوبة.
 */
export default function AdminClubMenuScreen() {
  const client = useQueryClient();
  const [club, setClub] = useState<ClubKey>("OfficersClub");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [meals, setMeals] = useState<Record<string, string>>({});
  const [clubTitle, setClubTitle] = useState("");
  const [clubSubtitle, setClubSubtitle] = useState("");

  const weekStart = weekStartOf();

  const current = useQuery({ queryKey: ["club-menu", club], queryFn: () => fetchClubMenu(club) });
  const profile = useQuery({ queryKey: ["club", club], queryFn: () => fetchClub(club) });

  useEffect(() => {
    setClubTitle(profile.data?.title ?? "");
    setClubSubtitle(profile.data?.subtitle ?? "");
  }, [profile.data]);

  const saveProfile = useMutation({
    mutationFn: () =>
      updateClub(club, { title: clubTitle, subtitle: clubSubtitle }),
    onSuccess: () => {
      void client.invalidateQueries();
      showToast("حُفظت بيانات النادي", "success");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر الحفظ"), "error"),
  });

  // تبديل النادي يعيد تعبئة الحقول بقائمته هو — لا بقائمة النادي السابق.
  useEffect(() => {
    const menu = current.data;
    if (menu && menu.weekStart === weekStart) {
      setPhotos(Object.fromEntries(menu.images.map((photo) => [photo.meal, photo.image])));
      setNote(menu.note);
      setMeals(Object.fromEntries(menu.days.map((entry) => [entry.day, entry.meal])));
    } else {
      setPhotos({});
      setNote("");
      setMeals({});
    }
  }, [current.data, weekStart]);

  const filled = Object.values(meals).filter((meal) => meal.trim().length > 0).length;
  const uploaded = Object.values(photos).filter((url) => url.trim().length > 0).length;
  const canPublish = filled > 0 || uploaded > 0;

  const publish = useMutation({
    mutationFn: () =>
      publishClubMenu({
        club,
        weekStart,
        images: CLUB_MEALS.map((meal) => ({ meal, image: photos[meal] ?? "" })),
        note,
        days: DAYS.map((day) => ({ day, meal: meals[day] ?? "" })),
      }),
    onSuccess: () => {
      void client.invalidateQueries();
      showToast("نُشرت قائمة الأسبوع", "success");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر نشر القائمة"), "error"),
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="النادي وقائمته" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>النادي</Text>
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

        {/*
          بيانات النادي نفسه — اسمه ووصفه وصورته.
          كانت مكتوبة في الشفرة، فلم يكن لمن يعرف النادي سبيلٌ إلى تصحيحها.
        */}
        <Text style={styles.label}>اسم النادي</Text>
        <TextInput
          value={clubTitle}
          onChangeText={setClubTitle}
          placeholder="نادي الضباط"
          placeholderTextColor={colors.textMuted}
          style={styles.dayInput}
          textAlign="right"
        />

        <Text style={styles.label}>وصف مختصر</Text>
        <TextInput
          value={clubSubtitle}
          onChangeText={setClubSubtitle}
          placeholder="مطعم النادي ومرافقه"
          placeholderTextColor={colors.textMuted}
          style={styles.dayInput}
          textAlign="right"
        />

        <PrimaryButton
          label="احفظ بيانات النادي"
          onPress={() => saveProfile.mutate()}
          disabled={clubTitle.trim().length < 2}
          loading={saveProfile.isPending}
        />

        <View style={styles.divider} />

        <View style={styles.weekCard}>
          <Text style={styles.weekLabel}>أسبوع {formatArabicDate(weekStart)}</Text>
          <Text style={styles.weekHint}>
            القائمة تُنشر لأسبوعٍ واحد. ونشرها مرّة ثانية يصحّح المنشورة ولا يضيف قائمة جديدة.
          </Text>
        </View>

        {/*
          ثلاث صور بأنواعها: الورقة المعلّقة على باب النادي ثلاث أوراق.
          وكلّها اختيارية — من له قائمة غداء وحدها يرفعها وحدها.
        */}
        <Text style={styles.label}>صور القوائم (اختياري — حتى ثلاث)</Text>
        {CLUB_MEALS.map((meal) => (
          <ImageField
            key={meal}
            label={`قائمة ال${meal}`}
            hint="صوّر الورقة المعلّقة — أسرع من كتابتها، وتظهر كما هي"
            value={photos[meal] ?? ""}
            onChange={(url) => setPhotos((prev) => ({ ...prev, [meal]: url }))}
            folder="menus"
          />
        ))}

        <Text style={styles.label}>الأيام (اترك اليوم فارغًا إن لم يكن فيه شيء)</Text>
        {DAYS.map((day) => (
          <View key={day} style={styles.dayRow}>
            <Text style={styles.dayName}>{day}</Text>
            <TextInput
              value={meals[day] ?? ""}
              onChangeText={(text) => setMeals((prev) => ({ ...prev, [day]: text }))}
              placeholder="مثال: مندي لحم · سلطة · تمر"
              placeholderTextColor={colors.textMuted}
              style={styles.dayInput}
              textAlign="right"
            />
          </View>
        ))}

        <Text style={styles.label}>ملاحظة (اختياري)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="مثال: الغداء من ١٢:٣٠ إلى ٢:٣٠"
          placeholderTextColor={colors.textMuted}
          style={styles.dayInput}
          textAlign="right"
        />

        <PrimaryButton
          label="انشر قائمة الأسبوع"
          onPress={() => publish.mutate()}
          disabled={!canPublish}
          loading={publish.isPending}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
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
  weekCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  weekLabel: { ...typography.body, fontFamily: "Tajawal_700Bold" },
  weekHint: { ...typography.caption, fontSize: 11, lineHeight: 18 },
  dayRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dayName: { ...typography.caption, width: 58, color: colors.textPrimary },
  dayInput: {
    flex: 1,
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
