import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";

interface ImageZoomProps {
  uri: string | null;
  onClose: () => void;
}

/**
 * صورة بملء الشاشة تُكبَّر وتُجرّ.
 *
 * وجدول الرحلات هو السبب: ورقة عريضة فيها ستّة أعمدة وخمس محطّات، تُقرأ في
 * اليد ولا تُقرأ في عرض هاتف. فتُعرض هنا بضعفين ونصف من عرض الشاشة داخل
 * تمريرٍ أفقي ورأسيّ — يجرّها بإصبعه إلى العمود الذي يريد.
 *
 * وبلا مكتبة إيماءات: قرصة الإصبعين تحتاج مكتبةً كاملة تُضاف إلى التطبيق
 * كلّه لأجل شاشة واحدة، والجرّ يكفي لقراءة جدول.
 */
export function ImageZoom({ uri, onClose }: ImageZoomProps) {
  const { width, height } = useWindowDimensions();
  const wide = width * 2.5;

  return (
    <Modal visible={Boolean(uri)} transparent={false} animationType="fade" onRequestClose={onClose}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.center}
          maximumZoomScale={4}
          minimumZoomScale={1}
        >
          <ScrollView horizontal contentContainerStyle={styles.center} showsHorizontalScrollIndicator>
            {uri ? (
              <Image
                source={{ uri }}
                style={{ width: wide, height: height - 120 }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            ) : null}
          </ScrollView>
        </ScrollView>

        <View style={styles.bar}>
          <Text style={styles.hint}>اسحب لتقرأ بقية الجدول</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
            <Ionicons name="close" size={20} color={colors.textOnPrimary} />
            <Text style={styles.closeText}>إغلاق</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  fill: { flex: 1 },
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  hint: { ...typography.caption, color: "rgba(255,255,255,0.7)", flex: 1 },
  close: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  closeText: { ...typography.caption, color: colors.textOnPrimary },
});
