import { type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "@/constants";
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
  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.band, overlap > 0 && { paddingBottom: spacing.xl + overlap }, style]}
    >
      <PatternOverlay />
      <View style={styles.content}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  band: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg + 8,
    borderBottomRightRadius: radius.lg + 8,
    overflow: "hidden",
  },
  content: { gap: spacing.lg },
});
