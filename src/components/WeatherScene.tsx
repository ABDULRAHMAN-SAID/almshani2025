import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

/**
 * مشهد الطقس: رجلٌ واقف، وفوقه سماءٌ تتبدّل بحال الجوّ.
 *
 * ولماذا رسمٌ لا أيقونة؟ لأن الأيقونة تقول الحالة، والمشهد يقول الإحساس بها:
 * شمسٌ على رأسه في الظهيرة، أو غيمٌ يمرّ، أو رذاذٌ ينزل، أو خطوط ريحٍ تسحب
 * الهواء. ومن يفتح الشاشة يعرف جوّ يومه قبل أن يقرأ رقمًا.
 *
 * ومرسومٌ بمستطيلاتٍ ودوائر لا بملفّ رسوميّات: إضافة مكتبة رسمٍ تعني وحدةً
 * أصليّة جديدة، وبناءً جديدًا، وتثبيتًا على كل هاتف — ثمنٌ باهظ لصورة. وهذه
 * تصل بتحديثٍ هوائي في دقيقة.
 *
 * والحركة بـ Animated من صميم React Native: بلا مكتبة، وبلا جسرٍ بين
 * الشفرة والعتاد (useNativeDriver)، فلا تُثقل الشاشة ولا تستهلك بطاريةً
 * تُذكر.
 */

interface WeatherSceneProps {
  /** رمز WMO كما يردّه المزوّد. */
  code: number;
  isNight: boolean;
  /** سرعة الرياح كم/س — تُظهر خطوط الهواء وتُسرّعها. */
  windSpeed: number;
}

type Sky = "clear" | "cloud" | "rain" | "storm" | "fog";

function skyKind(code: number): Sky {
  if (code >= 95) return "storm";
  if (code >= 51 || (code >= 80 && code <= 86)) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code >= 2) return "cloud";
  return "clear";
}

/** حلقة متكرّرة بلا نهاية — تُستعمل للغيم والرذاذ والريح. */
function useLoop(duration: number, enabled = true) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [duration, enabled, value]);
  return value;
}

export function WeatherScene({ code, isNight, windSpeed }: WeatherSceneProps) {
  const kind = skyKind(code);
  const windy = windSpeed >= 15;

  const drift = useLoop(9000);
  const drops = useLoop(1400, kind === "rain" || kind === "storm");
  const gust = useLoop(windy ? 2200 : 3800, windy || kind === "fog");
  const breathe = useLoop(5200);

  const cloudShift = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const cloudShiftBack = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const dropFall = drops.interpolate({ inputRange: [0, 1], outputRange: [0, 26] });
  const dropFade = drops.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] });
  const gustShift = gust.interpolate({ inputRange: [0, 1], outputRange: [-26, 26] });
  const gustFade = gust.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.75, 0.75, 0] });
  const sunPulse = breathe.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.06, 1] });

  // مواضع قطرات الرذاذ: ثابتة بين إعادات الرسم، وإلا تراقصت عشوائيًّا.
  const dropLeft = useMemo(() => [14, 34, 54, 74, 94], []);

  return (
    <View style={styles.scene} pointerEvents="none">
      {/* ——— السماء ——— */}
      {kind === "clear" ? (
        <Animated.View style={[styles.sun, { transform: [{ scale: sunPulse }] }]}>
          {isNight ? (
            <View style={styles.moon}>
              <View style={styles.moonBite} />
            </View>
          ) : (
            <>
              <View style={styles.sunCore} />
              <View style={styles.sunHalo} />
            </>
          )}
        </Animated.View>
      ) : null}

      {kind !== "clear" ? (
        <>
          <Animated.View style={[styles.cloudBack, { transform: [{ translateX: cloudShiftBack }] }]}>
            <View style={[styles.puff, { width: 34, height: 34 }]} />
            <View style={[styles.puff, { width: 46, height: 46, marginStart: -16 }]} />
            <View style={[styles.puff, { width: 30, height: 30, marginStart: -14 }]} />
          </Animated.View>
          <Animated.View style={[styles.cloudFront, { transform: [{ translateX: cloudShift }] }]}>
            <View style={[styles.puffLight, { width: 30, height: 30 }]} />
            <View style={[styles.puffLight, { width: 42, height: 42, marginStart: -14 }]} />
            <View style={[styles.puffLight, { width: 26, height: 26, marginStart: -12 }]} />
          </Animated.View>
        </>
      ) : null}

      {/* ——— المطر والرذاذ ——— */}
      {kind === "rain" || kind === "storm" ? (
        <Animated.View style={[styles.rainRow, { opacity: dropFade, transform: [{ translateY: dropFall }] }]}>
          {dropLeft.map((left, index) => (
            <View
              key={left}
              style={[styles.drop, { left, height: index % 2 === 0 ? 13 : 9 }]}
            />
          ))}
        </Animated.View>
      ) : null}

      {kind === "storm" ? <View style={styles.bolt} /> : null}

      {/* ——— الريح والضباب ——— */}
      {windy || kind === "fog" ? (
        <Animated.View style={[styles.windRow, { opacity: gustFade, transform: [{ translateX: gustShift }] }]}>
          <View style={[styles.windLine, { width: 40 }]} />
          <View style={[styles.windLine, { width: 26, marginTop: 7 }]} />
          <View style={[styles.windLine, { width: 33, marginTop: 7 }]} />
        </Animated.View>
      ) : null}

      {/* ——— الشخص ———
          صورةٌ مرسومة لا أشكالٌ مركّبة: المستطيلات والدوائر سقفها شكلٌ
          هندسي، والصورة فيها منحنى وتظليلٌ وحافّةٌ ناعمة. ورُسمت بمنحنيات
          Bezier ثم صُغِّرت ثلاث مرّات — scripts/draw-person.py، فتُعاد متى
          شئنا تغييرها. */}
      <Image
        source={require("@assets/images/weather/person.png")}
        style={[styles.person, { opacity: isNight ? 0.94 : 1 }]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const WHITE = "rgba(255,255,255,0.95)";
const SOFT = "rgba(255,255,255,0.55)";

const styles = StyleSheet.create({
  // ارتفاعٌ يكفي السماء والشخص بلا تصادم: السماء في أعلى ثمانين،
  // والشخص يقف تحتها بقامته كاملة.
  scene: { width: 214, height: 208, alignSelf: "center" },

  sun: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" },
  sunCore: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFD166" },
  sunHalo: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 6,
    borderColor: "rgba(255,209,102,0.22)",
  },
  moon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF1FA",
    overflow: "hidden",
  },
  // الهلال: قرصٌ يقضم منه قرصٌ آخر بلون السماء — أبسط من رسم قوس.
  moonBite: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    top: -8,
    start: -13,
    backgroundColor: "rgba(11,31,58,0.95)",
  },

  cloudBack: { position: "absolute", top: 18, left: 34, flexDirection: "row", alignItems: "flex-end" },
  cloudFront: { position: "absolute", top: 2, left: 78, flexDirection: "row", alignItems: "flex-end" },
  puff: { borderRadius: 999, backgroundColor: SOFT },
  puffLight: { borderRadius: 999, backgroundColor: WHITE },

  rainRow: { position: "absolute", top: 56, left: 54, flexDirection: "row", width: 112, height: 16 },
  drop: { position: "absolute", width: 3.5, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.75)" },

  bolt: {
    position: "absolute",
    top: 52,
    left: 106,
    width: 10,
    height: 22,
    backgroundColor: "#FFD166",
    transform: [{ skewX: "-18deg" }],
    borderRadius: 2,
  },

  windRow: { position: "absolute", top: 92, right: 2, alignItems: "flex-end" },
  windLine: { height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.5)" },

  person: { position: "absolute", bottom: -4, alignSelf: "center", width: 132, height: 158 },

});
