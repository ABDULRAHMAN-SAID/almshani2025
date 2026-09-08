import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { addQuizQuestion, deleteQuizQuestion, fetchAdminQuiz, setQuizStatus } from "@/services/adminService";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { showToast } from "@/store/toastStore";
import { pluralizeAr, QUESTION_FORMS } from "@/utils/arabic";
import { toArabicMessage } from "@/utils/errors";

const OPTION_LABELS = ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"];

/**
 * إدارة السؤال الثقافي الأسبوعي. هذه هي الشاشة الوحيدة في التطبيق التي تعرض
 * الإجابة الصحيحة؛ المستخدم العادي يقرأ الأسئلة عبر عرض يحجبها، والتحقق ومنح
 * النقاط يتمّان داخل الخادم وحده.
 */
export default function AdminQuizScreen() {
  const client = useQueryClient();
  const { data: quiz, isLoading } = useQuery({ queryKey: ["admin-quiz"], queryFn: fetchAdminQuiz });
  const logAction = useAdminSettingsStore((state) => state.logAction);

  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  if (isLoading) return <View style={styles.screen} />;

  if (!quiz) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="السؤال الثقافي" />
        <EmptyState icon="help-circle-outline" title="لا توجد مسابقة لهذا الأسبوع" />
      </View>
    );
  }

  const filledOptions = options.map((option) => option.trim()).filter(Boolean);
  const canAdd = text.trim().length > 5 && category.trim().length > 1 && filledOptions.length === 4;

  const setOption = (index: number, value: string) => {
    setOptions((current) => current.map((option, i) => (i === index ? value : option)));
  };

  const handleAdd = async () => {
    if (!canAdd) {
      showToast("أكمل نص السؤال والتصنيف والخيارات الأربعة", "error");
      return;
    }
    setSaving(true);
    try {
      await addQuizQuestion({
        quizId: quiz.id,
        text: text.trim(),
        options: options.map((option) => option.trim()),
        category: category.trim(),
        correctOptionIndex: correctIndex,
      });
      setText("");
      setCategory("");
      setOptions(["", "", "", ""]);
      setCorrectIndex(0);
      client.invalidateQueries();
      logAction("إضافة سؤال ثقافي");
      showToast("تمت إضافة السؤال", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّرت إضافة السؤال"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const next = quiz.status === "open" ? "closed" : "open";
    try {
      await setQuizStatus(quiz.id, next);
      client.invalidateQueries();
      logAction(next === "open" ? "فتح أسبوع المسابقة" : "إغلاق أسبوع المسابقة");
      showToast(next === "open" ? "تم فتح أسبوع المسابقة" : "تم إغلاق أسبوع المسابقة", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر تغيير حالة المسابقة"), "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuizQuestion(id);
      client.invalidateQueries();
      logAction("حذف سؤال ثقافي");
      showToast("تم حذف السؤال", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر حذف السؤال"), "error");
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="السؤال الثقافي" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.weekCard}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.weekLabel}>{quiz.weekLabel}</Text>
            <Text style={styles.weekMeta}>
              {quiz.startDate} ← {quiz.endDate} · {pluralizeAr(quiz.questions.length, QUESTION_FORMS)}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: quiz.status === "open" ? "rgba(30,142,90,0.12)" : colors.background },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: quiz.status === "open" ? colors.success : colors.textMuted },
              ]}
            >
              {quiz.status === "open" ? "مفتوح" : "مغلق"}
            </Text>
          </View>
        </View>

        <SecondaryButton
          label={quiz.status === "open" ? "إغلاق أسبوع المسابقة" : "فتح أسبوع المسابقة"}
          onPress={handleToggleStatus}
        />

        <Text style={styles.sectionLabel}>أسئلة الأسبوع</Text>
        {quiz.questions.length === 0 ? (
          <EmptyState icon="help-circle-outline" title="لا توجد أسئلة بعد" />
        ) : (
          quiz.questions.map((question) => (
            <View key={question.id} style={styles.questionCard}>
              <View style={styles.questionHead}>
                <Text style={styles.questionCategory}>{question.category}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="حذف السؤال"
                  onPress={() => handleDelete(question.id)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.danger} />
                </Pressable>
              </View>
              <Text style={styles.questionText}>{question.text}</Text>
              {question.options.map((option, index) => {
                const correct = index === question.correctOptionIndex;
                return (
                  <View key={option} style={[styles.optionRow, correct && styles.optionRowCorrect]}>
                    <Ionicons
                      name={correct ? "checkmark-circle" : "ellipse-outline"}
                      size={17}
                      color={correct ? colors.success : colors.textMuted}
                    />
                    <Text style={[styles.optionText, correct && styles.optionTextCorrect]}>{option}</Text>
                  </View>
                );
              })}
            </View>
          ))
        )}

        <Text style={styles.sectionLabel}>إضافة سؤال جديد</Text>
        <View style={styles.field}>
          <Text style={styles.label}>نص السؤال</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="مثال: ما اسم أطول واد في محافظة ظفار؟"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.inputMultiline]}
            multiline
            textAlign="right"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>التصنيف</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="جغرافيا، تاريخ عمان، ثقافة عامة..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            textAlign="right"
          />
        </View>

        <Text style={styles.label}>الخيارات — اضغط على الدائرة لتحديد الإجابة الصحيحة</Text>
        {options.map((option, index) => {
          const correct = index === correctIndex;
          return (
            <View key={OPTION_LABELS[index]} style={styles.optionInputRow}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: correct }}
                accessibilityLabel={`تحديد ${OPTION_LABELS[index]} كإجابة صحيحة`}
                onPress={() => setCorrectIndex(index)}
                hitSlop={8}
              >
                <Ionicons
                  name={correct ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={correct ? colors.success : colors.textMuted}
                />
              </Pressable>
              <TextInput
                value={option}
                onChangeText={(value) => setOption(index, value)}
                placeholder={OPTION_LABELS[index]}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { flex: 1 }]}
                textAlign="right"
              />
            </View>
          );
        })}

        <PrimaryButton
          label="إضافة السؤال"
          onPress={handleAdd}
          loading={saving}
          disabled={!canAdd}
          style={{ marginTop: spacing.lg }}
        />

        <Text style={styles.note}>
          الإجابة الصحيحة لا تُرسل إلى تطبيق المستخدم إطلاقًا. عند الإجابة تُقارن داخل الخادم وتُمنح
          النقاط العشر هناك، فلا يمكن معرفة الإجابة أو منح النقاط من جهة العميل.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  weekCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  weekLabel: { ...typography.h3, fontSize: 15 },
  weekMeta: { ...typography.caption, fontSize: 12 },
  statusPill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { fontFamily: "Tajawal_500Medium", fontSize: 12 },
  sectionLabel: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.sm },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  questionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  questionCategory: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.primary },
  questionText: { ...typography.body, fontFamily: "Tajawal_500Medium", marginBottom: spacing.sm },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    marginBottom: spacing.xs,
  },
  optionRowCorrect: { backgroundColor: "rgba(30,142,90,0.10)" },
  optionText: { ...typography.body, fontSize: 14, flex: 1 },
  optionTextCorrect: { fontFamily: "Tajawal_500Medium", color: colors.success },
  field: { marginBottom: spacing.md },
  label: { ...typography.h3, fontSize: 14, marginBottom: spacing.sm, marginTop: spacing.sm },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  inputMultiline: { height: 90, paddingTop: spacing.md, textAlignVertical: "top" },
  optionInputRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  note: { ...typography.caption, lineHeight: 20, marginTop: spacing.xl, textAlign: "center" },
});
