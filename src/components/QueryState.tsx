import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import { SkeletonBlock } from "./LoadingSkeleton";
import { SecondaryButton } from "./SecondaryButton";
import { isNetworkError, toArabicMessage } from "@/utils/errors";

interface QueryStateProps {
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  /** يُعرض حين لا يوجد تحميل ولا خطأ. */
  children: ReactNode;
}

/**
 * غلاف موحّد لحالات جلب البيانات: تحميل، خطأ مع زر إعادة محاولة، ثم المحتوى.
 * يمنع تكرار نفس المنطق في كل شاشة، ويضمن أن لا يبقى المستخدم أمام شاشة فارغة.
 */
export function QueryState({ isLoading, error, onRetry, children }: QueryStateProps) {
  if (isLoading) {
    return (
      <View style={styles.pad}>
        <SkeletonBlock height={84} />
        <View style={{ height: 12 }} />
        <SkeletonBlock height={84} />
        <View style={{ height: 12 }} />
        <SkeletonBlock height={84} />
      </View>
    );
  }

  if (error) {
    const offline = isNetworkError(error);
    return (
      <View style={styles.errorBox}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={offline ? "cloud-offline-outline" : "alert-circle-outline"}
            size={26}
            color={colors.warning}
          />
        </View>
        <Text style={styles.title}>{offline ? "لا يوجد اتصال" : "تعذّر تحميل البيانات"}</Text>
        <Text style={styles.body}>{toArabicMessage(error, "حدث خطأ أثناء التحميل")}</Text>
        {onRetry ? (
          <SecondaryButton label="إعادة المحاولة" onPress={onRetry} style={{ marginTop: spacing.md }} />
        ) : null}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg },
  errorBox: {
    alignItems: "center",
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.warningSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { ...typography.h3, textAlign: "center" },
  body: { ...typography.caption, textAlign: "center", marginTop: spacing.xs, lineHeight: 20 },
});
