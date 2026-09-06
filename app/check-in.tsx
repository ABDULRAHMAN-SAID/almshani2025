import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PatternOverlay } from "@/components/PatternOverlay";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { useRefreshPoints } from "@/hooks/usePoints";
import { findDemoCheckInActivity, submitCheckIn } from "@/services/checkinService";
import { showToast } from "@/store/toastStore";

/**
 * تسجيل حضور محاضرة/نشاط عبر مسح رمز QR يُعرض في القاعة، مع إدخال يدوي
 * كبديل دائم (لعدم توفر كاميرا أو تعذّر المسح).
 */
export default function CheckInScreen() {
  const params = useLocalSearchParams<{ activityId?: string }>();
  const demoActivity = findDemoCheckInActivity();
  const activityId = params.activityId ?? demoActivity?.id ?? "";

  const [permission, requestPermission] = useCameraPermissions();
  const [manualMode, setManualMode] = useState(false);
  const [code, setCode] = useState("");
  const [scanned, setScanned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const refreshPoints = useRefreshPoints();

  const handleResult = async (scannedCode: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await submitCheckIn(activityId, scannedCode);
      if (result.success) {
        refreshPoints();
        showToast(`تم تسجيل حضورك بنجاح! +${result.pointsEarned} نقاط`, "success");
        router.back();
      } else if (result.alreadyCheckedIn) {
        showToast("تم تسجيل حضورك مسبقًا لهذا النشاط", "info");
      } else {
        showToast("الرمز غير صحيح، تأكد منه وحاول مرة أخرى", "error");
        setScanned(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <PatternOverlay opacity={0.06} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-forward" size={22} color={colors.textOnPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>تسجيل الحضور</Text>
        <View style={{ width: 22 }} />
      </View>

      {demoActivity ? <Text style={styles.activityLabel}>{demoActivity.title}</Text> : null}

      {!manualMode ? (
        <View style={styles.cameraWrap}>
          {!permission ? null : !permission.granted ? (
            <View style={styles.permissionBox}>
              <Ionicons name="camera-outline" size={32} color="rgba(255,255,255,0.7)" />
              <Text style={styles.permissionText}>يحتاج مسح الرمز إلى إذن الكاميرا</Text>
              <PrimaryButton label="السماح باستخدام الكاميرا" onPress={requestPermission} style={{ marginTop: spacing.md }} />
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={
                scanned || submitting
                  ? undefined
                  : (result) => {
                      setScanned(true);
                      handleResult(result.data);
                    }
              }
            />
          )}
          <View style={styles.frame} pointerEvents="none" />
        </View>
      ) : (
        <View style={styles.manualBox}>
          <Text style={styles.manualLabel}>أدخل رمز الحضور الظاهر في القاعة</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="مثال: CYBER26"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="characters"
            textAlign="center"
          />
          <PrimaryButton
            label="تأكيد"
            onPress={() => handleResult(code)}
            loading={submitting}
            disabled={!code.trim()}
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => setManualMode((v) => !v)}
        style={styles.switchModeBtn}
      >
        <Text style={styles.switchModeText}>{manualMode ? "استخدام الكاميرا بدلًا من ذلك" : "لا تستطيع المسح؟ أدخل الرمز يدويًا"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  headerTitle: { ...typography.h3, color: colors.textOnPrimary },
  activityLabel: { textAlign: "center", color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", marginBottom: spacing.md },
  cameraWrap: {
    flex: 1,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    position: "absolute",
    top: "20%",
    left: "15%",
    right: "15%",
    bottom: "30%",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: radius.lg,
  },
  permissionBox: { alignItems: "center", paddingHorizontal: spacing.xl },
  permissionText: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_400Regular", fontSize: 13, marginTop: spacing.sm, textAlign: "center" },
  manualBox: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.xl },
  manualLabel: { color: "rgba(255,255,255,0.85)", textAlign: "center", marginBottom: spacing.md, fontFamily: "Tajawal_500Medium" },
  input: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: radius.md,
    height: 52,
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
    letterSpacing: 2,
  },
  switchModeBtn: { alignItems: "center", padding: spacing.lg },
  switchModeText: { color: colors.gold, fontFamily: "Tajawal_500Medium", fontSize: 13 },
});
