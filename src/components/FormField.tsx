import { forwardRef, useState } from "react";
import type { TextInput as RNTextInput, TextInputProps } from "react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";

interface FormFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  hint?: string;
  error?: string;
  /** حقل كلمة مرور مع زرّ إظهار — لا يُخفى النصّ بلا وسيلة لمراجعته. */
  secure?: boolean;
}

/**
 * حقل إدخال موحّد للنماذج.
 *
 * وُجد ليكون الحدّ والارتفاع والخطأ واحدًا في كل الشاشات: نماذج الدخول
 * والتسجيل كانت ستكرّر التنسيق نفسه ستّ مرات فتتفاوت بمرور الوقت.
 */
export const FormField = forwardRef<RNTextInput, FormFieldProps>(function FormField(
  { label, hint, error, secure, ...inputProps },
  ref
) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused, !!error && styles.fieldError]}>
        <TextInput
          ref={ref}
          {...inputProps}
          secureTextEntry={secure ? hidden : false}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "إظهار كلمة المرور" : "إخفاء كلمة المرور"}
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            style={styles.eye}
          >
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={19}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { ...typography.body, fontFamily: "Tajawal_500Medium", fontSize: 13.5 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  fieldFocused: { borderColor: colors.primary },
  fieldError: { borderColor: colors.danger },
  input: { ...typography.body, flex: 1, height: "100%", textAlign: "right" },
  eye: { paddingStart: spacing.sm },
  hint: { ...typography.caption, fontSize: 11.5, lineHeight: 17 },
  error: { ...typography.caption, fontSize: 11.5, lineHeight: 17, color: colors.danger },
});
