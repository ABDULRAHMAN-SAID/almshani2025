import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { colors, radius, spacing, typography } from "@/constants";
import { type MediaAttachment, formatBytes, formatDuration } from "@/services/uploadService";
import { showToast } from "@/store/toastStore";
import { AudioPlayer } from "./AudioPlayer";

interface AttachmentListProps {
  attachments: MediaAttachment[];
  /** يظهر زر إزالة على كل مرفق حين تُمرَّر الدالة (وضع التحرير). */
  onRemove?: (attachment: MediaAttachment) => void;
  onDark?: boolean;
}

const FILE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  "application/pdf": "document-text-outline",
  "text/plain": "document-outline",
};

/** يعرض مرفقات المشاركة أو الرسالة: صور، فيديو، صوت، وملفات. */
export function AttachmentList({ attachments, onRemove, onDark }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {attachments.map((attachment) => (
        <View key={attachment.id} style={styles.item}>
          {attachment.kind === "image" ? (
            <Image
              source={{ uri: attachment.url }}
              style={styles.image}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}

          {attachment.kind === "video" ? (
            <View style={styles.video}>
              <Video
                source={{ uri: attachment.url }}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                isLooping={false}
              />
              {attachment.durationMs ? (
                <View style={styles.durationTag} pointerEvents="none">
                  <Text style={styles.durationText}>{formatDuration(attachment.durationMs)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {attachment.kind === "audio" ? (
            <AudioPlayer
              url={attachment.url}
              durationMs={attachment.durationMs}
              label={attachment.name}
              onDark={onDark}
            />
          ) : null}

          {attachment.kind === "file" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                Linking.openURL(attachment.url).catch(() =>
                  showToast("تعذّر فتح الملف على هذا الجهاز", "error")
                );
              }}
              style={styles.file}
            >
              <Ionicons
                name={FILE_ICON[attachment.mimeType] ?? "document-attach-outline"}
                size={20}
                color={colors.marineDeep}
              />
              <View style={styles.fileBody}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {attachment.name}
                </Text>
                {attachment.size ? <Text style={styles.fileSize}>{formatBytes(attachment.size)}</Text> : null}
              </View>
              <Ionicons name="download-outline" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}

          {onRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`إزالة ${attachment.name}`}
              onPress={() => onRemove(attachment)}
              style={styles.remove}
              hitSlop={8}
            >
              <Ionicons name="close" size={15} color={colors.textOnPrimary} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  item: { position: "relative" },
  image: { width: "100%", height: 190, borderRadius: radius.md, backgroundColor: colors.backgroundDeep },
  video: {
    width: "100%",
    height: 200,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.primaryDark,
  },
  durationTag: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(6,23,41,0.66)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  durationText: { ...typography.caption, fontSize: 11, color: colors.textOnPrimary },
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  fileBody: { flex: 1, gap: 2 },
  fileName: { ...typography.body, fontSize: 13, fontFamily: "Tajawal_500Medium" },
  fileSize: { ...typography.caption, fontSize: 11 },
  remove: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(6,23,41,0.68)",
    alignItems: "center",
    justifyContent: "center",
  },
});
