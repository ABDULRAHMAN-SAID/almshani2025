import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

/**
 * طائرةٌ تعبر الشاشة مرّةً واحدة عند فتحها، ثم تختفي.
 *
 * ولماذا مرّةً واحدة؟ لأن الحركة المتكرّرة على شاشةٍ تُقرأ فيها أوقاتُ إقلاعٍ
 * تسحب العين عن الأرقام. وهذه تمرّ في ثانيتين، تقول «هذه شاشة الرحلات»، ثم
 * تخرج من الشجرة كلّها — فلا مؤقّتٌ يدور ولا رسمٌ يُعاد.
 *
 * والصورة طائرة السلاح نفسها بعلامتها وعلمها، لا رمزًا عامًّا من خطّ أيقونات:
 * من يفتح الجدول يعرف الطائرة التي يركبها.
 *
 * ومقدّمتها إلى اليسار في الملفّ، والعبور من اليمين إلى اليسار كاتّجاه
 * القراءة — فلا عكس ولا دوران. والإزاحة كلّها transform لا left/right: هذه
 * تنقلب مع اتّجاه الواجهة العربية فتعبر الطائرة من الجهة الخطأ، وتلك لا
 * تنقلب.
 */

/** نسبة الصورة: ٦٢٠ × ٢٢٢. */
const RATIO = 620 / 222;

interface FlyPastProps {
  /** عرض الطائرة على الشاشة. */
  width?: number;
  /** زمن العبور بالملّي ثانية. */
  duration?: number;
}

export function FlyPast({ width: planeWidth = 150, duration = 2600 }: FlyPastProps) {
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

  // الصندوق موسَّطٌ في الشاشة، فالمدى نصفُ العرض ونصفُ الطائرة وزيادةٌ تُخفيها.
  const edge = width / 2 + planeWidth / 2 + 24;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [edge, -edge] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [30, -30] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.86, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View style={styles.sky} pointerEvents="none">
      <Animated.View style={{ opacity, transform: [{ translateX }, { translateY }] }}>
        <Image
          source={require("@assets/images/flights/plane.png")}
          style={{ width: planeWidth, height: planeWidth / RATIO }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
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
});
