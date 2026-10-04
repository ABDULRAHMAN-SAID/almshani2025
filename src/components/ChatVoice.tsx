import { View } from "react-native";
import { AttachmentList } from "./AttachmentList";

interface ChatVoiceProps {
  /** رابط التسجيل كما خُزّن؛ يُوقَّع عند التشغيل لأنه في حاويةٍ مغلقة. */
  url: string;
  durationMs?: number;
  /** رسالتي: مشغّل فاتح فوق فقاعتي الكحلية. */
  mine?: boolean;
}

/**
 * رسالة صوتية داخل فقاعة.
 *
 * على AttachmentList لا على AudioPlayer مباشرة: توقيع الرابط المؤقّت وتخزينه
 * مكتوبان هناك، ونسخةٌ ثانية منه تتباعد عن الأولى. والعرض المحدّد لأن الفقاعة
 * تضيق على محتواها، فتنكمش بطاقة المشغّل حتى لا يبقى للشريط مكان.
 */
export function ChatVoice({ url, durationMs, mine }: ChatVoiceProps) {
  return (
    <View style={{ width: 230 }}>
      <AttachmentList
        attachments={[
          { id: url, kind: "audio", url, name: "رسالة صوتية", mimeType: "audio/m4a", durationMs },
        ]}
        onDark={mine}
      />
    </View>
  );
}
