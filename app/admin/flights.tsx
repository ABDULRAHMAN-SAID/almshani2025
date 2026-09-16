import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/BottomSheet";
import { ImageField } from "@/components/ImageField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import {
  deleteFlightRoute,
  deleteFlightSchedule,
  fetchFlightRoutes,
  fetchFlightSchedule,
  publishFlightSchedule,
  saveFlightRoute,
} from "@/services/flightService";
import { FLIGHT_DAYS } from "@/constants/flights";
import type { Flight } from "@/constants/flights";
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
  const [editing, setEditing] = useState<Flight | null>(null);
  const [askRouteDelete, setAskRouteDelete] = useState<Flight | null>(null);

  const routes = useQuery({ queryKey: ["flight-routes"], queryFn: fetchFlightRoutes });

  const saveRoute = useMutation({
    mutationFn: (flight: Flight) =>
      saveFlightRoute({
        id: flight.id,
        station: flight.station,
        day: flight.day,
        aircraft: flight.aircraft,
        stops: flight.stops,
        note: flight.note,
      }),
    onSuccess: () => {
      void client.invalidateQueries();
      setEditing(null);
      showToast("حُفظت الرحلة", "success");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر حفظ الرحلة"), "error"),
  });

  const removeRoute = useMutation({
    mutationFn: (id: string) => deleteFlightRoute(id),
    onSuccess: () => {
      void client.invalidateQueries();
      setAskRouteDelete(null);
      showToast("حُذفت الرحلة", "success");
    },
    onError: (e) => {
      setAskRouteDelete(null);
      showToast(toArabicMessage(e, "تعذّر حذف الرحلة"), "error");
    },
  });

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
        {/* الرحلات نفسها: تُعدّل وتُحذف وتُضاف من هنا، لا من شفرة التطبيق. */}
        <View style={styles.rowBetween}>
          <Text style={styles.blockTitle}>الرحلات</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setEditing({
                station: "",
                day: FLIGHT_DAYS[0],
                aircraft: "",
                stops: [
                  { place: "", depart: "" },
                  { place: "", arrive: "", depart: "" },
                  { place: "", arrive: "" },
                ],
              })
            }
            style={styles.addButton}
          >
            <Ionicons name="add" size={16} color={colors.textOnPrimary} />
            <Text style={styles.addText}>رحلة جديدة</Text>
          </Pressable>
        </View>

        {(routes.data ?? []).map((flight) => (
          <View key={flight.id ?? `${flight.station}-${flight.day}`} style={styles.routeRow}>
            <View style={styles.routeText}>
              <Text style={styles.routeTitle}>
                {flight.station} {flight.day ? `· ${flight.day}` : "· بلا يوم"}
              </Text>
              <Text style={styles.routeMeta} numberOfLines={1}>
                {flight.note
                  ? flight.note
                  : flight.stops
                      .map((stop) => `${stop.place} ${stop.depart ?? stop.arrive ?? ""}`)
                      .join(" ← ")}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`تعديل ${flight.station}`}
              onPress={() => setEditing(flight)}
              style={styles.iconButton}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`حذف ${flight.station}`}
              onPress={() => setAskRouteDelete(flight)}
              style={styles.iconButton}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>
        ))}

        {(routes.data ?? []).length === 0 ? (
          <Text style={styles.hint}>لا رحلات بعد — أضف واحدة.</Text>
        ) : null}

        <View style={styles.divider} />
        <Text style={styles.blockTitle}>الورقة الأصلية (اختياري)</Text>
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

      <BottomSheet visible={Boolean(askRouteDelete)} onClose={() => setAskRouteDelete(null)}>
        <Text style={styles.sheetTitle}>حذف الرحلة</Text>
        <Text style={styles.sheetBody}>
          ستُحذف رحلة {askRouteDelete?.station} {askRouteDelete?.day} من الجدول.
        </Text>
        <PrimaryButton
          label="حذف نهائيًا"
          onPress={() => askRouteDelete?.id && removeRoute.mutate(askRouteDelete.id)}
          loading={removeRoute.isPending}
          disabled={!askRouteDelete?.id}
          style={{ marginTop: spacing.lg, backgroundColor: colors.danger }}
        />
        {askRouteDelete && !askRouteDelete.id ? (
          <Text style={styles.sheetNote}>
            هذه رحلة من الجدول المكتوب داخل التطبيق — نفّذ تحديث قاعدة البيانات لتصير قابلة للتعديل.
          </Text>
        ) : null}
        <SecondaryButton
          label="تراجع"
          onPress={() => setAskRouteDelete(null)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>

      <RouteEditor
        flight={editing}
        saving={saveRoute.isPending}
        onClose={() => setEditing(null)}
        onSave={(flight) => saveRoute.mutate(flight)}
      />

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

/**
 * محرّر رحلة واحدة.
 *
 * ثلاث محطّات لأن كل رحلة في الورقة كذلك: تُقلع من مطار، وتحطّ في الوجهة
 * وتُقلع منها، وتعود. ومحطّة بلا اسم تُحذف عند الحفظ، فمن أراد ملاحظةً بلا
 * جدول ثابت يترك المحطّات فارغة ويكتب النصّ.
 */
function RouteEditor({
  flight,
  saving,
  onClose,
  onSave,
}: {
  flight: Flight | null;
  saving: boolean;
  onClose: () => void;
  onSave: (flight: Flight) => void;
}) {
  const [draft, setDraft] = useState<Flight | null>(flight);
  useEffect(() => setDraft(flight), [flight]);
  if (!draft) return null;

  const setStop = (index: number, patch: Partial<Flight["stops"][number]>) =>
    setDraft((prev) =>
      prev
        ? { ...prev, stops: prev.stops.map((stop, i) => (i === index ? { ...stop, ...patch } : stop)) }
        : prev
    );

  const canSave = draft.station.trim().length > 1;

  return (
    <BottomSheet visible onClose={onClose}>
      <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.sheetTitle}>{flight?.id ? "تعديل رحلة" : "رحلة جديدة"}</Text>

        <Text style={styles.editorLabel}>الوجهة</Text>
        <TextInput
          value={draft.station}
          onChangeText={(station) => setDraft({ ...draft, station })}
          placeholder="صلالة"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textAlign="right"
        />

        <Text style={styles.editorLabel}>اليوم</Text>
        <View style={styles.chips}>
          {([...FLIGHT_DAYS, ""] as Flight["day"][]).map((day) => {
            const active = draft.day === day;
            return (
              <Pressable
                key={day || "none"}
                accessibilityRole="button"
                onPress={() => setDraft({ ...draft, day })}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {day || "بلا يوم"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {draft.day ? (
          <>
            <Text style={styles.editorLabel}>الطائرة</Text>
            <TextInput
              value={draft.aircraft}
              onChangeText={(aircraft) => setDraft({ ...draft, aircraft })}
              placeholder="A BUS · 134"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              textAlign="right"
            />

            {draft.stops.map((stop, index) => (
              <View key={index} style={{ gap: spacing.xs }}>
                <Text style={styles.editorLabel}>
                  {index === 0 ? "المغادرة من" : index === 1 ? "الوجهة" : "العودة إلى"}
                </Text>
                <View style={styles.stopRow}>
                  <TextInput
                    value={stop.place}
                    onChangeText={(place) => setStop(index, { place })}
                    placeholder="المكان"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, styles.stopInput]}
                    textAlign="right"
                  />
                  {index > 0 ? (
                    <TextInput
                      value={stop.arrive ?? ""}
                      onChangeText={(arrive) => setStop(index, { arrive })}
                      placeholder="وصول"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, styles.stopInput]}
                      textAlign="center"
                    />
                  ) : null}
                  {index < 2 ? (
                    <TextInput
                      value={stop.depart ?? ""}
                      onChangeText={(depart) => setStop(index, { depart })}
                      placeholder="إقلاع"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, styles.stopInput]}
                      textAlign="center"
                    />
                  ) : null}
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.editorLabel}>النصّ</Text>
            <TextInput
              value={draft.note ?? ""}
              onChangeText={(note) => setDraft({ ...draft, note })}
              placeholder="رحلة واحدة (CASA) كل أسبوعين"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              textAlign="right"
            />
          </>
        )}

        <PrimaryButton
          label="احفظ الرحلة"
          onPress={() => onSave(draft)}
          disabled={!canSave}
          loading={saving}
          style={{ marginTop: spacing.lg }}
        />
        <SecondaryButton label="تراجع" onPress={onClose} style={{ marginTop: spacing.sm }} />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  hint: { ...typography.caption, lineHeight: 20 },
  label: { ...typography.caption, marginTop: spacing.sm },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetNote: { ...typography.caption, textAlign: "center", marginTop: spacing.sm, lineHeight: 20 },
  blockTitle: { ...typography.body, fontFamily: "Tajawal_700Bold" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  addText: { ...typography.caption, color: colors.textOnPrimary },
  routeRow: {
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
  routeText: { flex: 1, gap: 2 },
  routeTitle: { ...typography.body, fontSize: 14, fontFamily: "Tajawal_500Medium" },
  routeMeta: { ...typography.caption, fontSize: 11 },
  iconButton: { padding: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  editorLabel: { ...typography.caption },
  stopRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  stopInput: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, fontSize: 11, color: colors.textPrimary },
  chipTextActive: { color: colors.textOnPrimary },
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
