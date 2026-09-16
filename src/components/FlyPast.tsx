import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants";

/**
 * طائرةٌ تعبر الشاشة مرّةً واحدة عند فتحها، ثم تختفي.
 *
 * ولماذا مرّةً واحدة؟ لأن الحركة المتكرّرة على شاشةٍ تُقرأ فيها أوقاتُ إقلاعٍ
 * تسحب العين عن الأرقام. وهذه تمرّ في ثانيتين، تقول «هذه شاشة الرحلات»، ثم
 * تخرج من الشجرة كلّها — فلا مؤقّتٌ يدور ولا رسمٌ يُعاد.
 *
 * والعبور من اليمين إلى اليسار كاتّجاه القراءة، ورمزُ الطائرة في الخطّ يتّجه
 * يمينًا فيُعكس بـ scaleX. والإزاحة كلّها بـ transform لا بـ left/right: هذه
 * تنقلب مع اتّجاه الواجهة فتمرّ الطائرة مقلوبةً، وتلك لا تنقلب.
 */

interface FlyPastProps {
  /** حجم الرمز. */
  size?: number;
  /** زمن العبور بالملّي ثانية. */
  duration?: number;
}

export function FlyPast({ size = 30, duration = 2300 }: FlyPastProps) {
  const { width } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    // من أطفأ الحركة في إعدادات هاتفه أطفأها لسببٍ يخصّه — فلا تُفرض عليه.
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (cancelled) return;
        if (reduced) {
          setGone(true);
          return;
        }
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && !cancelled) setGone(true);
        });
      })
      .catch(() => {
        if (!cancelled) setGone(true);
      });

    return () => {
      cancelled = true;
    };
  }, [duration, progress]);

  if (gone) return null;

  // الصندوق موسَّطٌ في الشاشة، فالمدى نصفُ العرض وزيادةٌ تُخفي الطائرة خارجها.
  const edge = width / 2 + size * 2;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [edge, -edge] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [26, -26] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.84, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View style={styles.sky} pointerEvents="none">
      <Animated.View style={{ opacity, transform: [{ translateX }, { translateY }] }}>
        <Ionicons name="airplane" size={size} color={colors.primary} style={styles.nose} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sky: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  // الرمز يتّجه يمينًا في الخطّ، والطائرة تمضي يسارًا.
  nose: { transform: [{ scaleX: -1 }] },
});
