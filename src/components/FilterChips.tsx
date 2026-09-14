import { useState } from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "@/constants";

export interface FilterChipItem {
  key: string;
  label: string;
}

interface FilterChipsProps {
  items: FilterChipItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

/**
 * شريط فلاتر أفقي موحّد — يُستخدم في التقويم والمسابقات والمحاضرات والتوعية.
 *
 * الشريط يزيد عن عرض الشاشة غالبًا، وبلا إشارة تبدو آخر شريحة مقصوصةً كأنها
 * عطب في الواجهة لا محتوى يُمرَّر. فنضع تلاشيًا عند الحافة التي ما زال خلفها
 * شيء، ويختفي عند بلوغ النهاية — فيُقرأ القصّ دعوةً للتمرير.
 */
export function FilterChips({ items, activeKey, onChange }: FilterChipsProps) {
  const [overflowStart, setOverflowStart] = useState(false);
  const [overflowEnd, setOverflowEnd] = useState(false);
  const [viewport, setViewport] = useState(0);

  const measure = (contentWidth: number, viewportWidth: number, offset: number) => {
    const max = contentWidth - viewportWidth;
    // في RTL يبدأ التمرير من الصفر عند الحافة الأولى كما في LTR على الويب
    // وأندرويد الحديث؛ نعتمد على المقدار المطلق حتى لا يختلف السلوك بينهما.
    const travelled = Math.abs(offset);
    setOverflowStart(travelled > 4);
    setOverflowEnd(max > 4 && travelled < max - 4);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    measure(contentSize.width, layoutMeasurement.width, contentOffset.x);
  };

  const onContentSizeChange = (width: number) => {
    setOverflowEnd(width > viewport + 4);
  };

  const onLayout = (event: LayoutChangeEvent) => setViewport(event.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        scrollEventThrottle={32}
      >
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(item.key)}
              style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {overflowEnd ? <Fade side="end" /> : null}
      {overflowStart ? <Fade side="start" /> : null}
    </View>
  );
}

/** تلاشٍ إلى لون الخلفية — يوحي بامتداد المحتوى خلف الحافة. */
function Fade({ side }: { side: "start" | "end" }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[colors.background, "rgba(242,245,249,0)"]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[styles.fade, side === "start" ? styles.fadeStart : styles.fadeEnd]}
    />
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingEnd: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.85 },
  label: { fontFamily: "Tajawal_500Medium", fontSize: 12.5, color: colors.textSecondary },
  labelActive: { color: colors.textOnPrimary },
  fade: { position: "absolute", top: 0, bottom: 0, width: 28 },
  fadeStart: { start: 0 },
  fadeEnd: { end: 0, transform: [{ scaleX: -1 }] },
});
