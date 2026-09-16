import { Pressable, Text, TextInput, View } from "react-native";
import { colors, radius, spacing, typography, themed } from "@/constants";

export interface ScheduleValue {
  startsAt?: string;
  endsAt?: string;
}

interface ScheduleFieldProps {
  value: ScheduleValue;
  onChange: (value: ScheduleValue) => void;
}

/** المدد المعروضة للاختفاء. صفر = لا يختفي. */
const DURATIONS: { hours: number; label: string }[] = [
  { hours: 0, label: "لا يختفي" },
  { hours: 24, label: "بعد يوم" },
  { hours: 72, label: "بعد ٣ أيام" },
  { hours: 168, label: "بعد أسبوع" },
  { hours: 720, label: "بعد شهر" },
];

const iso = (at: Date) => at.toISOString();

/** "الخميس 18 سبتمبر · 4:00 م" مختصرًا للعرض تحت الشرائح. */
function shortLabel(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];
  const hour = d.getHours();
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${hour12}:${minute} ${hour < 12 ? "ص" : "م"}`;
}

/**
 * وقت ظهور المنشور واختفائه.
 *
 * شرائح لا حقول تاريخ: الغالب أن يُراد «بعد أسبوع» لا يومٌ بعينه، وكتابة
 * تاريخ ووقت في أربع خانات على هاتف عملٌ يُترك فلا يُضبط وقتٌ أصلًا. ومن
 * أراد يومًا بعينه كتبه في الخانتين الظاهرتين عند اختيار «بتاريخ».
 */
export function ScheduleField({ value, onChange }: ScheduleFieldProps) {
  const now = new Date();
  const endsHours = (() => {
    if (!value.endsAt) return 0;
    const diff = new Date(value.endsAt).getTime() - now.getTime();
    const hours = Math.round(diff / 3_600_000);
    return DURATIONS.find((option) => option.hours === hours)?.hours ?? -1;
  })();

  const setEnds = (hours: number) =>
    onChange({
      ...value,
      endsAt: hours === 0 ? undefined : iso(new Date(now.getTime() + hours * 3_600_000)),
    });

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>الظهور</Text>
      <View style={styles.chips}>
        <Chip
          label="الآن"
          active={!value.startsAt}
          onPress={() => onChange({ ...value, startsAt: undefined })}
        />
        <Chip
          label="غدًا"
          active={Boolean(value.startsAt)}
          onPress={() =>
            onChange({ ...value, startsAt: iso(new Date(now.getTime() + 24 * 3_600_000)) })
          }
        />
      </View>
      {value.startsAt ? (
        <View style={styles.row}>
          <Text style={styles.hint}>يظهر {shortLabel(value.startsAt)}</Text>
          <TextInput
            value={value.startsAt.slice(0, 10)}
            onChangeText={(text) => {
              // تاريخٌ بعينه: يُقبل حين يكتمل، وما دونه يُترك كما هو.
              if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return;
              const at = new Date(`${text}T08:00:00`);
              if (!Number.isNaN(at.getTime())) onChange({ ...value, startsAt: iso(at) });
            }}
            placeholder="2026-09-20"
            placeholderTextColor={colors.textMuted}
            style={styles.dateInput}
            textAlign="center"
          />
        </View>
      ) : null}

      <Text style={styles.label}>الاختفاء</Text>
      <View style={styles.chips}>
        {DURATIONS.map((option) => (
          <Chip
            key={option.hours}
            label={option.label}
            active={endsHours === option.hours}
            onPress={() => setEnds(option.hours)}
          />
        ))}
      </View>
      {value.endsAt ? <Text style={styles.hint}>يختفي {shortLabel(value.endsAt)}</Text> : null}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = themed(() => ({
  wrap: { gap: spacing.sm },
  label: { ...typography.caption, marginTop: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
  hint: { ...typography.caption, fontSize: 11, flex: 1 },
  dateInput: {
    width: 130,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    fontFamily: "Tajawal_400Regular",
    fontSize: 13,
    color: colors.textPrimary,
    writingDirection: "ltr",
  },
}));
