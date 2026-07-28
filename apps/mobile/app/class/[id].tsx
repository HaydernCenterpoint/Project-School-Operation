import type { Assignment } from "@sao-do/contracts";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenState } from "@/components/ScreenState";
import { academicRequest } from "@/lib/academicApi";
import { useAppData } from "@/lib/AppData";
import { colors } from "@/lib/theme";

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { classes, isAuthorized, loading, membership, session } =
    useAppData();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const item = classes.find((classItem) => classItem.id === id);

  const loadAssignments = useCallback(async () => {
    if (!id) return;
    setAssignmentsLoading(true);
    setAssignmentError("");

    if (!session) {
      setAssignmentError("Phiên đăng nhập đã hết hạn.");
      setAssignmentsLoading(false);
      return;
    }

    try {
      const result = await academicRequest<{ assignments: Assignment[] }>(
        `/api/assignments?classId=${encodeURIComponent(id)}`,
        session.access_token,
      );
      setAssignments(result.assignments);
    } catch (requestError) {
      setAssignmentError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải bài tập.",
      );
    } finally {
      setAssignmentsLoading(false);
    }
  }, [id, session]);

  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => void loadAssignments(), 0);
    return () => clearTimeout(timer);
  }, [item, loadAssignments]);

  if (loading) return <ScreenState busy message="Đang tải lớp học…" />;
  if (!isAuthorized) return <Redirect href="/" />;
  if (!item) {
    return (
      <ScreenState message="Không tìm thấy lớp học hoặc bạn không có quyền truy cập." />
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={2} style={styles.code}>
          {item.code}
        </Text>
        <Text maxFontSizeMultiplier={2} style={styles.title}>
          {item.name}
        </Text>
        <Text maxFontSizeMultiplier={2} style={styles.tenant}>
          {membership?.tenantName}
        </Text>
        <View style={styles.rule} />

        <Text maxFontSizeMultiplier={2} style={styles.sectionTitle}>
          Bài tập đã công bố
        </Text>
        {assignmentsLoading ? (
          <ScreenState busy message="Đang tải bài tập…" />
        ) : assignmentError ? (
          <ScreenState
            message={assignmentError}
            onAction={() => void loadAssignments()}
          />
        ) : assignments.length === 0 ? (
          <View accessibilityLiveRegion="polite" style={styles.empty}>
            <Text maxFontSizeMultiplier={2} style={styles.emptyText}>
              Chưa có bài tập nào được công bố.
            </Text>
          </View>
        ) : (
          assignments.map((assignment) => {
            const dueText = assignment.dueAt
              ? `Hạn ${new Intl.DateTimeFormat("vi-VN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(assignment.dueAt))}`
              : "Không đặt hạn nộp";

            return (
              <Pressable
                accessibilityHint="Mở chi tiết và trạng thái nộp bài"
                accessibilityLabel={`${assignment.title}. Đã công bố. ${dueText}`}
                accessibilityRole="button"
                key={assignment.id}
                onPress={() => router.push(`/assignment/${assignment.id}`)}
                style={({ pressed }) => [
                  styles.assignment,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.assignmentCopy}>
                  <Text
                    maxFontSizeMultiplier={2}
                    style={styles.assignmentTitle}
                  >
                    {assignment.title}
                  </Text>
                  <Text maxFontSizeMultiplier={2} style={styles.due}>
                    {dueText}
                  </Text>
                </View>
                <Text
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  style={styles.chevron}
                >
                  ›
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.paper, flex: 1 },
  content: { flexGrow: 1, padding: 24 },
  code: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.2,
    lineHeight: 20,
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 42,
    marginTop: 8,
  },
  tenant: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 10,
  },
  rule: {
    backgroundColor: colors.yellow,
    height: 4,
    marginBottom: 28,
    marginTop: 28,
    width: 72,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 31,
    marginBottom: 14,
  },
  assignment: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 16,
    minHeight: 92,
    paddingVertical: 16,
  },
  pressed: { backgroundColor: colors.mist },
  assignmentCopy: { flex: 1, gap: 6 },
  assignmentTitle: {
    color: colors.blue,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 25,
  },
  due: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  chevron: { color: colors.red, fontSize: 34, lineHeight: 38 },
  empty: {
    backgroundColor: colors.mist,
    borderLeftColor: colors.blue,
    borderLeftWidth: 4,
    padding: 18,
  },
  emptyText: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
