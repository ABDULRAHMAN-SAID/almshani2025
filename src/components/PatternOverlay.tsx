import { Image, StyleSheet, View } from "react-native";

interface PatternOverlayProps {
  /** شدة ظهور النقشة — تُبقى منخفضة جدًا حتى تبقى خلفية لا عنصرًا بارزًا. */
  opacity?: number;
  /** لون النقشة؛ الافتراضي أبيض للأسطح الكحلية، ويُمرَّر لون القسم فوق الأسطح الفاتحة. */
  color?: string;
}

/**
 * نقشة هندسية (نجمة ثمانية) تتكرر بلا حدود فوق الأسطح الملوّنة.
 * تُوضع داخل حاوية بموضع نسبي وتملأها بالكامل خلف المحتوى.
 */
export function PatternOverlay({ opacity = 0.07, color }: PatternOverlayProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={require("@assets/images/pattern.png")}
        resizeMode="repeat"
        tintColor={color}
        style={[StyleSheet.absoluteFill, { opacity }]}
      />
    </View>
  );
}
