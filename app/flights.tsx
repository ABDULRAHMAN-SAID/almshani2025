import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { ImageZoom } from "@/components/ImageZoom";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { fetchFlightSchedule } from "@/services/flightService";
import { formatArabicDate } from "@/utils/date";

/**
 * جدول رحلات الطائرة كما عُلِّق على اللوحة.
 *
 * صورةٌ لا جدولٌ أُعيدت كتابته: الورقة تصدر من سلاح الجو بستّة أيام وخمس
 * محطّات وأوقاتها، ونسخُها بالأيدي كل مرّة خطأٌ ينتظر أن يقع — ومن يقرأ رقمًا
 * أُخطئ في نقله يقف في المطار لرحلةٍ لا تُقلع.
 */
export default function FlightsScreen() {
  const [zoom, setZoom] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["flight-schedule"],
    queryFn: fetchFlightSchedule,
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="جدول الرحلات" />
      <QueryState isLoading={isLoading} error={error} onRetry={() => void refetch()}>
        {data && data.images.length > 0 ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.head}>
              <Text style={styles.title}>{data.title || "جدول رحلات الطيران"}</Text>
              <Text style={styles.meta}>نُشر {formatArabicDate(data.publishedAt)}</Text>
            </View>

            <View style={styles.tip}>
              <Ionicons name="search-outline" size={16} color={colors.primary} />
              <Text style={styles.tipText}>المس الصورة لتكبيرها وقراءة الأوقات</Text>
            </View>

            {data.images.map((image) => (
              <Pressable
                key={image}
                accessibilityRole="button"
                accessibilityLabel="تكبير الجدول"
                onPress={() => setZoom(image)}
              >
                <Image source={{ uri: image }} style={styles.sheet} resizeMode="contain" />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            icon="airplane-outline"
            title="لا يوجد جدول منشور"
            subtitle="حين تُعلَّق ورقة الجدول الجديدة سترفعها الإدارة هنا."
          />
        )}
      </QueryState>

      <ImageZoom uri={zoom} onClose={() => setZoom(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  head: { gap: 2 },
  title: { ...typography.h3 },
  meta: { ...typography.caption, fontSize: 11 },
  tip: {
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
  tipText: { ...typography.caption },
  // عالية: الورقة عريضة، وتصغيرها إلى ارتفاع بطاقة يجعل أرقامها نقاطًا.
  sheet: {
    width: "100%",
    height: 320,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
