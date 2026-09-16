import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Image, View } from "react-native";

import { themed } from "@/constants";
/**
 * مشهد الطقس: رجلٌ بالزيّ العُماني، وفوقه سماءٌ تتبدّل بحال الجوّ.
 *
 * ولماذا مشهدٌ لا أيقونة؟ لأن الأيقونة تقول الحالة، والمشهد يقول الإحساس بها:
 * شمسٌ على رأسه، أو غيمٌ يمرّ، أو رذاذٌ ينزل، أو خطوط ريحٍ تسحب الهواء. ومن
 * يفتح الشاشة يعرف جوّ يومه قبل أن يقرأ رقمًا.
 *
 * ومرسومٌ بمستطيلاتٍ ودوائر لا بملفّ رسوميّات: إضافة مكتبة رسمٍ تعني وحدةً
 * أصليّة جديدة، وبناءً جديدًا، وتثبيتًا على كل هاتف — ثمنٌ باهظ لصورة. وهذه
 * تصل بتحديثٍ هوائي في دقيقة.
 *
 * والحركة بـ Animated من صميم React Native: بلا مكتبة، وبلا جسرٍ بين
 * الشفرة والعتاد (useNativeDriver)، فلا تُثقل الشاشة ولا تستهلك بطاريةً
 * تُذكر.
 */

/**
 * قامة الرجل على الشاشة — الرقم الوحيد الذي يُغيَّر لتكبيره أو تصغيره.
 *
 * وعرضه وطولُ خطوته وارتفاعُ قدمه وظلّه كلّها كسورٌ منه، لا أرقامًا مكتوبة:
 * صُغّر مرّةً فبقيت الخطوة على مقاس القامة السابقة، فصار يزحف لا يمشي.
 * ونسبةُ العرض إلى الطول من الصورة نفسها (١٧٣ × ٦٤٠).
 */
const PERSON_H = 152;
const PERSON_W = Math.round(PERSON_H * (173 / 640));

/** ارتفاع السماء فوق رأسه: شمسٌ أو غيمٌ أو برق. */
const SKY_H = 88;

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
  const step = useLoop(1250);

  const cloudShift = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const cloudShiftBack = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const dropFall = drops.interpolate({ inputRange: [0, 1], outputRange: [0, 26] });
  const dropFade = drops.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] });
  const gustShift = gust.interpolate({ inputRange: [0, 1], outputRange: [-26, 26] });
  const gustFade = gust.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.75, 0.75, 0] });
  const sunPulse = breathe.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.06, 1] });
  // المشي: دميةٌ مقصوصة لا صورةٌ تُهزّ.
  //
  // جُرّب هزّ الصورة كلّها فقُرئ قفزًا، والعين محقّة: الماشي تتقدّم ساقُه
  // لا قامته. والدشداشة تستر الساقين، فما يُرى من المشي هو القدمان تحت
  // الحاشية. فقُصّت كلُّ قدمٍ صورةً وحدها (scripts/make-person.py) وتتحرّكان
  // هنا على تضادّ: حين تتقدّم إحداهما تتأخّر الأخرى، والمتقدّمة ترتفع عن
  // الأرض في نصف مسارها. والجسم ينخفض قليلًا عند كل وقعة قدم لا يرتفع —
  // فالارتفاع قفز والانخفاض وزن.
  //
  // والمنحنى جيبيٌّ مقرَّب بثماني نقاط: الحركة الخطّية ذهابًا وإيابًا تبدو
  // آلية، والجيبية تتمهّل عند طرفي الخطوة كما تفعل قدمٌ حقيقية.
  const T = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  const STRIDE = PERSON_H * 0.047;
  const LIFT = PERSON_H * 0.021;
  const DIP = PERSON_H * 0.0068;
  const wave = T.map((t) => -Math.cos(2 * Math.PI * t) * STRIDE);
  const frontX = step.interpolate({ inputRange: T, outputRange: wave });
  const backX = step.interpolate({ inputRange: T, outputRange: wave.map((v) => -v) });
  // الرفع: القدم تعلو وهي تمرّ من الخلف إلى الأمام (النصف الثاني للأمامية،
  // والأوّل للخلفية) وتبقى على الأرض في نصفها الآخر.
  const frontY = step.interpolate({ inputRange: [0, 0.5, 0.75, 1], outputRange: [0, 0, -LIFT, 0] });
  const backY = step.interpolate({ inputRange: [0, 0.25, 0.5, 1], outputRange: [0, -LIFT, 0, 0] });
  const bodyY = step.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, DIP, 0, DIP, 0] });
  const shadowX = step.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.9, 1, 0.9, 1] });

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

      {/* ——— الشخصية ———
          صورةٌ حقيقية اختارها صاحب التطبيق، لا شكلًا مرسومًا بالشفرة. وثلاث
          طبقاتٍ بمقاسٍ واحد فوق بعضها: الجسم بلا قدمين، ثم القدم الخلفية،
          ثم الأمامية — فلا حسابَ إزاحةٍ لموضع قدم. */}
      <View style={styles.person}>
        {/* الظلّ تحت القدمين لا تحت وسط الصورة: الرجل يواجه اليسار وقدماه
            في يسارها والبشتُ يملأ يمينها. */}
        <Animated.View
          style={[styles.shadow, { transform: [{ translateX: -PERSON_W * 0.14 }, { scaleX: shadowX }] }]}
        />
        <Animated.View style={[styles.layer, { transform: [{ translateY: bodyY }] }]}>
          <Image
            source={require("@assets/images/weather/person.png")}
            style={[styles.personImage, { opacity: isNight ? 0.92 : 1 }]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
        <Animated.Image
          source={require("@assets/images/weather/foot-back.png")}
          style={[styles.layer, styles.personImage, { transform: [{ translateX: backX }, { translateY: backY }] }]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Animated.Image
          source={require("@assets/images/weather/foot-front.png")}
          style={[styles.layer, styles.personImage, { transform: [{ translateX: frontX }, { translateY: frontY }] }]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    </View>
  );
}

const WHITE = "rgba(255,255,255,0.95)";
const SOFT = "rgba(255,255,255,0.55)";

const styles = themed(() => ({
  // ارتفاعٌ يكفي السماء والشخص بلا تصادم: السماء في أعلى مئة،
  // والشخص يقف تحتها بقامته كاملة.
  scene: { width: 214, height: PERSON_H + SKY_H, alignSelf: "center" },

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

  // alignSelf لا left/right: هذه تنقلب مع اتّجاه الواجهة فيقف الرجل في الطرف.
  person: { position: "absolute", bottom: 0, alignSelf: "center", width: PERSON_W, height: PERSON_H },
  layer: { position: "absolute", top: 0, width: PERSON_W, height: PERSON_H },
  personImage: { width: PERSON_W, height: PERSON_H },
  // ظلٌّ على الأرض يربط القدمين بها — بلا أرضٍ يبدو الماشي معلّقًا.
  shadow: {
    position: "absolute",
    bottom: 1,
    alignSelf: "center",
    width: PERSON_W + 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.20)",
  },

}));
