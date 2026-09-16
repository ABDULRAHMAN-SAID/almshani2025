import { useMemo } from "react";
import { View } from "react-native";
import qrcode from "qrcode-generator";

import { themed } from "@/constants";
interface QrCodeProps {
  value: string;
  /** طول ضلع الرمز بالبكسل. */
  size?: number;
}

/**
 * رمز QR مرسوم بمربّعات View، بلا مكتبة رسم أصلية.
 *
 * شاشة تسجيل الحضور تمسح رمز QR بالكاميرا، ولم يكن في التطبيق كلّه ما يُنتج
 * واحدًا: الإداري يكتب رمزًا نصيًّا، فالكاميرا تبحث عمّا لا وجود له، ولا يبقى
 * أمام الحاضر إلا كتابة الرمز بيده — وهي الحالة البديلة لا الأصل.
 *
 * والرسم بمربّعات لا بـ SVG عمدًا: SVG وحدة أصلية تُضاف إلى البناء، وهذه
 * المكتبة خالصة (JavaScript فقط) فلا تمسّ البناء بشيء. والعدد هنا صغير —
 * نسخة 21×21 لرمز قصير — فلا يثقل الرسم.
 *
 * ‏errorCorrection = M: يحتمل تلف ربع الرمز تقريبًا، وهو المناسب لشاشة تُصوَّر
 * بزاوية أو ورقة تُطبع وتُعلَّق.
 */
export function QrCode({ value, size = 220 }: QrCodeProps) {
  const matrix = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const rows: boolean[][] = [];
    for (let r = 0; r < count; r += 1) {
      const row: boolean[] = [];
      for (let c = 0; c < count; c += 1) row.push(qr.isDark(r, c));
      rows.push(row);
    }
    return rows;
  }, [value]);

  const count = matrix.length;
  // الحدّ الأبيض حول الرمز ليس زينة: القارئ يحتاجه ليعرف أين ينتهي الرمز،
  // وبدونه يفشل المسح على خلفية داكنة.
  const quiet = 4;
  const cell = Math.floor(size / (count + quiet * 2));
  const side = cell * (count + quiet * 2);

  return (
    <View style={[styles.frame, { width: side, height: side, padding: cell * quiet }]}>
      {matrix.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((dark, c) => (
            <View
              key={c}
              style={{ width: cell, height: cell, backgroundColor: dark ? "#000000" : "#FFFFFF" }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = themed(() => ({
  frame: { backgroundColor: "#FFFFFF" },
  row: { flexDirection: "row" },
}));
