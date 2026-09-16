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
 * طائرةٌ تعبر الشاشة مرّةً واحدة عند فتحها، ثم تختفي — ومروحتاها تدوران.
 *
 * ولماذا مرّةً واحدة؟ لأن الحركة المتكرّرة على شاشةٍ تُقرأ فيها أوقاتُ إقلاعٍ
 * تسحب العين عن الأرقام. وهذه تمرّ في ثانيتين ونصف، تقول «هذه شاشة الرحلات»،
 * ثم تخرج من الشجرة كلّها — فلا مؤقّتٌ يدور ولا رسمٌ يُعاد.
 *
 * والمروحة صورةٌ مستقلّة عن البدن: الصورة الواحدة لا تدور إلا كلّها، فتدور
 * الطائرة بدنًا وذيلًا. فمُحيت شفرات الرسم من البدن ووُضعت مروحةٌ متناظرة
 * فوق كل محرّك تدور حول محورها — انظر scripts/make-plane.py.
 *
 * والصورة طائرة السلاح نفسها بعلامتها وعلمها، لا رمزًا عامًّا من خطّ أيقونات:
 * من يفتح الجدول يعرف الطائرة التي يركبها.
 *
 * ومقدّمتها إلى اليسار في الملفّ، والعبور من اليمين إلى اليسار كاتّجاه
 * القراءة — فلا عكس ولا دوران. والإزاحة كلّها transform لا left/right: هذه
 * تنقلب مع اتّجاه الواجهة العربية فتعبر الطائرة من الجهة الخطأ، وتلك لا
 * تنقلب.
 */

/** نسبة صورة البدن: ٦٢٠ × ٢٢٢. */
const RATIO = 620 / 222;

/**
 * موضع كلّ محرّك ونصف قطر مروحته — كسورًا من عرض الصورة وارتفاعها، لا
 * بكسلات: فتصحّ مهما كبرت الطائرة أو صغرت. والأرقام يطبعها make-plane.py.
 */
const ENGINES = [
  { dx: -0.2161, dy: 0.0959, size: 0.167, spin: 760 },
  { dx: -0.1792, dy: 0.0887, size: 0.186, spin: 700 },
];

interface FlyPastProps {
  /** عرض الطائرة على الشاشة. */
  width?: number;
  /** زمن العبور بالملّي ثانية. */
  duration?: number;
}

export function FlyPast({ width: planeWidth = 268, duration = 2700 }: FlyPastProps) {
  const { width } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const [still, setStill] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const blades = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    // من أطفأ الحركة في إعدادات هاتفه أطفأها لسببٍ يخصّه — فلا تُفرض عليه.
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (cancelled) return;
        if (reduced) {
          setStill(true);
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

  // دورة المروحة: حلقةٌ خطّيّة لا تقف ما دامت الطائرة على الشاشة.
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.timing(blades, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [blades, still]);

  if (gone) return null;

  const planeHeight = planeWidth / RATIO;
  // الصندوق موسَّطٌ في الشاشة، فالمدى نصفُ العرض ونصفُ الطائرة وزيادةٌ تُخفيها.
  const edge = width / 2 + planeWidth / 2 + 24;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [edge, -edge] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [34, -34] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.86, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View style={styles.sky} pointerEvents="none">
      <Animated.View style={{ opacity, transform: [{ translateX }, { translateY }] }}>
        <View style={{ width: planeWidth, height: planeHeight }}>
          <Image
            source={require("@assets/images/flights/plane.png")}
            style={styles.body}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />

          {ENGINES.map((engine) => {
            const side = engine.size * planeWidth;
            // كلّ مروحةٍ بسرعتها: محرّكان يدوران بالضبط نفسه يبدوان ترسًا
            // واحدًا، واختلافُ جزءٍ من الثانية يفصلهما للعين.
            const rotate = blades.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", `${Math.round(360000 / engine.spin)}deg`],
            });
            return (
              <View key={engine.dx} style={styles.mount} pointerEvents="none">
                <Animated.Image
                  source={require("@assets/images/flights/prop.png")}
                  style={{
                    width: side,
                    height: side,
                    transform: [
                      { translateX: engine.dx * planeWidth },
                      { translateY: engine.dy * planeHeight },
                      { rotate },
                    ],
                  }}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              </View>
            );
          })}
        </View>
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
  body: { width: "100%", height: "100%" },
  // التوسيط ثم الإزاحة بـ transform — لا left/top، فهذه تنقلب مع اتّجاه
  // الواجهة العربية فتقع المروحة في ذيل الطائرة.
  mount: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
