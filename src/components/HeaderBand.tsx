import { type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, themed } from "@/constants";
import { PatternOverlay } from "./PatternOverlay";

interface HeaderBandProps {
  children: ReactNode;
  /** يمنح البطاقات التالية مساحة لتتداخل مع أسفل الشريط. */
  overlap?: number;
  style?: ViewStyle;
}

/**
 * شريط علوي كحلي بتدرّج خفيف ونقشة هندسية — يعطي الشاشات هوية بصرية
 * بدل الخلفية الرمادية المسطّحة، مع إبقاء المحتوى نفسه هادئًا.
 */
export function HeaderBand({ children, overlap = 0, style }: HeaderBandProps) {
  // من الجهاز لا بتقدير: بدونها يبدأ الشريط تحت شريط الحالة فيُقصّ أعلاه.
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.band,
        { paddingTop: insets.top + spacing.md },
        overlap > 0 && { paddingBottom: spacing.xl + overlap },
        style,
      ]}
    >
      <PatternOverlay />
      <View style={styles.content}>{children}</View>
    </LinearGradient>
  );
}

const styles = themed(() => ({
  band: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg + 8,
    borderBottomRightRadius: radius.lg + 8,
    overflow: "hidden",
  },
  content: { gap: spacing.lg },
}));
