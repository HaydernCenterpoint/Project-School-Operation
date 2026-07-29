import type {
  CommunityMessage,
  CommunitySpace,
  CommunitySpaceKind,
} from "@sao-do/contracts";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
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
import { useAppData } from "@/lib/AppData";
import { createIdempotencyKey } from "@/lib/academicApi";
import {
  createCommunityMessage,
  leaveCommunitySpace,
  listCommunityMessages,
  listCommunitySpaces,
  reportCommunityMessage,
  setCommunityMute,
  setCommunityReaction,
  setCommunityUserBlock,
} from "@/lib/communityApi";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

type RealtimeState = "connecting" | "connected" | "disconnected";

const kindLabels: Record<CommunitySpaceKind, string> = {
  school: "Toàn trường",
  class: "Lớp học",
  club: "Câu lạc bộ",
};
const aiMentionPattern = /(^|\s)@ai\b/i;
const byCreatedAt = (left: CommunityMessage, right: CommunityMessage) =>
  new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function CommunityConversationScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { isAuthorized, session } = useAppData();
  const [space, setSpace] = useState<CommunitySpace | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [realtimeState, setRealtimeState] =
    useState<RealtimeState>("connecting");
  const [reconnectKey, setReconnectKey] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const loadGenerationRef = useRef(0);
  const pendingMessageRef = useRef<{ key: string; payload: string } | null>(
    null,
  );
  const id = params.id;
  const kind = space?.kind ?? "school";
  const canLeave = space?.canLeave === true && kind === "club";
  const canPost = space?.canPost === true;
  const muted = space?.muted === true;

  useEffect(() => {
    pendingMessageRef.current = null;
    loadGenerationRef.current += 1;
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [id, session?.user.id]);

  const load = useCallback(
    async (quiet = false) => {
      if (!id) return;
      const generation = loadGenerationRef.current + 1;
      loadGenerationRef.current = generation;
      if (!quiet) setLoading(true);
      setError("");
      if (!session) {
        setError("Phiên đăng nhập đã hết hạn.");
        setLoading(false);
        return;
      }
      try {
        const spacesResult = await listCommunitySpaces(session.access_token);
        if (generation !== loadGenerationRef.current) return;
        const currentSpace =
          spacesResult.spaces.find((candidate) => candidate.id === id) ?? null;
        if (!currentSpace) {
          setSpace(null);
          setMessages([]);
          setError(
            "Không tìm thấy kênh cộng đồng hoặc bạn không có quyền truy cập.",
          );
          return;
        }
        setSpace(currentSpace);
        const messagesResult = await listCommunityMessages(
          id,
          session.access_token,
        );
        if (generation !== loadGenerationRef.current) return;
        setMessages([...messagesResult.messages].sort(byCreatedAt));
      } catch (requestError) {
        if (generation !== loadGenerationRef.current) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể tải tin nhắn.",
        );
      } finally {
        if (generation === loadGenerationRef.current) setLoading(false);
      }
    },
    [id, session],
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const realtimeClient = supabase;
    if (!id || !realtimeClient) return;
    const channel = realtimeClient
      .channel(`community:${id}:${reconnectKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `space_id=eq.${id}`,
          schema: "public",
          table: "community_messages",
        },
        () => void load(true),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeState("connected");
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          setRealtimeState("disconnected");
        }
      });
    return () => {
      void realtimeClient.removeChannel(channel);
    };
  }, [id, load, reconnectKey]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void load(true);
      if (realtimeState === "disconnected") {
        setReconnectKey((value) => value + 1);
      }
    });
    return () => subscription.remove();
  }, [load, realtimeState]);

  useEffect(() => {
    if (!id || !session) return;
    const timer = setInterval(() => void load(true), 15_000);
    return () => clearInterval(timer);
  }, [id, load, session]);

  const visibleMessages = useMemo(
    () => messages.filter((message) => !message.hidden),
    [messages],
  );

  function setFeedback(nextError = "", nextNotice = "") {
    setError(nextError);
    setNotice(nextNotice);
  }

  async function sendMessage() {
    const trimmed = text.trim();
    setFeedback();
    if (!trimmed || trimmed.length > 4_000) {
      setError("Tin nhắn phải có từ 1 đến 4.000 ký tự.");
      return;
    }
    if (aiMentionPattern.test(trimmed)) {
      setError("AI đang tắt. @AI không gửi nội dung tới nhà cung cấp AI.");
      return;
    }
    if (!session || !id) {
      setError("Phiên đăng nhập đã hết hạn.");
      return;
    }
    setSubmitting(true);
    try {
      const input = {
        privacyWarningConfirmed: privacyConfirmed,
        replyToId: replyTo?.id ?? null,
        text: trimmed,
      };
      const payload = JSON.stringify(input);
      if (pendingMessageRef.current?.payload !== payload) {
        pendingMessageRef.current = {
          key: createIdempotencyKey(),
          payload,
        };
      }
      const result = await createCommunityMessage(
        id,
        session.access_token,
        pendingMessageRef.current.key,
        input,
      );
      loadGenerationRef.current += 1;
      setMessages((current) =>
        [
          ...current.filter((item) => item.id !== result.message.id),
          result.message,
        ].sort(byCreatedAt),
      );
      setText("");
      setReplyTo(null);
      setPrivacyConfirmed(false);
      pendingMessageRef.current = null;
      setNotice("Đã gửi tin nhắn.");
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể gửi tin nhắn. Nội dung vẫn được giữ để bạn thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleReaction(message: CommunityMessage) {
    if (!session) return;
    setPendingAction(`reaction:${message.id}`);
    setFeedback();
    try {
      const result = await setCommunityReaction(
        message.id,
        session.access_token,
        !message.reaction.reactedByMe,
      );
      loadGenerationRef.current += 1;
      setMessages((current) =>
        current.map((item) => {
          if (item.id !== message.id) return item;
          const delta =
            result.active === item.reaction.reactedByMe
              ? 0
              : result.active
                ? 1
                : -1;
          return {
            ...item,
            reaction: {
              ...item.reaction,
              count: Math.max(0, item.reaction.count + delta),
              reactedByMe: result.active,
            },
          };
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể cập nhật phản ứng.",
      );
    } finally {
      setPendingAction("");
    }
  }

  async function submitReport(message: CommunityMessage) {
    if (!session) return;
    setPendingAction(`report:${message.id}`);
    setFeedback();
    try {
      await reportCommunityMessage(message.id, session.access_token);
      loadGenerationRef.current += 1;
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
                ...item,
                report: {
                  ...item.report,
                  count: item.report.reportedByMe
                    ? item.report.count
                    : item.report.count + 1,
                  reportedByMe: true,
                },
              }
            : item,
        ),
      );
      setNotice("Đã gửi báo cáo tới đội ngũ kiểm duyệt.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể gửi báo cáo.",
      );
    } finally {
      setPendingAction("");
    }
  }

  function confirmReport(message: CommunityMessage) {
    Alert.alert(
      "Báo cáo tin nhắn",
      "Báo cáo này sẽ được gửi cho đội ngũ kiểm duyệt của trường.",
      [
        { style: "cancel", text: "Hủy" },
        {
          onPress: () => void submitReport(message),
          style: "destructive",
          text: "Gửi báo cáo",
        },
      ],
    );
  }

  async function toggleBlock(message: CommunityMessage) {
    if (!session) return;
    setPendingAction(`block:${message.author.id}`);
    setFeedback();
    try {
      const result = await setCommunityUserBlock(
        message.author.id,
        session.access_token,
        !message.author.blockedByMe,
      );
      loadGenerationRef.current += 1;
      setMessages((current) =>
        current.map((item) =>
          item.author.id === message.author.id
            ? {
                ...item,
                author: { ...item.author, blockedByMe: result.active },
              }
            : item,
        ),
      );
      setNotice(result.active ? "Đã chặn người dùng." : "Đã bỏ chặn người dùng.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể cập nhật trạng thái chặn.",
      );
    } finally {
      setPendingAction("");
    }
  }

  function confirmBlock(message: CommunityMessage) {
    const blocked = message.author.blockedByMe;
    Alert.alert(
      blocked ? "Bỏ chặn người dùng" : "Chặn người dùng",
      `Bạn có chắc muốn ${blocked ? "bỏ chặn" : "chặn"} ${message.author.displayName}?`,
      [
        { style: "cancel", text: "Hủy" },
        {
          onPress: () => void toggleBlock(message),
          style: blocked ? "default" : "destructive",
          text: blocked ? "Bỏ chặn" : "Chặn",
        },
      ],
    );
  }

  async function toggleMute() {
    if (!session || !id) return;
    setPendingAction("mute");
    setFeedback();
    try {
      const result = await setCommunityMute(id, session.access_token, !muted);
      loadGenerationRef.current += 1;
      setSpace((current) =>
        current ? { ...current, muted: result.active } : current,
      );
      setNotice(
        result.active
          ? "Đã tắt thông báo. Tin nhắn vẫn hiển thị."
          : "Đã bật thông báo.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể cập nhật thông báo.",
      );
    } finally {
      setPendingAction("");
    }
  }

  async function leaveClub() {
    if (!session || !id) return;
    setPendingAction("leave");
    setFeedback();
    try {
      await leaveCommunitySpace(id, session.access_token);
      loadGenerationRef.current += 1;
      router.replace("/(tabs)/community");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể rời câu lạc bộ.",
      );
      setPendingAction("");
    }
  }

  function confirmLeave() {
    Alert.alert(
      "Rời câu lạc bộ",
      "Bạn sẽ mất quyền truy cập kênh này cho tới khi được mời lại.",
      [
        { style: "cancel", text: "Hủy" },
        {
          onPress: () => void leaveClub(),
          style: "destructive",
          text: "Rời câu lạc bộ",
        },
      ],
    );
  }

  if (!isAuthorized) return <Redirect href="/" />;
  if (loading) return <ScreenState busy message="Đang tải tin nhắn…" />;
  if (error && messages.length === 0) {
    return <ScreenState message={error} onAction={() => void load()} />;
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.spaceHeader}>
          <Text maxFontSizeMultiplier={2} style={styles.spaceName}>
            {space?.name ?? "Cộng đồng"}
          </Text>
          <Text maxFontSizeMultiplier={2} style={styles.spaceMeta}>
            {`${kindLabels[kind]} · ${muted ? "Đã tắt thông báo" : "Đang nhận thông báo"}`}
          </Text>
          <View style={styles.headerActions}>
            <ActionButton
              busy={pendingAction === "mute"}
              label={muted ? "Bật thông báo" : "Tắt thông báo"}
              onPress={() => void toggleMute()}
            />
            {canLeave && (
              <ActionButton
                busy={pendingAction === "leave"}
                danger
                label="Rời câu lạc bộ"
                onPress={confirmLeave}
              />
            )}
          </View>
        </View>

        <ConnectionState
          onReconnect={() => {
            setRealtimeState("connecting");
            setReconnectKey((value) => value + 1);
            void load(true);
          }}
          state={realtimeState}
        />

        <ScrollView
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
          ref={scrollRef}
        >
          {visibleMessages.length === 0 ? (
            <View accessibilityLiveRegion="polite" style={styles.empty}>
              <Text maxFontSizeMultiplier={2} style={styles.emptyText}>
                Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện bằng văn bản.
              </Text>
            </View>
          ) : (
            visibleMessages.map((message) => (
              <MessageCard
                canReply={canPost}
                currentUserId={session?.user.id}
                key={message.id}
                message={message}
                onBlock={() => confirmBlock(message)}
                onReact={() => void toggleReaction(message)}
                onReply={() => {
                  pendingMessageRef.current = null;
                  setReplyTo(message);
                }}
                onReport={() => confirmReport(message)}
                pendingAction={pendingAction}
              />
            ))
          )}
        </ScrollView>

        {!canPost ? (
          <View accessibilityLiveRegion="polite" style={styles.readOnly}>
            <Text maxFontSizeMultiplier={2} style={styles.readOnlyTitle}>
              Kênh chỉ đọc
            </Text>
            <Text maxFontSizeMultiplier={2} style={styles.readOnlyText}>
              Bạn có thể đọc nội dung nhưng không có quyền gửi hoặc trả lời tin
              nhắn trong kênh này.
            </Text>
          </View>
        ) : (
        <View style={styles.composer}>
          {replyTo && (
            <View style={styles.replyingTo}>
              <Text maxFontSizeMultiplier={2} style={styles.replyingText}>
                {`Đang trả lời ${replyTo.author.displayName}`}
              </Text>
              <ActionButton
                label="Hủy"
                onPress={() => {
                  pendingMessageRef.current = null;
                  setReplyTo(null);
                }}
                small
              />
            </View>
          )}
          {!!notice && (
            <Text
              accessibilityLiveRegion="polite"
              maxFontSizeMultiplier={2}
              style={styles.notice}
            >
              {notice}
            </Text>
          )}
          {!!error && (
            <Text
              accessibilityLiveRegion="assertive"
              maxFontSizeMultiplier={2}
              style={styles.error}
            >
              {error}
            </Text>
          )}
          <TextInput
            accessibilityLabel="Nội dung tin nhắn"
            maxFontSizeMultiplier={2}
            maxLength={4_000}
            multiline
            onChangeText={(value) => {
              pendingMessageRef.current = null;
              setText(value);
            }}
            placeholder="Nhập tin nhắn văn bản…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            textAlignVertical="top"
            value={text}
          />
          <Text maxFontSizeMultiplier={2} style={styles.counter}>
            {`${text.length.toLocaleString("vi-VN")}/4.000 ký tự`}
          </Text>
          <Pressable
            accessibilityLabel="Xác nhận đã kiểm tra thông tin riêng tư"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: privacyConfirmed }}
            onPress={() => {
              pendingMessageRef.current = null;
              setPrivacyConfirmed((value) => !value);
            }}
            style={({ pressed }) => [
              styles.privacyCheck,
              pressed && styles.pressed,
            ]}
          >
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[
                styles.checkbox,
                privacyConfirmed && styles.checkboxChecked,
              ]}
            />
            <Text maxFontSizeMultiplier={2} style={styles.privacyText}>
              Tôi đã kiểm tra và chấp nhận gửi thông tin riêng tư có trong tin
              nhắn này.
            </Text>
          </Pressable>
          <Text maxFontSizeMultiplier={2} style={styles.aiNotice}>
            AI đang tắt. Nội dung @AI sẽ không được gửi.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: submitting, disabled: submitting }}
            disabled={submitting}
            onPress={() => void sendMessage()}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.pressed,
              submitting && styles.disabled,
            ]}
          >
            <Text maxFontSizeMultiplier={2} style={styles.sendButtonText}>
              {submitting ? "Đang gửi…" : "Gửi tin nhắn"}
            </Text>
          </Pressable>
        </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ActionButton({
  busy = false,
  checked,
  danger = false,
  disabled = false,
  label,
  onPress,
  small = false,
}: {
  busy?: boolean;
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, checked, disabled: busy || disabled }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        danger && styles.dangerButton,
        checked && styles.checkedButton,
        small && styles.smallButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        maxFontSizeMultiplier={2}
        style={[styles.actionButtonText, danger && styles.dangerButtonText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ConnectionState({
  onReconnect,
  state,
}: {
  onReconnect: () => void;
  state: RealtimeState;
}) {
  if (state !== "disconnected") {
    return (
      <Text
        accessibilityLiveRegion="polite"
        maxFontSizeMultiplier={2}
        style={styles.connectionStatus}
      >
        {state === "connected"
          ? "Đang cập nhật trực tiếp"
          : "Đang kết nối trực tiếp…"}
      </Text>
    );
  }
  return (
    <View accessibilityLiveRegion="polite" style={styles.connectionAlert}>
      <Text maxFontSizeMultiplier={2} style={styles.connectionText}>
        Kết nối trực tiếp đã gián đoạn. Bạn vẫn có thể tải lại tin nhắn.
      </Text>
      <ActionButton label="Kết nối lại" onPress={onReconnect} small />
    </View>
  );
}

function MessageCard({
  canReply,
  currentUserId,
  message,
  onBlock,
  onReact,
  onReply,
  onReport,
  pendingAction,
}: {
  canReply: boolean;
  currentUserId?: string;
  message: CommunityMessage;
  onBlock: () => void;
  onReact: () => void;
  onReply: () => void;
  onReport: () => void;
  pendingAction: string;
}) {
  const isOwn = message.author.id === currentUserId;
  const displayText = message.author.blockedByMe
    ? "Nội dung từ người dùng đã chặn."
    : message.text;
  return (
    <View
      accessibilityLabel={`${message.author.displayName}, ${formatTime(message.createdAt)}. ${displayText}`}
      style={[styles.message, isOwn && styles.ownMessage]}
    >
      <Text maxFontSizeMultiplier={2} style={styles.author}>
        {isOwn ? "Bạn" : message.author.displayName}
      </Text>
      <Text maxFontSizeMultiplier={2} style={styles.timestamp}>
        {formatTime(message.createdAt)}
      </Text>
      {message.replyTo && (
        <View style={styles.replyQuote}>
          <Text maxFontSizeMultiplier={2} style={styles.replyAuthor}>
            {`Trả lời ${message.replyTo.authorDisplayName}`}
          </Text>
          <Text
            maxFontSizeMultiplier={2}
            numberOfLines={3}
            style={styles.replyText}
          >
            {message.replyTo.text}
          </Text>
        </View>
      )}
      <Text maxFontSizeMultiplier={2} style={styles.messageText}>
        {displayText}
      </Text>
      <View style={styles.messageActions}>
        {canReply && (
          <ActionButton label="Trả lời" onPress={onReply} small />
        )}
        <ActionButton
          busy={pendingAction === `reaction:${message.id}`}
          checked={message.reaction.reactedByMe}
          label={`Thích ${message.reaction.count}`}
          onPress={onReact}
          small
        />
        {!isOwn && (
          <>
            <ActionButton
              busy={pendingAction === `report:${message.id}`}
              disabled={message.report.reportedByMe}
              label={message.report.reportedByMe ? "Đã báo cáo" : "Báo cáo"}
              onPress={onReport}
              small
            />
            <ActionButton
              busy={pendingAction === `block:${message.author.id}`}
              label={message.author.blockedByMe ? "Bỏ chặn" : "Chặn"}
              onPress={onBlock}
              small
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.paper, flex: 1 },
  flex: { flex: 1 },
  spaceHeader: {
    backgroundColor: colors.ink,
    gap: 5,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  spaceName: {
    color: colors.paper,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 33,
  },
  spaceMeta: {
    color: colors.yellow,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.muted,
    borderRadius: 7,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
  },
  dangerButton: { backgroundColor: colors.red, borderColor: colors.paper },
  dangerButtonText: { color: colors.paper },
  checkedButton: { backgroundColor: "#FFF8CF", borderColor: colors.blue },
  smallButton: { paddingHorizontal: 11 },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.58 },
  connectionStatus: {
    backgroundColor: colors.mist,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  connectionAlert: {
    alignItems: "center",
    backgroundColor: "#FFF8CF",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  connectionText: {
    color: colors.ink,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 20,
    minWidth: 190,
  },
  messages: { flexGrow: 1, gap: 14, padding: 18 },
  empty: {
    backgroundColor: colors.mist,
    borderLeftColor: colors.blue,
    borderLeftWidth: 4,
    padding: 18,
  },
  emptyText: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  message: {
    alignSelf: "stretch",
    backgroundColor: colors.mist,
    borderLeftColor: colors.blue,
    borderLeftWidth: 4,
    padding: 14,
  },
  ownMessage: { backgroundColor: "#FFF8CF", borderLeftColor: colors.red },
  author: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
  },
  timestamp: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  messageText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 25,
    marginTop: 10,
  },
  replyQuote: {
    borderLeftColor: colors.muted,
    borderLeftWidth: 3,
    marginTop: 10,
    paddingLeft: 10,
  },
  replyAuthor: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  replyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  messageActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  composer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: 12,
  },
  readOnly: {
    backgroundColor: "#FFF8CF",
    borderTopColor: colors.yellow,
    borderTopWidth: 4,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  readOnlyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 22,
  },
  readOnlyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 3,
  },
  replyingTo: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 8,
  },
  replyingText: {
    color: colors.blue,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  notice: {
    color: colors.blue,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  input: {
    borderColor: colors.muted,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    maxHeight: 130,
    minHeight: 70,
    padding: 12,
  },
  counter: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "right",
  },
  privacyCheck: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
    paddingVertical: 8,
  },
  checkbox: {
    borderColor: colors.muted,
    borderRadius: 3,
    borderWidth: 2,
    height: 22,
    marginTop: 1,
    width: 22,
  },
  checkboxChecked: { backgroundColor: colors.blue, borderColor: colors.blue },
  privacyText: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  aiNotice: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.red,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sendButtonText: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 23,
  },
});
