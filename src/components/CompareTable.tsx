import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, themed, typography } from "@/constants";
import { COMPARE, TIERS, type Cell } from "@/product/plan";

/**
 * جدولُ المقارنة.
 *
 * وهو مكتوبٌ بالصفوف لا بالأعمدة لأن الهاتف ضيّق: العمودُ الأوّل سطرُ الميزة،
 * والأعمدةُ الثلاثة علاماتٌ صغيرة. والخالي منها «✕» ظاهرةً لا فراغًا — الفراغ
 * يُقرأ سهوًا، والعلامةُ تُقرأ حدًّا.
 */
export function CompareTable() {
  return (
    <View style={styles.table}>
      <View style={styles.headRow}>
        <Text style={styles.headLabel}>الميزة</Text>
        {TIERS.map((tier) => (
          <Text key={tier.id} style={[styles.headCell, tier.featured && styles.headCellOn]} numberOfLines={1}>
            {tier.name}
          </Text>
        ))}
      </View>

      {COMPARE.map((group) => (
        <View key={group.title}>
          <View style={styles.groupRow}>
            <Text style={styles.groupTitle}>{group.title}</Text>
          </View>
          {group.rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <CellView value={row.basic} />
              <CellView value={row.plus} featured />
              <CellView value={row.business} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function CellView({ value, featured }: { value: Cell; featured?: boolean }) {
  return (
    <View style={[styles.cell, featured && styles.cellOn]}>
      {value === true ? (
        <Ionicons name="checkmark-circle" size={17} color={colors.success} />
      ) : value === false ? (
        <Ionicons name="close" size={15} color={colors.textMuted} />
      ) : (
        <Text style={styles.cellText} numberOfLines={2}>{value}</Text>
      )}
    </View>
  );
}

const styles = themed(() => ({
  table: { backgroundColor: colors.surface, borderRadius: 18, overflow: "hidden" },

  headRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.md,
  },
  headLabel: { flex: 1.5, fontFamily: "Tajawal_700Bold", fontSize: 12.5, color: colors.textOnPrimaryMuted },
  headCell: { flex: 1, textAlign: "center", fontFamily: "Tajawal_700Bold", fontSize: 12.5, color: colors.textOnPrimary },
  headCellOn: { color: colors.gold },

  groupRow: { backgroundColor: colors.backgroundDeep, paddingVertical: 7, paddingHorizontal: spacing.md },
  groupTitle: { fontFamily: "Tajawal_700Bold", fontSize: 11.5, color: colors.marine, letterSpacing: 0.3 },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  rowLabel: { flex: 1.5, ...typography.caption, fontSize: 11.5, lineHeight: 17, color: colors.textSecondary },
  cell: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 2 },
  cellOn: { backgroundColor: colors.successSoft, borderRadius: 8, alignSelf: "stretch", minHeight: 30 },
  cellText: { fontFamily: "Tajawal_500Medium", fontSize: 10.5, lineHeight: 15, color: colors.textPrimary, textAlign: "center" },
}));
