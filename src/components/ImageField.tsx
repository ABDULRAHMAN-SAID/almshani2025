import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import { pickImage, uploadImage } from "@/services/uploadService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

interface ImageFieldProps {
  label: string;
  hint?: string;
  /** الرابط الحالي، أو سلسلة فارغة إن لم تُختَر صورة. */
  value: string;
  onChange: (url: string) => void;
  /** مجلد الرفع على الخادم: activities أو announcements أو awareness. */
  folder: string;
}

/** اختيار صورة من المعرض ورفعها، مع معاينة وإمكانية الإزالة. */
export function ImageField({ label, hint, value, onChange, folder }: ImageFieldProps) {
  const [busy, setBusy] = useState(false);

  const handlePick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const picked = await pickImage();
      if (!picked) return; // ألغى المستخدم الاختيار
      const url = await uploadImage(picked, folder);
      onChange(url);
      showToast("تم إرفاق الصورة", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر رفع الصورة، حاول مرة أخرى"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {value ? (
        <View style={styles.preview}>
          <Image source={{ uri: value }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إزالة الصورة"
            onPress={() => onChange("")}
            style={styles.remove}
            hitSlop={8}
          >
            <Ionicons name="close" size={16} color={colors.textOnPrimary} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={handlePick}
          disabled={busy}
          style={({ pressed }) => [styles.picker, pressed && { opacity: 0.85 }]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="image-outline" size={22} color={colors.marine} />
              <Text style={styles.pickerText}>اختر صورة من المعرض</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { ...typography.h3, fontSize: 14, marginBottom: spacing.xs, marginTop: spacing.sm },
  hint: { ...typography.caption, marginBottom: spacing.sm, lineHeight: 19 },
  picker: {
    height: 108,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: "dashed",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  pickerText: { ...typography.caption, color: colors.marineDeep, fontFamily: "Tajawal_500Medium" },
  preview: { height: 152, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.backgroundDeep },
  image: { width: "100%", height: "100%" },
  remove: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(6,23,41,0.62)",
    alignItems: "center",
    justifyContent: "center",
  },
});
