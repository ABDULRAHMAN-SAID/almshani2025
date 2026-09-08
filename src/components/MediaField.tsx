import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import { MAX_RECORDING_MS, useAudioRecorder } from "@/hooks/useAudioRecorder";
import {
  type MediaAttachment,
  type MediaKind,
  type PickedMedia,
  captureImage,
  captureVideo,
  formatDuration,
  imageToMedia,
  pickFile,
  pickImage,
  pickVideo,
  uploadMedia,
} from "@/services/uploadService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";
import { AttachmentList } from "./AttachmentList";

/** أدوات الإرفاق المتاحة — كل واحدة زر في الشريط. */
type ToolKey = "image" | "camera" | "video" | "record" | "audio" | "file";

const TOOLS: { key: ToolKey; kind: MediaKind; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: "image", kind: "image", icon: "image-outline", label: "صورة" },
  { key: "camera", kind: "image", icon: "camera-outline", label: "التقاط" },
  { key: "video", kind: "video", icon: "film-outline", label: "فيديو" },
  { key: "record", kind: "video", icon: "videocam-outline", label: "تصوير" },
  { key: "audio", kind: "audio", icon: "mic-outline", label: "تسجيل" },
  { key: "file", kind: "file", icon: "document-attach-outline", label: "ملف" },
];

interface MediaFieldProps {
  label?: string;
  hint?: string;
  value: MediaAttachment[];
  onChange: (attachments: MediaAttachment[]) => void;
  /** مجلد الرفع: messages أو posts أو announcements… */
  folder: string;
  /** الأدوات المسموحة؛ الافتراضي كلها. */
  tools?: ToolKey[];
  /** أقصى عدد مرفقات. */
  max?: number;
}

/**
 * شريط الإرفاق الموحّد: صورة من المعرض، التقاط بالكاميرا، فيديو، تسجيل صوتي،
 * وملف. يرفع المرفق فور اختياره ويعرضه في قائمة قابلة للحذف.
 */
export function MediaField({ label, hint, value, onChange, folder, tools, max = 4 }: MediaFieldProps) {
  const [busy, setBusy] = useState<ToolKey | null>(null);
  const full = value.length >= max;

  const attach = useCallback(
    async (media: PickedMedia | null) => {
      if (!media) return; // ألغى المستخدم الاختيار
      const attachment = await uploadMedia(media, folder);
      onChange([...value, attachment]);
      showToast("تم إرفاق الملف", "success");
    },
    [folder, onChange, value]
  );

  const recorder = useAudioRecorder({
    onRecorded: (media) => {
      setBusy("audio");
      attach(media)
        .catch((error) => showToast(toArabicMessage(error, "تعذّر إرفاق التسجيل"), "error"))
        .finally(() => setBusy(null));
    },
  });

  const run = async (key: ToolKey) => {
    if (busy || full) return;

    if (key === "audio") {
      try {
        if (recorder.isRecording) {
          await recorder.stop();
        } else {
          await recorder.start();
        }
      } catch (error) {
        showToast(toArabicMessage(error, "تعذّر بدء التسجيل"), "error");
      }
      return;
    }

    setBusy(key);
    try {
      if (key === "image") {
        const picked = await pickImage();
        await attach(picked ? imageToMedia(picked) : null);
      } else if (key === "camera") {
        const picked = await captureImage();
        await attach(picked ? imageToMedia(picked) : null);
      } else if (key === "video") {
        await attach(await pickVideo());
      } else if (key === "record") {
        await attach(await captureVideo());
      } else {
        await attach(await pickFile());
      }
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر إرفاق الملف، حاول مرة أخرى"), "error");
    } finally {
      setBusy(null);
    }
  };

  const visible = TOOLS.filter((tool) => !tools || tools.includes(tool.key));

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {recorder.isRecording ? (
        <View style={styles.recording}>
          <View style={styles.pulse} />
          <Text style={styles.recordingText}>جارٍ التسجيل — {formatDuration(recorder.elapsedMs)}</Text>
          <Text style={styles.recordingMax}>الحد {formatDuration(MAX_RECORDING_MS)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إنهاء التسجيل"
            onPress={() => void recorder.stop()}
            style={styles.stopButton}
          >
            <Ionicons name="stop" size={15} color={colors.textOnPrimary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إلغاء التسجيل"
            onPress={() => void recorder.cancel()}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={17} color={colors.danger} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.tools}>
          {visible.map((tool) => {
            const active = busy === tool.key;
            return (
              <Pressable
                key={tool.key}
                accessibilityRole="button"
                accessibilityLabel={`إرفاق ${tool.label}`}
                onPress={() => void run(tool.key)}
                disabled={Boolean(busy) || full}
                style={({ pressed }) => [
                  styles.tool,
                  (pressed || active) && styles.toolActive,
                  full && styles.toolDisabled,
                ]}
              >
                {active ? (
                  <ActivityIndicator size="small" color={colors.marineDeep} />
                ) : (
                  <Ionicons name={tool.icon} size={19} color={full ? colors.textMuted : colors.marineDeep} />
                )}
                <Text style={[styles.toolLabel, full && { color: colors.textMuted }]}>{tool.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {full ? <Text style={styles.limit}>بلغت الحد الأقصى: {max} مرفقات.</Text> : null}

      <AttachmentList
        attachments={value}
        onRemove={(attachment) => onChange(value.filter((item) => item.id !== attachment.id))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { ...typography.h3, fontSize: 14, marginBottom: spacing.xs, marginTop: spacing.sm },
  hint: { ...typography.caption, marginBottom: spacing.sm, lineHeight: 19 },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tool: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 40,
  },
  toolActive: { borderColor: colors.marine, backgroundColor: colors.infoSoft },
  toolDisabled: { opacity: 0.55 },
  toolLabel: { ...typography.caption, fontSize: 12, color: colors.marineDeep, fontFamily: "Tajawal_500Medium" },
  recording: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  recordingText: { ...typography.body, fontSize: 13, color: colors.danger, flex: 1 },
  recordingMax: { ...typography.caption, fontSize: 11 },
  stopButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  limit: { ...typography.caption, fontSize: 11, marginTop: spacing.xs, color: colors.warning },
});
