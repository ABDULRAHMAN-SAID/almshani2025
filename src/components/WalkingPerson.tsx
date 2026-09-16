import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

/**
 * شخصٌ يمشي — لا شكلٌ هندسي.
 *
 * وأوّل محاولة كانت رأسًا دائريًّا وجسمًا مستطيلًا وساقين، فضحك صاحبها —
 * وكان محقًّا: ذاك رمزُ «رجل» على باب دورة مياه، لا إنسانٌ في مشهد.
 *
 * والفرق بينهما ليس التفاصيل الكثيرة، بل أربعة أشياء: ملابسُ لها لون غير
 * لون الجلد، وشَعرٌ يكسر دائرة الرأس، وأطرافٌ مائلة لا عمودية (المشي ميلٌ
 * قبل أن يكون حركة)، وظلٌّ يُجلس القدمين على الأرض.
 *
 * ومرسوم بمستطيلاتٍ ودوائر مُدارة الأركان لا بملفّ رسوميّات: المكتبة وحدةٌ
 * أصليّة جديدة — ملفٌّ جديد وتثبيتٌ على كل هاتف — وقد ذقنا ثمن ذلك. وهذا
 * يصل بتحديثٍ هوائي في دقيقة.
 *
 * والمواضع بـ left لا start: هذه لوحةٌ لا نصّ، ولا يجوز أن تنقلب مع اتجاه
 * الكتابة فيمشي الرجل إلى الخلف.
 */

const SKIN = "#E3AE85";
const SKIN_DARK = "#C9905F";
const HAIR = "#2B2F36";
const COAT = "#1F4C77";
const COAT_DARK = "#173B5E";
const TROUSER = "#8C99A8";
const TROUSER_DARK = "#6E7B8B";
const SHOE = "#33414F";
const GOLD = "#C7A252";

interface WalkingPersonProps {
  /** ليلًا يخفت وهج الملابس قليلًا لتجلس في السماء الكحلية. */
  isNight?: boolean;
}

export function WalkingPerson({ isNight = false }: WalkingPersonProps) {
  const step = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // خطوةٌ ذهابًا وإيابًا: الساقان تتبادلان، والجسم يعلو قليلًا في الوسط.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(step, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(step, { toValue: 0, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [step]);

  const frontLeg = step.interpolate({ inputRange: [0, 1], outputRange: ["14deg", "-10deg"] });
  const backLeg = step.interpolate({ inputRange: [0, 1], outputRange: ["-12deg", "16deg"] });
  const frontArm = step.interpolate({ inputRange: [0, 1], outputRange: ["-12deg", "8deg"] });
  const bob = step.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -2, 0] });

  return (
    <Animated.View style={[styles.figure, { opacity: isNight ? 0.96 : 1, transform: [{ translateY: bob }] }]}>
      {/* ——— الساق الخلفية ——— */}
      <Animated.View style={[styles.legBack, { transform: [{ rotate: backLeg }] }]}>
        <View style={styles.legBackShape} />
        <View style={[styles.shoe, styles.shoeBack]} />
      </Animated.View>

      {/* ——— الذراع الخلفية ——— */}
      <View style={styles.armBack} />

      {/* ——— الجسم: معطفٌ بياقة ——— */}
      <View style={styles.coat}>
        <View style={styles.collar} />
        <View style={styles.zip} />
      </View>

      {/* ——— الساق الأمامية ——— */}
      <Animated.View style={[styles.legFront, { transform: [{ rotate: frontLeg }] }]}>
        <View style={styles.legFrontShape} />
        <View style={[styles.shoe, styles.shoeFront]} />
      </Animated.View>

      {/* ——— الذراع الأمامية ومعها الهاتف ——— */}
      <Animated.View style={[styles.armFront, { transform: [{ rotate: frontArm }] }]}>
        <View style={styles.armFrontShape} />
        <View style={styles.forearm} />
        <View style={styles.hand} />
        <View style={styles.phone} />
      </Animated.View>

      {/* ——— الرأس ——— */}
      <View style={styles.head}>
        <View style={styles.face} />
        <View style={styles.hairTop} />
        <View style={styles.hairSide} />
        <View style={styles.ear} />
        {/* سمّاعة: قوسٌ فوق الرأس وكوبٌ على الأذن، بلمسة ذهبية القاعدة */}
        <View style={styles.band} />
        <View style={styles.cup} />
        <View style={styles.eye} />
        <View style={styles.brow} />
      </View>

      {/* ——— الظلّ ——— */}
      <View style={styles.shadow} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // لوحة ثابتة القياس: كل موضعٍ فيها محسوبٌ على هذا الإطار.
  figure: { width: 96, height: 132 },

  head: { position: "absolute", left: 24, top: 0, width: 44, height: 46 },
  face: {
    position: "absolute",
    left: 6,
    top: 6,
    width: 30,
    height: 34,
    borderRadius: 15,
    backgroundColor: SKIN,
  },
  // الشَعر: قوسٌ فوق الجبهة يكسر دائرة الرأس — بدونه يصير الوجه كرةً.
  hairTop: {
    position: "absolute",
    left: 4,
    top: 2,
    width: 34,
    height: 20,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    borderBottomLeftRadius: 6,
    backgroundColor: HAIR,
  },
  hairSide: {
    position: "absolute",
    left: 4,
    top: 10,
    width: 10,
    height: 18,
    borderRadius: 5,
    backgroundColor: HAIR,
  },
  ear: {
    position: "absolute",
    left: 32,
    top: 20,
    width: 7,
    height: 9,
    borderRadius: 4,
    backgroundColor: SKIN_DARK,
  },
  band: {
    position: "absolute",
    left: 7,
    top: 0,
    width: 30,
    height: 12,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: GOLD,
  },
  cup: {
    position: "absolute",
    left: 30,
    top: 16,
    width: 11,
    height: 14,
    borderRadius: 5,
    backgroundColor: GOLD,
  },
  eye: { position: "absolute", left: 26, top: 24, width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: HAIR },
  brow: { position: "absolute", left: 24, top: 19, width: 8, height: 2, borderRadius: 1, backgroundColor: HAIR },

  coat: {
    position: "absolute",
    left: 26,
    top: 42,
    width: 40,
    height: 46,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: COAT,
    overflow: "hidden",
  },
  collar: {
    position: "absolute",
    left: 12,
    top: 0,
    width: 16,
    height: 9,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: COAT_DARK,
  },
  zip: { position: "absolute", left: 19, top: 8, width: 2, height: 34, backgroundColor: COAT_DARK },

  armBack: {
    position: "absolute",
    left: 22,
    top: 48,
    width: 9,
    height: 32,
    borderRadius: 5,
    backgroundColor: COAT_DARK,
    transform: [{ rotate: "8deg" }],
  },
  armFront: { position: "absolute", left: 58, top: 46, width: 26, height: 44 },
  armFrontShape: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 10,
    height: 24,
    borderRadius: 5,
    backgroundColor: COAT,
  },
  forearm: {
    position: "absolute",
    left: 2,
    top: 18,
    width: 20,
    height: 9,
    borderRadius: 5,
    backgroundColor: COAT,
    transform: [{ rotate: "-22deg" }],
  },
  hand: {
    position: "absolute",
    left: 17,
    top: 12,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: SKIN,
  },
  // الهاتف في يده: أصغر تفصيل في اللوحة، وهو ما يجعلها «شخصًا ينتظر» لا تمثالًا.
  phone: {
    position: "absolute",
    left: 19,
    top: 2,
    width: 8,
    height: 13,
    borderRadius: 2,
    backgroundColor: "#EDF2F8",
    borderWidth: 1.5,
    borderColor: HAIR,
  },

  legBack: { position: "absolute", left: 30, top: 84, width: 14, height: 44 },
  legBackShape: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 13,
    height: 38,
    borderRadius: 6,
    backgroundColor: TROUSER_DARK,
  },
  legFront: { position: "absolute", left: 46, top: 84, width: 14, height: 44 },
  legFrontShape: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 13,
    height: 38,
    borderRadius: 6,
    backgroundColor: TROUSER,
  },
  shoe: { position: "absolute", width: 18, height: 8, borderRadius: 4, backgroundColor: SHOE },
  shoeBack: { left: -4, top: 33 },
  shoeFront: { left: -2, top: 33 },

  shadow: {
    position: "absolute",
    left: 20,
    bottom: -2,
    width: 58,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.13)",
  },
});
