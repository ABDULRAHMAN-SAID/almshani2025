import { Image, StyleSheet, View, type ViewStyle } from "react-native";

const SIZES = { sm: 40, md: 56, lg: 124 } as const;

interface LogoProps {
  size?: keyof typeof SIZES;
  style?: ViewStyle;
}

/**
 * غلاف موحّد لشعار سلاح الجو — استبدال assets/images/logo/logo.png
 * ينعكس هنا تلقائيًا في كل الشاشات (Splash، تسجيل الدخول، رأس الرئيسية).
 */
export function Logo({ size = "md", style }: LogoProps) {
  const dimension = SIZES[size];
  return (
    <View style={[styles.wrapper, { width: dimension, height: dimension }, style]}>
      <Image
        source={require("@assets/images/logo/logo.png")}
        style={{ width: dimension, height: dimension }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    // الشعار نفسه بخلفية شفافة، فيظهر بشكل صحيح فوق أي خلفية (كحلية أو فاتحة).
    backgroundColor: "transparent",
  },
});
