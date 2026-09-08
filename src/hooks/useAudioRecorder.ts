import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import { type PickedMedia, recordingToMedia } from "@/services/uploadService";

/** أقصى مدة تسجيل — يتوقف التسجيل تلقائيًا عندها. */
export const MAX_RECORDING_MS = 120_000;

interface AudioRecorderOptions {
  /**
   * يُستدعى عند انتهاء التسجيل — يدويًا أو تلقائيًا عند بلوغ الحد الأقصى.
   * وجوده هنا (بدل قيمة يُرجعها `stop`) يضمن ألا يضيع المقطع في الإيقاف التلقائي.
   */
  onRecorded: (media: PickedMedia) => void;
}

interface AudioRecorderState {
  isRecording: boolean;
  /** المدة المنقضية بالمللي ثانية أثناء التسجيل. */
  elapsedMs: number;
  start: () => Promise<void>;
  /** يوقف التسجيل ويسلّم المقطع عبر `onRecorded`. */
  stop: () => Promise<void>;
  /** يلغي التسجيل الجاري دون إرجاع مقطع. */
  cancel: () => Promise<void>;
}

/**
 * تسجيل مقطع صوتي قصير.
 *
 * يطلب إذن الميكروفون عند أول ضغطة، ويحرّر المسجّل في كل مسار خروج —
 * فلو خرج المستخدم من الشاشة والتسجيل جارٍ لا يبقى الميكروفون مشغولًا.
 */
export function useAudioRecorder({ onRecorded }: AudioRecorderOptions): AudioRecorderState {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const release = useCallback(async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) return null;
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // المسجّل متوقف أصلًا — لا شيء نفعله.
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => undefined);
    return recording.getURI();
  }, []);

  // تحرير الميكروفون إذا أُغلقت الشاشة والتسجيل ما زال جاريًا.
  useEffect(() => () => void release(), [release]);

  const start = useCallback(async () => {
    if (recordingRef.current) return;

    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error("لم يُسمح باستخدام الميكروفون. فعّل الإذن من إعدادات الهاتف.");
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
      (status) => {
        if (!status.isRecording) return;
        setElapsedMs(status.durationMillis);
      },
      200
    );

    recordingRef.current = recording;
    setElapsedMs(0);
    setIsRecording(true);
  }, []);

  const stop = useCallback(async () => {
    if (!recordingRef.current) return;
    const duration = elapsedMs;
    const uri = await release();
    setIsRecording(false);
    setElapsedMs(0);
    // ضغطة عابرة لا تنتج مقطعًا مفيدًا، فنتجاهلها بدل إرفاق صمت.
    if (!uri || duration < 700) return;
    onRecorded(recordingToMedia(uri, duration));
  }, [elapsedMs, onRecorded, release]);

  const cancel = useCallback(async () => {
    await release();
    setIsRecording(false);
    setElapsedMs(0);
  }, [release]);

  // إيقاف تلقائي عند بلوغ الحد الأقصى، حتى لا يمتلئ المرفق بتسجيل منسي.
  useEffect(() => {
    if (isRecording && elapsedMs >= MAX_RECORDING_MS) {
      void stop();
    }
  }, [elapsedMs, isRecording, stop]);

  return { isRecording, elapsedMs, start, stop, cancel };
}
