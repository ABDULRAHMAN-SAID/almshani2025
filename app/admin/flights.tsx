import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/BottomSheet";
import { ImageField } from "@/components/ImageField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import {
  deleteFlightSchedule,
  fetchFlightSchedule,
  publishFlightSchedule,
} from "@/services/flightService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

/** ثلاث خانات صور: الورقة قد تكون وجهين، وقد تُصوَّر نصفين لتُقرأ. */
const SLOTS = [0, 1, 2];

/**
 * نشر جدول الرحلات: عنوانٌ وصور، كقائمة النادي.
 *
 * ولا خانات أوقات ولا محطّات: الجدول ورقة تصدر من سلاح الجو، ونسخُها بالأيدي
 * في ثلاثين خانة كل أسبوع عملٌ لا يُعاد، وخطأُ رقمٍ فيه يوقف رجلًا في المطار.
 */
export default function AdminFlightsScreen() {
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<string[]>(["", "", ""]);
  const [askDelete, setAskDelete] = useState(false);

  const current = useQuery({ queryKey: ["flight-schedule"], queryFn: fetchFlightSchedule });

  useEffect(() => {
    const published = current.data?.images ?? [];
    setTitle(current.data?.title ?? "");
    setImages([published[0] ?? "", published[1] ?? "", published[2] ?? ""]);
  }, [current.data]);

  const publish = useMutation({
    mutationFn: () => publishFlightSchedule({ title, images }),
    onSuccess: () => {
      void client.invalidateQueries();
      showToast("نُشر جدول الرحلات", "success");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر نشر الجدول"), "error"),
  });

  const remove = useMutation({
    mutationFn: () => deleteFlightSchedule(),
    onSuccess: () => {
      void client.invalidateQueries();
      setTitle("");
      setImages(["", "", ""]);
      setAskDelete(false);
      showToast("حُذف جدول الرحلات", "success");
    },
    onError: (e) => {
      setAskDelete(false);
      showToast(toArabicMessage(e, "تعذّر حذف الجدول"), "error");
    },
  });

  const uploaded = images.filter((url) => url.trim().length > 0).length;
  const published = (current.data?.images.length ?? 0) > 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="جدول الرحلات" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>
          صوّر الورقة المعلّقة وارفعها كما هي. والنشر يحلّ محلّ الجدول المنشور ولا يضيف
          جدولًا ثانيًا، فلا يقرأ أحد ورقةً أُبطلت.
        </Text>

        <Text style={styles.label}>العنوان</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="جدول رحلات الطيران من السيب والمصنعة — ساري من ١٩ سبتمبر"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textAlign="right"
          multiline
        />

        {SLOTS.map((slot) => (
          <ImageField
            key={slot}
            label={`الصورة ${slot + 1}`}
            value={images[slot] ?? ""}
            onChange={(url) =>
              setImages((prev) => prev.map((old, index) => (index === slot ? url : old)))
            }
            folder="flights"
          />
        ))}

        <PrimaryButton
          label="انشر جدول الرحلات"
          onPress={() => publish.mutate()}
          disabled={uploaded === 0}
          loading={publish.isPending}
          style={{ marginTop: spacing.lg }}
        />

        {published ? (
          <SecondaryButton label="احذف الجدول المنشور" onPress={() => setAskDelete(true)} />
        ) : null}
      </ScrollView>

      <BottomSheet visible={askDelete} onClose={() => setAskDelete(false)}>
        <Text style={styles.sheetTitle}>حذف الجدول</Text>
        <Text style={styles.sheetBody}>
          سيُحذف جدول الرحلات بصوره، ولن يراه أحد بعدها.
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
  hint: { ...typography.caption, lineHeight: 20 },
  label: { ...typography.caption, marginTop: spacing.sm },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.bodyMuted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
    minHeight: 64,
  },
});
