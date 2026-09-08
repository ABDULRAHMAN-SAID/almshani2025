import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { colors, radius, spacing, typography } from "@/constants";
import { formatDuration } from "@/services/uploadService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

interface AudioPlayerProps {
  url: string;
  /** المدة المعروفة مسبقًا — تظهر قبل التحميل فلا يبقى الشريط فارغًا. */
  durationMs?: number;
  label?: string;
  /** نسخة فاتحة تُستعمل فوق سطح كحلي. */
  onDark?: boolean;
}

/**
 * مشغّل مقطع صوتي: زر تشغيل/إيقاف، شريط تقدّم، والزمن.
 * يحرّر الصوت عند مغادرة الشاشة حتى لا يستمر التشغيل في الخلفية.
 */
export function AudioPlayer({ url, durationMs, label = "مقطع صوتي", onDark }: AudioPlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [totalMs, setTotalMs] = useState(durationMs ?? 0);

  const unload = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) await sound.unloadAsync().catch(() => undefined);
  }, []);

  useEffect(() => () => void unload(), [unload]);

  const toggle = async () => {
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
          setPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setPlaying(true);
        }
        return;
      }

      setLoading(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true }, (status) => {
        if (!status.isLoaded) return;
        setPositionMs(status.positionMillis);
        if (status.durationMillis) setTotalMs(status.durationMillis);
        setPlaying(status.isPlaying);
        if (status.didJustFinish) {
          setPlaying(false);
          setPositionMs(0);
        }
      });
      soundRef.current = sound;
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر تشغيل المقطع الصوتي"), "error");
    } finally {
      setLoading(false);
    }
  };

  const progress = totalMs > 0 ? Math.min(1, positionMs / totalMs) : 0;
  const tint = onDark ? colors.textOnPrimary : colors.marineDeep;
  const trackColor = onDark ? "rgba(255,255,255,0.24)" : colors.infoSoft;

  return (
    <View style={[styles.wrap, onDark ? styles.wrapDark : styles.wrapLight]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? "إيقاف مؤقت" : "تشغيل المقطع الصوتي"}
        onPress={toggle}
        style={[styles.button, { backgroundColor: onDark ? "rgba(255,255,255,0.16)" : colors.infoSoft }]}
        hitSlop={6}
      >
        {loading ? (
          <ActivityIndicator size="small" color={tint} />
        ) : (
          <Ionicons name={playing ? "pause" : "play"} size={18} color={tint} />
        )}
      </Pressable>

      <View style={styles.body}>
        <Text style={[styles.label, onDark && { color: colors.textOnPrimary }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.track, { backgroundColor: trackColor }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: tint }]} />
        </View>
      </View>

      <Text style={[styles.time, onDark && { color: colors.textOnPrimaryMuted }]}>
        {formatDuration(positionMs > 0 ? positionMs : totalMs)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  wrapLight: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  wrapDark: { backgroundColor: "rgba(255,255,255,0.10)" },
  button: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 6 },
  label: { ...typography.caption, color: colors.textSecondary, fontFamily: "Tajawal_500Medium" },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  time: { ...typography.caption, fontSize: 11, minWidth: 36, textAlign: "left" },
});
