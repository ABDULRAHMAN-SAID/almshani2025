import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tintBackground } from "@/constants/categories";
import { colors, radius, spacing, typography } from "@/constants";
import { useAnnouncements } from "@/hooks/useNotifications";
import { formatArabicDate } from "@/utils/date";

const TYPE_FILTERS = [
  { key: "all", label: "الكل" },
  { key: "تسجيل", label: "تسجيل" },
  { key: "تنبيه", label: "تنبيهات" },
  { key: "نتائج", label: "نتائج" },
  { key: "عام", label: "عام" },
];

const TYPE_TINT: Record<string, string> = {
  تسجيل: "#2F855A",
  تنبيه: "#B7791F",
  نتائج: "#C7A252",
  عام: "#2C5282",
};

export default function AnnouncementsScreen() {
  const { data: announcements } = useAnnouncements();
  const [filterKey, setFilterKey] = useState("all");

  const visible = useMemo(() => {
    const list = announcements ?? [];
    if (filterKey === "all") return list;
    return list.filter((announcement) => announcement.type === filterKey);
  }, [announcements, filterKey]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="الإعلانات" />
      <View style={styles.filters}>
        <FilterChips items={TYPE_FILTERS} activeKey={filterKey} onChange={setFilterKey} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {visible.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            {visible.map((announcement) => {
              const tint = TYPE_TINT[announcement.type] ?? colors.primary;
              return (
                <View key={announcement.id} style={styles.card}>
                  <View style={styles.cardHead}>
                    <View style={[styles.iconWrap, { backgroundColor: tintBackground(tint) }]}>
                      <Ionicons name="megaphone-outline" size={18} color={tint} />
                    </View>
                    <View style={styles.cardHeadText}>
                      <Text style={styles.cardTitle}>{announcement.title}</Text>
                      <Text style={styles.cardDate}>{formatArabicDate(announcement.publishedAt)}</Text>
                    </View>
                    <View style={[styles.typePill, { backgroundColor: tintBackground(tint, 0.12) }]}>
                      <Text style={[styles.typeText, { color: tint }]}>{announcement.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardBody}>{announcement.description}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState icon="megaphone-outline" title="لا توجد إعلانات في هذا التصنيف" />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  filters: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  content: { padding: spacing.lg, paddingTop: 0 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeadText: { flex: 1, gap: 2 },
  cardTitle: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  cardDate: { ...typography.caption },
  typePill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  typeText: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  cardBody: { ...typography.bodyMuted, lineHeight: 21 },
});
