import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Assignment, Submission } from "@sao-do/contracts";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenState } from "@/components/ScreenState";
import { academicRequest } from "@/lib/academicApi";
import { useAppData } from "@/lib/AppData";
import { colors } from "@/lib/theme";

function createIdempotencyKey() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const random = (Math.random() * 16) | 0;
      return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
    })
  );
}

type PendingSubmission = {
  content: string;
  key: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePendingSubmission(value: string | null) {
  if (!value) return null;
  try {
    const pending = JSON.parse(value) as Partial<PendingSubmission>;
    return typeof pending.key === "string" &&
      uuidPattern.test(pending.key) &&
      typeof pending.content === "string"
      ? ({ content: pending.content, key: pending.key } satisfies PendingSubmission)
      : null;
  } catch {
    return null;
  }
}

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthorized, membership, session } = useAppData();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const userId = session?.user.id ?? "anonymous";
  const idempotencyStorageKey = useMemo(
    () => `academic-submission:${userId}:${id}`,
    [id, userId],
  );

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");

    if (!session) {
      setError("Phiên đăng nhập đã hết hạn.");
      setLoading(false);
      return;
    }

    try {
      const [assignmentResult, submissionResult] = await Promise.all([
        academicRequest<{ assignments: Assignment[] }>(
          "/api/assignments",
          session.access_token,
        ),
        academicRequest<{ submissions: Submission[] }>(
          `/api/submissions?assignmentId=${encodeURIComponent(id)}`,
          session.access_token,
        ),
      ]);
      setAssignment(
        assignmentResult.assignments.find((candidate) => candidate.id === id) ??
          null,
      );
      setSubmission(submissionResult.submissions[0] ?? null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải bài tập.",
      );
    } finally {
      setLoading(false);
    }
  }, [id, session]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function fetchOwnSubmission() {
    if (!session || !id) return null;
    const result = await academicRequest<{ submissions: Submission[] }>(
      `/api/submissions?assignmentId=${encodeURIComponent(id)}`,
      session.access_token,
    );
    return result.submissions[0] ?? null;
  }

  async function acceptReconciledSubmission(reconciled: Submission) {
    await AsyncStorage.removeItem(idempotencyStorageKey);
    setSubmission(reconciled);
  }

  async function submit() {
    if (!assignment) return;
    const trimmedContent = content.trim();
    if (trimmedContent.length < 1 || trimmedContent.length > 20_000) {
      setError("Bài làm phải có từ 1 đến 20.000 ký tự.");
      return;
    }

    setSubmitting(true);
    setError("");

    if (!session) {
      setError("Phiên đăng nhập đã hết hạn.");
      setSubmitting(false);
      return;
    }

    try {
      const storedValue = await AsyncStorage.getItem(idempotencyStorageKey);
      let pending = parsePendingSubmission(storedValue);

      if (storedValue && pending?.content !== trimmedContent) {
        const reconciled = await fetchOwnSubmission();
        if (reconciled) {
          await acceptReconciledSubmission(reconciled);
          return;
        }
        pending = null;
      }

      if (!pending) {
        pending = {
          content: trimmedContent,
          key: createIdempotencyKey(),
        };
        await AsyncStorage.setItem(
          idempotencyStorageKey,
          JSON.stringify(pending),
        );
      }

      const result = await academicRequest<{ submission: Submission }>(
        "/api/submissions",
        session.access_token,
        {
          body: JSON.stringify({
            assignmentId: assignment.id,
            content: trimmedContent,
          }),
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": pending.key,
          },
          method: "POST",
        },
      );
      await AsyncStorage.removeItem(idempotencyStorageKey);
      setSubmission(result.submission);
      setContent("");
    } catch (requestError) {
      try {
        const reconciled = await fetchOwnSubmission();
        if (reconciled) {
          await acceptReconciledSubmission(reconciled);
          return;
        }
      } catch {
        // Keep the original POST error and draft when reconciliation is unavailable.
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể nộp bài. Nội dung vẫn được giữ để bạn thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthorized) return <Redirect href="/" />;
  if (loading) return <ScreenState busy message="Đang tải bài tập…" />;
  if (membership && membership.role !== "student") {
    return <ScreenState message="Chức năng nộp bài chỉ dành cho sinh viên." />;
  }
  if (error && !assignment) {
    return <ScreenState message={error} onAction={() => void load()} />;
  }
  if (!assignment) {
    return (
      <ScreenState message="Không tìm thấy bài tập hoặc bạn không có quyền truy cập." />
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text maxFontSizeMultiplier={2} style={styles.title}>
            {assignment.title}
          </Text>
          <Text maxFontSizeMultiplier={2} style={styles.due}>
            {assignment.dueAt
              ? `Hạn nộp ${new Intl.DateTimeFormat("vi-VN", {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(new Date(assignment.dueAt))}`
              : "Không đặt hạn nộp"}
          </Text>

          <View style={styles.instructions}>
            <Text maxFontSizeMultiplier={2} style={styles.sectionLabel}>
              Hướng dẫn
            </Text>
            <Text maxFontSizeMultiplier={2} style={styles.instructionsText}>
              {assignment.instructions || "Giảng viên không thêm hướng dẫn."}
            </Text>
          </View>

          {submission ? (
            <View accessibilityLiveRegion="polite" style={styles.statusCard}>
              <Text maxFontSizeMultiplier={2} style={styles.statusEyebrow}>
                Trạng thái bài nộp
              </Text>
              <Text maxFontSizeMultiplier={2} style={styles.status}>
                {submission.status === "reviewed"
                  ? "Đã nhận phản hồi"
                  : "Đã nộp"}
              </Text>
              <Text maxFontSizeMultiplier={2} style={styles.submittedAt}>
                {new Intl.DateTimeFormat("vi-VN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(submission.submittedAt))}
              </Text>
              <View style={styles.feedback}>
                <Text maxFontSizeMultiplier={2} style={styles.feedbackLabel}>
                  Phản hồi của giảng viên
                </Text>
                <Text maxFontSizeMultiplier={2} style={styles.feedbackText}>
                  {submission.feedback ?? "Giảng viên chưa phản hồi."}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              <Text maxFontSizeMultiplier={2} style={styles.sectionLabel}>
                Bài làm
              </Text>
              <TextInput
                accessibilityLabel="Nội dung bài làm"
                maxFontSizeMultiplier={2}
                maxLength={20_000}
                multiline
                onChangeText={setContent}
                placeholder="Nhập nội dung bài làm tại đây…"
                placeholderTextColor={colors.muted}
                style={styles.input}
                textAlignVertical="top"
                value={content}
              />
              <Text maxFontSizeMultiplier={2} style={styles.counter}>
                {content.length.toLocaleString("vi-VN")}/20.000 ký tự
              </Text>
              {!!error && (
                <Text
                  accessibilityLiveRegion="polite"
                  maxFontSizeMultiplier={2}
                  style={styles.error}
                >
                  {error}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  busy: submitting,
                  disabled: submitting,
                }}
                disabled={submitting}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.submit,
                  pressed && styles.pressed,
                  submitting && styles.disabled,
                ]}
              >
                <Text maxFontSizeMultiplier={2} style={styles.submitText}>
                  {submitting ? "Đang nộp bài…" : "Nộp bài"}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.paper, flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: 24, paddingBottom: 48 },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 40,
  },
  due: {
    color: colors.blue,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 10,
  },
  instructions: {
    borderTopColor: colors.yellow,
    borderTopWidth: 4,
    marginTop: 28,
    paddingTop: 20,
  },
  sectionLabel: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 25,
  },
  instructionsText: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 25,
    marginTop: 8,
  },
  form: { marginTop: 32 },
  input: {
    borderColor: colors.muted,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    minHeight: 220,
    padding: 14,
  },
  counter: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "right",
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  submit: {
    alignItems: "center",
    backgroundColor: colors.red,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  pressed: { opacity: 0.84 },
  disabled: { opacity: 0.6 },
  submitText: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  statusCard: {
    backgroundColor: colors.mist,
    borderLeftColor: colors.red,
    borderLeftWidth: 5,
    marginTop: 32,
    padding: 20,
  },
  statusEyebrow: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  status: {
    color: colors.blue,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 32,
    marginTop: 4,
  },
  submittedAt: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  feedback: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 20,
    paddingTop: 18,
  },
  feedbackLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 22,
  },
  feedbackText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 25,
    marginTop: 6,
  },
});
