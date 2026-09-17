import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * إطار هاتفٍ حقيقيّ يُعرض داخله ما سيراه زبونُ صاحب المشروع.
 *
 * ولماذا إطارٌ لا بطاقة؟ لأن صاحب المشروع لا يشتري «تصميمًا»، إنما يشتري
 * ما سيراه زبونه في يده. وصورةُ القالب في بطاقةٍ مستطيلة تُقرأ عيّنةَ ألوان؛
 * وفي إطار هاتفٍ بحافّته وشقّه وشريط حالته تُقرأ تطبيقًا جاهزًا — وهذا
 * الفرق بين «جميل» و«أريده».
 *
 * والمحتوى يُبنى دائمًا على عرض ٣٩٠ — عرض الهاتف المتوسّط — ثم يُصغَّر
 * بمقياسٍ واحد. فالقالب يُكتب مرّةً بمقاساتٍ حقيقية، ويُعرض مصغَّرًا في
 * المعرض وبحجمه الكامل في المعاينة، بلا أن يُكتب مرّتين.
 */

/** العرض المنطقيّ الذي تُبنى عليه القوالب. */
export const BASE_WIDTH = 390;
/** نسبة الشاشة الطويلة الحديثة. */
const SCREEN_RATIO = 19.5 / 9;

interface PhoneFrameProps {
  /** عرض الهاتف كاملًا بإطاره. */
  width: number;
  /** ساعةُ شريط الحالة — تُكتب ولا تُحسب، فالمعرض ليس ساعةً. */
  clock?: string;
  /** لون شريط الحالة ورموزه: فاتحٌ على صدرٍ داكن. */
  statusTint?: string;
  children: ReactNode;
}

export function PhoneFrame({ width, clock = "٩:٤١", statusTint = "#FFFFFF", children }: PhoneFrameProps) {
  const bezel = Math.max(4, width * 0.026);
  const screenWidth = width - bezel * 2;
  const screenHeight = screenWidth * SCREEN_RATIO;
  const scale = screenWidth / BASE_WIDTH;
  const radius = width * 0.115;

  return (
    <View style={[styles.shadow, { width, height: screenHeight + bezel * 2, borderRadius: radius }]}>
      <View style={[styles.bezel, { padding: bezel, borderRadius: radius }]}>
        <View style={[styles.screen, { width: screenWidth, height: screenHeight, borderRadius: radius - bezel }]}>
          {/* المحتوى بمقاسه الحقيقي ثم يُصغَّر — فلا يُكتب القالب بمقاسين. */}
          <View
            style={{
              width: BASE_WIDTH,
              height: screenHeight / scale,
              transform: [{ scale }],
              // المقياس يقع على مركز العنصر، فيُزاح إلى ركنه ليملأ الشاشة.
              transformOrigin: "top left",
            }}
          >
            {children}
          </View>

          {/* شريط الحالة فوق المحتوى — الهاتف يعلو ما فيه. */}
          <View style={[styles.status, { height: bezel * 5.2, paddingHorizontal: bezel * 3 }]} pointerEvents="none">
            <Text style={[styles.clock, { color: statusTint, fontSize: Math.max(7, width * 0.033) }]}>{clock}</Text>
            <View style={styles.signal}>
              {[0.45, 0.65, 0.85, 1].map((height) => (
                <View
                  key={height}
                  style={{
                    width: Math.max(1.4, width * 0.008),
                    height: Math.max(3, width * 0.022) * height,
                    borderRadius: 1,
                    backgroundColor: statusTint,
                  }}
                />
              ))}
              <View
                style={{
                  width: Math.max(8, width * 0.05),
                  height: Math.max(4, width * 0.026),
                  borderRadius: 2,
                  borderWidth: Math.max(0.8, width * 0.004),
                  borderColor: statusTint,
                  marginStart: Math.max(2, width * 0.012),
                  padding: 1,
                }}
              >
                <View style={{ flex: 1, backgroundColor: statusTint, borderRadius: 1 }} />
              </View>
            </View>
          </View>

          {/* الجزيرة: شقٌّ أسودُ في أعلى الشاشة، وهو ما يجعل الإطار هاتفًا. */}
          <View
            style={[
              styles.island,
              {
                width: width * 0.28,
                height: bezel * 2.6,
                borderRadius: bezel * 1.3,
                top: bezel * 1.1,
              },
            ]}
            pointerEvents="none"
          />

          {/* شريط الإيماءة أسفل الشاشة. */}
          <View
            style={[
              styles.homeBar,
              { width: width * 0.3, height: Math.max(2.5, width * 0.011), bottom: bezel * 1.4 },
            ]}
            pointerEvents="none"
          />
        </View>
      </View>

      {/* أزرار الجانب — تفصيلةٌ صغيرة، وبها يُصدَّق الإطار. */}
      <View style={[styles.buttonSilent, { top: width * 0.22, height: width * 0.06, width: Math.max(2, width * 0.009) }]} />
      <View style={[styles.buttonVolume, { top: width * 0.33, height: width * 0.11, width: Math.max(2, width * 0.009) }]} />
      <View style={[styles.buttonPower, { top: width * 0.3, height: width * 0.14, width: Math.max(2, width * 0.009) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#0A140F",
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
  bezel: { flex: 1, backgroundColor: "#10100F" },
  screen: { overflow: "hidden", backgroundColor: "#FFFFFF" },
  status: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clock: { fontFamily: "Tajawal_700Bold" },
  signal: { flexDirection: "row", alignItems: "center", gap: 1.5 },
  island: { position: "absolute", alignSelf: "center", backgroundColor: "#000000" },
  homeBar: {
    position: "absolute",
    alignSelf: "center",
    borderRadius: 99,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  buttonSilent: { position: "absolute", left: -1.5, borderRadius: 2, backgroundColor: "#2A2A28" },
  buttonVolume: { position: "absolute", left: -1.5, borderRadius: 2, backgroundColor: "#2A2A28" },
  buttonPower: { position: "absolute", right: -1.5, borderRadius: 2, backgroundColor: "#2A2A28" },
});
