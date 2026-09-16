import { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, typography, themed } from "@/constants";

interface ScreenHeaderProps {
  title: string;
  /** عنصر اختياري في الطرف المقابل (زر إجراء مثلًا). */
  action?: ReactNode;
  /** رأس فوق سطح كحلي بدل الخلفية الفاتحة. */
  onDark?: boolean;
}

/**
 * رأس موحّد للشاشات الداخلية: زر رجوع (سهم يشير يمينًا كما يقتضي اتجاه RTL)،
 * العنوان في المنتصف، ومساحة إجراء اختيارية.
 */
export function ScreenHeader({ title, action, onDark }: ScreenHeaderProps) {
  const tint = onDark ? colors.textOnPrimary : colors.textPrimary;
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        onPress={() => router.back()}
        hitSlop={10}
      >
        <Ionicons name="chevron-forward" size={22} color={tint} />
      </Pressable>
      <Text style={[styles.title, { color: tint }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.action}>{action}</View>
    </View>
  );
}

/**
 * حشوة أعلى الشاشة تُحسب من الجهاز لا تُقدَّر.
 *
 * كانت ثابتة، فوقع الرأس تحت شريط الحالة: العنوان مقصوص نصفه وزرّ الرجوع
 * ملتصق بالساعة. ولا يظهر ذلك في متصفّح ولا في محاكٍ بلا نتوء — يظهر على
 * أوّل هاتف حقيقي، وهو أوّل ما تقع عليه العين في كل شاشة.
 */
const styles = themed(() => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  title: { ...typography.h3, flex: 1, textAlign: "center" },
  action: { minWidth: 22, alignItems: "flex-start" },
}));
