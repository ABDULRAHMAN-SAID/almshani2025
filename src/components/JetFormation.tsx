import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

/**
 * تشكيلٌ خماسيّ من المقاتلات يعبر الشاشة صعودًا مرّةً واحدة عند فتح التطبيق.
 *
 * وهو أوّل ما يُرى: شعارُ القاعدة وتحته اسمها، وفوقهما طيرانٌ يمرّ. ومرّةً
 * واحدة لا حلقة — ثم يخرج من شجرة العناصر كلّها، فلا مؤقّتٌ يدور خلف شاشةٍ
 * انتهت.
 *
 * ونسخةٌ واحدة من الطائرة تُرسم خمسًا بإزاحات: الصورة الأصلية خمسُ نسخٍ من
 * طائرةٍ واحدة، فحفظُها خمسًا يُثقل التحديث بلا فائدة. والأهمّ أن كلّ واحدةٍ
 * تتمايل وحدها بطورٍ مختلف — تشكيلٌ يتحرّك كقطعةٍ واحدة صورةٌ تنزلق، لا
 * خمسُ طائراتٍ تحفظ موقعها.
 *
 * والإزاحة كلّها transform على المشغّل الأصلي: لا left/top، فهذه تنقلب مع
 * اتّجاه الواجهة العربية فينقلب التشكيل.
 */

/** نسبة صورة الطائرة: ٢٦٠ × ٣٧٤. */
const RATIO = 374 / 260;

/** مواضع التشكيل كسورًا من عرض الطائرة — يطبعها scripts/make-jet.py. */
const FORMATION = [
  { dx: 0.0, dy: 0.0, sway: 0.0 },
  { dx: -0.614, dy: 1.327, sway: 0.35 },
  { dx: 0.614, dy: 1.329, sway: 0.7 },
  { dx: -1.221, dy: 2.562, sway: 0.15 },
  { dx: 1.221, dy: 2.56, sway: 0.55 },
];

/** أعمقُ الصفّ في التشكيل — تُحسب به مسافة العبور. */
const DEPTH = 2.562;

/** نقاطُ تقريب الموجة الجيبية للتمايل. */
const PHASE = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];

interface JetFormationProps {
  /** عرض الطائرة الواحدة على الشاشة. */
  jetWidth?: number;
  /** زمن العبور بالملّي ثانية. */
  duration?: number;
}

export function JetFormation({ jetWidth = 92, duration = 1750 }: JetFormationProps) {
  const { height } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const hold = useRef(new Animated.Value(0)).current;

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
        Animated.loop(
          Animated.timing(hold, {
            toValue: 1,
            duration: 1400,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
      })
      .catch(() => {
        if (!cancelled) setGone(true);
      });

    return () => {
      cancelled = true;
    };
  }, [duration, hold, progress]);

  if (gone) return null;

  const jetHeight = jetWidth * RATIO;
  // من تحت الشاشة إلى فوقها: نصفُ الارتفاع، وعمقُ التشكيل، وقامةُ الطائرة.
  const edge = height / 2 + DEPTH * jetWidth + jetHeight;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [edge, -edge] });
  // تكبر قليلًا وهي تقترب — بلا هذا يبدو المرور انزلاقَ ورقةٍ لا طيرانًا.
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1.16] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.86, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View style={styles.sky} pointerEvents="none">
      <Animated.View style={[styles.center, { opacity, transform: [{ translateY }, { scale }] }]}>
        {FORMATION.map((jet) => {
          // تمايلٌ خفيف بطورٍ يخصّ كلّ طائرة: الجناح يحفظ موقعه ولا يجمد.
          const drift = hold.interpolate({
            inputRange: PHASE,
            outputRange: PHASE.map((t) => Math.sin(2 * Math.PI * (t + jet.sway)) * 1.7),
          });
          return (
            <Animated.Image
              key={`${jet.dx}-${jet.dy}`}
              source={require("@assets/images/jets/jet.png")}
              style={[
                styles.jet,
                {
                  width: jetWidth,
                  height: jetHeight,
                  transform: [
                    { translateX: jet.dx * jetWidth },
                    { translateY: jet.dy * jetWidth },
                    { translateX: drift },
                  ],
                },
              ]}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { ...StyleSheet.absoluteFillObject },
  // كلّ طائرةٍ تُوسَّط بالمحاذاة ثم تُزاح بـ transform — لا left/top، فهذه
  // تنقلب مع اتّجاه الواجهة العربية فينقلب التشكيل.
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  jet: { position: "absolute" },
});
