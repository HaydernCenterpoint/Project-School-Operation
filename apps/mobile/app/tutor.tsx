import type {
  AiTutorConsent,
  AiTutorResponse,
} from "@sao-do/contracts";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Image,
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
import {
  AcademicApiError,
  academicRequest,
  createIdempotencyKey,
} from "@/lib/academicApi";
import { useAppData } from "@/lib/AppData";
import { colors } from "@/lib/theme";

const maxQuestionLength = 2_000;

type Phase =
  | "idle"
  | "loading"
  | "answered"
  | "abstained"
  | "error"
  | "quota";

export default function TutorScreen() {
  const { classes, loading, membership, session } = useAppData();
  const token = session?.access_token ?? "";
  const [consent, setConsent] = useState<AiTutorConsent | null>(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentSaving, setConsentSaving] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(
    classes[0]?.id ?? "",
  );
  const [classSelectorOpen, setClassSelectorOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [validationError, setValidationError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AiTutorResponse | null>(null);
  const [requestError, setRequestError] = useState("");
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const contextVersion = useRef(0);
  const consentRequestVersion = useRef(0);
  const classContextKey = classes.map((item) => item.id).join("|");
  const contextClassId = classes[0]?.id ?? "";

  const loadConsent = useCallback(async () => {
    if (!token || membership?.role !== "student") return;
    const requestVersion = ++consentRequestVersion.current;
    setConsentLoading(true);
    setConsentError("");
    try {
      const value = await academicRequest<AiTutorConsent>(
        "/api/ai/consent",
        token,
      );
      if (requestVersion !== consentRequestVersion.current) return;
      setConsent(value);
    } catch {
      if (requestVersion !== consentRequestVersion.current) return;
      setConsent(null);
      setConsentError(
        "Chưa thể kiểm tra trạng thái Trợ giảng AI. Vui lòng thử lại sau.",
      );
    } finally {
      if (requestVersion === consentRequestVersion.current) {
        setConsentLoading(false);
      }
    }
  }, [membership?.role, token]);

  useEffect(() => {
    const nextContextVersion = contextVersion.current + 1;
    contextVersion.current = nextContextVersion;
    consentRequestVersion.current += 1;
    queueMicrotask(() => {
      if (contextVersion.current !== nextContextVersion) return;
      setConsent(null);
      setConsentLoading(true);
      setConsentSaving(false);
      setAgreementChecked(false);
      setConsentError("");
      setSelectedClassId(contextClassId);
      setClassSelectorOpen(false);
      setQuestion("");
      setValidationError("");
      setPhase("idle");
      setResult(null);
      setRequestError("");
      setDailyRemaining(null);
    });
  }, [
    classContextKey,
    contextClassId,
    membership?.tenantId,
    session?.user.id,
    token,
  ]);

  useEffect(() => {
    queueMicrotask(() => void loadConsent());
  }, [
    classContextKey,
    contextClassId,
    loadConsent,
    membership?.tenantId,
    session?.user.id,
  ]);

  useEffect(() => {
    if (
      phase === "answered" ||
      phase === "abstained" ||
      phase === "error" ||
      phase === "quota"
    ) {
      const announcement = {
        answered: "Đã nhận câu trả lời có nguồn.",
        abstained: "Chưa đủ tài liệu để trả lời.",
        error: "Chưa thể nhận câu trả lời.",
        quota: "Đã hết lượt hỏi hôm nay.",
      }[phase];
      void AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [phase]);

  if (loading) {
    return <ScreenState busy message="Đang tải Trợ giảng AI…" />;
  }
  if (membership?.role !== "student") {
    return <Redirect href="/(tabs)" />;
  }

  const effectiveClassId = classes.some(
    (item) => item.id === selectedClassId,
  )
    ? selectedClassId
    : (classes[0]?.id ?? "");
  const selectedClass =
    classes.find((item) => item.id === effectiveClassId) ?? null;
  const quotaExhausted = dailyRemaining === 0;
  const busy = phase === "loading";

  function resetResult() {
    setPhase("idle");
    setResult(null);
    setRequestError("");
    setValidationError("");
  }

  async function updateConsent(granted: boolean) {
    if (!consent) return;
    const requestContextVersion = contextVersion.current;
    setConsentSaving(true);
    setConsentError("");
    try {
      const value = await academicRequest<AiTutorConsent>(
        "/api/ai/consent",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            granted,
            policyVersion: consent.currentPolicyVersion,
          }),
        },
      );
      if (requestContextVersion !== contextVersion.current) return;
      setConsent(value);
      setAgreementChecked(false);
      setQuestion("");
      setDailyRemaining(null);
      resetResult();
    } catch (error) {
      if (requestContextVersion !== contextVersion.current) return;
      if (
        error instanceof AcademicApiError &&
        error.code === "policy_changed"
      ) {
        await loadConsent();
        if (requestContextVersion !== contextVersion.current) return;
        setConsentError(
          "Chính sách đã thay đổi. Hãy đọc lại thông tin trước khi đồng ý.",
        );
      } else {
        setConsentError(
          granted
            ? "Chưa thể lưu đồng ý. Vui lòng thử lại."
            : "Chưa thể rút lại đồng ý. Vui lòng thử lại.",
        );
      }
    } finally {
      if (requestContextVersion === contextVersion.current) {
        setConsentSaving(false);
      }
    }
  }

  async function askTutor() {
    const requestContextVersion = contextVersion.current;
    const trimmedQuestion = question.trim();
    if (!effectiveClassId) {
      setValidationError("Hãy chọn một lớp học.");
      return;
    }
    if (!trimmedQuestion) {
      setValidationError("Hãy nhập câu hỏi.");
      return;
    }
    if (trimmedQuestion.length > maxQuestionLength) {
      setValidationError("Câu hỏi không được vượt quá 2.000 ký tự.");
      return;
    }

    setValidationError("");
    setRequestError("");
    setResult(null);
    setClassSelectorOpen(false);
    setPhase("loading");
    try {
      const value = await academicRequest<AiTutorResponse>(
        "/api/ai/tutor",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            requestId: createIdempotencyKey(),
            classId: effectiveClassId,
            question: trimmedQuestion,
          }),
        },
      );
      if (requestContextVersion !== contextVersion.current) return;
      setResult(value);
      setDailyRemaining(value.dailyRemaining);
      setPhase(value.status);
    } catch (error) {
      if (requestContextVersion !== contextVersion.current) return;
      if (error instanceof AcademicApiError) {
        if (error.code === "consent_required") {
          await loadConsent();
          if (requestContextVersion !== contextVersion.current) return;
          setConsentError(
            "Bạn cần đồng ý theo chính sách hiện hành trước khi đặt câu hỏi.",
          );
          setPhase("idle");
          return;
        }
        if (error.code === "quota_exceeded") {
          setDailyRemaining(0);
          setPhase("quota");
          return;
        }
        if (error.code === "ai_unavailable") {
          setConsent((current) =>
            current ? { ...current, tutorEnabled: false } : current,
          );
          void AccessibilityInfo.announceForAccessibility(
            "Trợ giảng AI đang tạm dừng. Tính năng này hiện chưa được trường bật.",
          );
          setPhase("idle");
          return;
        }
      }
      setRequestError(
        "Câu hỏi vẫn được giữ để bạn kiểm tra và gửi lại.",
      );
      setPhase("error");
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <Image
              accessibilityIgnoresInvertColors
              accessible
              accessibilityLabel="Biểu trưng Đại học Sao Đỏ"
              source={require("@/assets/sao-do-logo.png")}
              style={styles.logo}
            />
            <View style={styles.introCopy}>
              <Text maxFontSizeMultiplier={2} style={styles.title}>
                Trợ giảng AI
              </Text>
              <Text maxFontSizeMultiplier={2} style={styles.subtitle}>
                Câu trả lời dựa trên tài liệu của lớp học
              </Text>
            </View>
          </View>

          {dailyRemaining !== null && (
            <Text
              accessibilityLiveRegion="polite"
              maxFontSizeMultiplier={2}
              style={styles.quota}
            >
              Còn {dailyRemaining} lượt hôm nay
            </Text>
          )}

          {consentLoading ? (
            <View accessibilityLiveRegion="polite" style={styles.statePanel}>
              <ActivityIndicator color={colors.blue} size="large" />
              <Text maxFontSizeMultiplier={2} style={styles.stateTitle}>
                Đang kiểm tra quyền sử dụng…
              </Text>
            </View>
          ) : !consent ? (
            <View style={[styles.statePanel, styles.yellowKeyline]}>
              <Text maxFontSizeMultiplier={2} style={styles.stateTitle}>
                Trợ giảng AI đang tạm dừng
              </Text>
              <Text maxFontSizeMultiplier={2} style={styles.stateCopy}>
                {consentError}
              </Text>
              <SecondaryAction
                disabled={consentLoading}
                label="Kiểm tra lại"
                onPress={() => void loadConsent()}
              />
            </View>
          ) : !consent.tutorEnabled ? (
            <View
              style={[styles.statePanel, styles.yellowKeyline]}
            >
              <View
                accessibilityLabel="Trợ giảng AI đang tạm dừng. Tính năng này hiện chưa được trường bật."
                accessibilityLiveRegion="assertive"
                accessible
                style={styles.stateAnnouncement}
              >
                <Text maxFontSizeMultiplier={2} style={styles.stateTitle}>
                  Trợ giảng AI đang tạm dừng
                </Text>
                <Text maxFontSizeMultiplier={2} style={styles.stateCopy}>
                  Tính năng này hiện chưa được trường bật.
                </Text>
              </View>
              {consent.granted && (
                <SecondaryAction
                  disabled={consentSaving}
                  label={
                    consentSaving ? "Đang cập nhật…" : "Rút lại đồng ý"
                  }
                  onPress={() => void updateConsent(false)}
                />
              )}
            </View>
          ) : !consent.granted ? (
            <View style={styles.consentPanel}>
              <Text maxFontSizeMultiplier={2} style={styles.panelTitle}>
                Trước khi bắt đầu
              </Text>
              <Text maxFontSizeMultiplier={2} style={styles.bodyCopy}>
                Trợ giảng AI gửi câu hỏi và phần tài liệu liên quan tới dịch
                vụ AI được trường phê duyệt. Không nhập thông tin cá nhân hoặc
                dữ liệu nhạy cảm.
              </Text>
              <Text maxFontSizeMultiplier={2} style={styles.policyVersion}>
                Phiên bản chính sách: {consent.currentPolicyVersion}
              </Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreementChecked }}
                onPress={() => setAgreementChecked((value) => !value)}
                style={({ pressed }) => [
                  styles.consentCheck,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    agreementChecked && styles.checkboxChecked,
                  ]}
                />
                <Text maxFontSizeMultiplier={2} style={styles.checkLabel}>
                  Tôi đồng ý sử dụng dữ liệu này để nhận câu trả lời.
                </Text>
              </Pressable>
              {!!consentError && (
                <Text
                  accessibilityLiveRegion="polite"
                  maxFontSizeMultiplier={2}
                  style={styles.error}
                >
                  {consentError}
                </Text>
              )}
              <PrimaryAction
                busy={consentSaving}
                disabled={!agreementChecked || consentSaving}
                label={
                  consentSaving ? "Đang lưu đồng ý…" : "Đồng ý và tiếp tục"
                }
                onPress={() => void updateConsent(true)}
              />
            </View>
          ) : !classes.length ? (
            <View style={styles.statePanel}>
              <Text maxFontSizeMultiplier={2} style={styles.stateTitle}>
                Bạn cần được phân quyền ít nhất một lớp để dùng Trợ giảng AI.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.consentSummary}>
                <Text maxFontSizeMultiplier={2} style={styles.consentSummaryText}>
                  Đã đồng ý theo chính sách {consent.currentPolicyVersion}
                </Text>
                <SecondaryAction
                  disabled={consentSaving || busy}
                  label={
                    consentSaving ? "Đang cập nhật…" : "Rút lại đồng ý"
                  }
                  onPress={() => void updateConsent(false)}
                />
              </View>

              <View style={styles.form}>
                <Text maxFontSizeMultiplier={2} style={styles.fieldLabel}>
                  Lớp học
                </Text>
                <Pressable
                  accessibilityLabel={`Lớp học, ${selectedClass?.name ?? "chưa chọn"}`}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: busy || quotaExhausted,
                    expanded: classSelectorOpen,
                  }}
                  disabled={busy || quotaExhausted}
                  onPress={() => setClassSelectorOpen((value) => !value)}
                  style={({ pressed }) => [
                    styles.classTrigger,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text maxFontSizeMultiplier={2} style={styles.classTriggerText}>
                    {selectedClass?.name ?? "Chọn lớp học"}
                  </Text>
                  <Text
                    accessible={false}
                    maxFontSizeMultiplier={2}
                    style={styles.classTriggerHint}
                  >
                    {classSelectorOpen ? "Đóng" : "Chọn"}
                  </Text>
                </Pressable>
                {classSelectorOpen && (
                  <View
                    accessibilityRole="radiogroup"
                    style={styles.classOptions}
                  >
                    {classes.map((item) => {
                      const selected = item.id === effectiveClassId;
                      return (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                          key={item.id}
                          onPress={() => {
                            setSelectedClassId(item.id);
                            setClassSelectorOpen(false);
                            setQuestion("");
                            resetResult();
                          }}
                          style={({ pressed }) => [
                            styles.classOption,
                            selected && styles.classOptionSelected,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            maxFontSizeMultiplier={2}
                            style={[
                              styles.classOptionText,
                              selected && styles.classOptionTextSelected,
                            ]}
                          >
                            {item.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <Text maxFontSizeMultiplier={2} style={styles.fieldLabel}>
                  Câu hỏi
                </Text>
                <TextInput
                  accessibilityLabel="Câu hỏi"
                  accessibilityState={{ disabled: busy || quotaExhausted }}
                  editable={!busy && !quotaExhausted}
                  maxFontSizeMultiplier={2}
                  maxLength={maxQuestionLength}
                  multiline
                  onChangeText={(value) => {
                    setQuestion(value);
                    setValidationError("");
                  }}
                  placeholder="Ví dụ: Vì sao chuẩn hoá dữ liệu giúp giảm dư thừa?"
                  placeholderTextColor={colors.muted}
                  style={styles.questionInput}
                  textAlignVertical="top"
                  value={question}
                />
                <View style={styles.questionMeta}>
                  <Text maxFontSizeMultiplier={2} style={styles.helper}>
                    Chỉ trả lời từ tài liệu của lớp đã chọn.
                  </Text>
                  <Text maxFontSizeMultiplier={2} style={styles.count}>
                    {question.length}/{maxQuestionLength}
                  </Text>
                </View>
                {!!validationError && (
                  <Text
                    accessibilityLiveRegion="polite"
                    maxFontSizeMultiplier={2}
                    style={styles.error}
                  >
                    {validationError}
                  </Text>
                )}

                {quotaExhausted ? (
                  <View style={[styles.statePanel, styles.yellowKeyline]}>
                    <Text maxFontSizeMultiplier={2} style={styles.stateTitle}>
                      Đã hết lượt hỏi hôm nay
                    </Text>
                    <Text maxFontSizeMultiplier={2} style={styles.stateCopy}>
                      Bạn chưa thể gửi thêm câu hỏi theo hạn mức của trường.
                    </Text>
                  </View>
                ) : (
                  <PrimaryAction
                    busy={busy}
                    disabled={busy}
                    label={
                      busy
                        ? "Đang tìm trong tài liệu lớp…"
                        : "Hỏi Trợ giảng AI"
                    }
                    onPress={() => void askTutor()}
                  />
                )}
              </View>

              <View
                accessibilityLiveRegion="polite"
                style={[
                  styles.output,
                  (phase === "abstained" || phase === "quota") &&
                    styles.yellowKeyline,
                  phase === "error" && styles.errorKeyline,
                ]}
              >
                {phase === "idle" && (
                  <>
                    <Text maxFontSizeMultiplier={2} style={styles.outputTitle}>
                      Câu trả lời có nguồn sẽ xuất hiện tại đây.
                    </Text>
                    <Text maxFontSizeMultiplier={2} style={styles.stateCopy}>
                      Hãy chọn lớp và đặt một câu hỏi cụ thể.
                    </Text>
                  </>
                )}
                {phase === "loading" && (
                  <>
                    <ActivityIndicator color={colors.blue} size="large" />
                    <Text maxFontSizeMultiplier={2} style={styles.outputTitle}>
                      Đang tìm trong tài liệu lớp…
                    </Text>
                  </>
                )}
                {phase === "answered" && result?.answer && (
                  <>
                    <Text maxFontSizeMultiplier={2} style={styles.outputTitle}>
                      Câu trả lời
                    </Text>
                    <Text selectable maxFontSizeMultiplier={2} style={styles.answer}>
                      {result.answer}
                    </Text>
                    <Text maxFontSizeMultiplier={2} style={styles.sourceHeading}>
                      Nguồn đã sử dụng
                    </Text>
                    <View style={styles.citations}>
                      {result.citations.map((citation, index) => (
                        <View key={citation.id} style={styles.citationRow}>
                          <Text
                            maxFontSizeMultiplier={2}
                            style={styles.citationTitle}
                          >
                            {index + 1}. {citation.title}
                          </Text>
                          <Text
                            maxFontSizeMultiplier={2}
                            style={styles.sourceMeta}
                          >
                            {citation.sourceName}
                            {citation.pageNumber
                              ? ` · Trang ${citation.pageNumber}`
                              : ""}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
                {phase === "abstained" && (
                  <>
                    <Text maxFontSizeMultiplier={2} style={styles.outputTitle}>
                      Chưa đủ tài liệu để trả lời
                    </Text>
                    <Text maxFontSizeMultiplier={2} style={styles.stateCopy}>
                      Tài liệu của lớp chưa có đủ thông tin cho câu hỏi này. Hãy
                      hỏi cụ thể hơn hoặc trao đổi với giảng viên.
                    </Text>
                  </>
                )}
                {phase === "error" && (
                  <>
                    <Text maxFontSizeMultiplier={2} style={styles.outputTitle}>
                      Chưa thể nhận câu trả lời
                    </Text>
                    <Text maxFontSizeMultiplier={2} style={styles.stateCopy}>
                      {requestError}
                    </Text>
                  </>
                )}
                {phase === "quota" && (
                  <>
                    <Text maxFontSizeMultiplier={2} style={styles.outputTitle}>
                      Đã hết lượt hỏi hôm nay
                    </Text>
                    <Text maxFontSizeMultiplier={2} style={styles.stateCopy}>
                      Bạn chưa thể gửi thêm câu hỏi theo hạn mức của trường.
                    </Text>
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrimaryAction({
  busy,
  disabled,
  label,
  onPress,
}: {
  busy: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {busy && <ActivityIndicator color={colors.paper} size="small" />}
      <Text maxFontSizeMultiplier={2} style={styles.primaryButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}

function SecondaryAction({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text maxFontSizeMultiplier={2} style={styles.secondaryButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    alignSelf: "center",
    gap: 18,
    maxWidth: 760,
    paddingBottom: 42,
    width: "100%",
  },
  intro: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderBottomColor: colors.yellow,
    borderBottomWidth: 4,
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 22,
  },
  logo: {
    height: 76,
    resizeMode: "contain",
    width: 76,
  },
  introCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.paper,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 39,
  },
  subtitle: {
    color: colors.yellow,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  quota: {
    alignSelf: "flex-start",
    borderLeftColor: colors.yellow,
    borderLeftWidth: 4,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
    marginHorizontal: 20,
    paddingLeft: 10,
  },
  statePanel: {
    alignItems: "flex-start",
    backgroundColor: colors.mist,
    borderColor: colors.border,
    borderLeftColor: colors.blue,
    borderLeftWidth: 4,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 20,
    padding: 18,
  },
  stateAnnouncement: {
    alignItems: "flex-start",
    gap: 10,
  },
  yellowKeyline: {
    borderLeftColor: colors.yellow,
  },
  errorKeyline: {
    borderLeftColor: colors.danger,
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 25,
  },
  stateCopy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  consentPanel: {
    backgroundColor: colors.mist,
    borderColor: colors.border,
    borderLeftColor: colors.yellow,
    borderLeftWidth: 4,
    borderWidth: 1,
    gap: 15,
    marginHorizontal: 20,
    padding: 18,
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  bodyCopy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  policyVersion: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  consentCheck: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.border,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 54,
    padding: 12,
  },
  checkbox: {
    borderColor: colors.blue,
    borderRadius: 3,
    borderWidth: 2,
    height: 22,
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
    borderWidth: 6,
  },
  checkLabel: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  consentSummary: {
    alignItems: "flex-start",
    backgroundColor: "#FFFBEA",
    borderLeftColor: colors.yellow,
    borderLeftWidth: 4,
    gap: 8,
    marginHorizontal: 20,
    padding: 13,
  },
  consentSummaryText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  form: {
    backgroundColor: colors.mist,
    borderColor: colors.border,
    borderLeftColor: colors.red,
    borderLeftWidth: 4,
    borderWidth: 1,
    gap: 11,
    marginHorizontal: 20,
    padding: 18,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 3,
  },
  classTrigger: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.muted,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  classTriggerText: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 23,
  },
  classTriggerHint: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  classOptions: {
    borderColor: colors.border,
    borderWidth: 1,
  },
  classOption: {
    backgroundColor: colors.paper,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  classOptionSelected: {
    backgroundColor: colors.ink,
    borderLeftColor: colors.yellow,
    borderLeftWidth: 4,
  },
  classOptionText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  classOptionTextSelected: {
    color: colors.paper,
  },
  questionInput: {
    backgroundColor: colors.paper,
    borderColor: colors.muted,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 148,
    padding: 13,
  },
  questionMeta: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  helper: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  count: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.red,
    borderRadius: 8,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: colors.paper,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "center",
  },
  secondaryButton: {
    borderBottomColor: colors.blue,
    borderBottomWidth: 2,
    minHeight: 44,
    paddingHorizontal: 2,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 21,
  },
  output: {
    alignItems: "flex-start",
    backgroundColor: colors.mist,
    borderColor: colors.border,
    borderLeftColor: colors.blue,
    borderLeftWidth: 4,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 20,
    minHeight: 210,
    padding: 18,
  },
  outputTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27,
  },
  answer: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 26,
  },
  sourceHeading: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 24,
    marginTop: 10,
  },
  citations: {
    width: "100%",
  },
  citationRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 3,
    paddingVertical: 12,
  },
  citationTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
  },
  sourceMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.82,
  },
});
