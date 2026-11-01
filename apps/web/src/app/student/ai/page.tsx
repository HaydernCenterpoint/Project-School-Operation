"use client";

/* eslint-disable @next/next/no-img-element -- small static logo */
import type { AiConversation, AiMessage, AiMode, AiStreamEvent, AiUsage } from "@sao-do/contracts";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/components/app-phuong.css";
import "@/components/ai-workspace.css";
import "@/app/landing.css";
import { useAiIntro } from "@/components/AiIntro";
import { SduEngineeringStudioModal } from "@/components/AiEngineeringWidgets";
import { SceneCurtain } from "@/components/landing/SceneTransition";
import { Icon, type IconName } from "@/components/Icon";
import { phuongFonts } from "@/components/landing/fonts";
import { Markdown } from "@/components/Markdown";
import { ensureVisualBlocksInAnswer } from "@/lib/ai-cad-chart-engine";
import { aiErrorMessage, aiRequest, AiRequestError, streamChat } from "@/lib/ai-client";
import { addFiles, filesFromDrop, formatSize, type Attachment } from "@/lib/ai-files";
import {
  addStudentMemoryFact,
  autoLearnFromUserMessage,
  buildComprehensiveStudentMemoryContext,
  extractAndSaveAiMemoryTags,
  MEMORY_CATEGORY_LABELS,
  type MemoryCategory,
  readStudentMemories,
  removeStudentMemoryFact,
  resetStudentMemoriesForCode,
  SDU_AI_MODEL_BADGE,
  SDU_AI_MODEL_DESC,
  SDU_AI_MODEL_NAME,
  STUDENT_DETAILED_PROFILES,
  type StudentMemoryFact,
  subscribeStudentMemories,
} from "@/lib/ai-student-memory";
import { greeting, initials } from "@/lib/format";
import { useStudent } from "@/lib/student-context";
import { usePhuongTheme } from "@/lib/theme";

const modes: { key: AiMode; label: string; icon: IconName; hint: string; suggestions: string[] }[] = [
  {
    key: "explain",
    label: "Giải thích",
    icon: "book",
    hint: "Hỏi Model SDU 1.3 về bất kỳ sinh viên nào, vẽ biểu đồ, vẽ chi tiết máy AutoCAD / 3D…",
    suggestions: [
      "Bạn là model AI gì, được train dữ liệu từ đâu và nhớ được những gì về mình?",
      "Vẽ chi tiết máy Bánh răng trụ răng thẳng Z24-M2.5, dựng mô hình 3D và xuất file AutoCAD (.DXF) + 3D (.STL)",
      "Vẽ biểu đồ so sánh GPA, điểm rèn luyện và chuyên cần của 6 sinh viên lớp DK13-CNTT1",
      "Cho mình biết đầy đủ thông tin cá nhân, gia đình, CCCD, BHYT, điểm số và đặc điểm học tập của mình",
    ],
  },
  {
    key: "summarize",
    label: "Tóm tắt",
    icon: "list",
    hint: "Hỏi tổng hợp hồ sơ từng sinh viên, bảng điểm, học phí, chuyên cần…",
    suggestions: [
      "Tổng hợp bảng so sánh đặc điểm, GPA, chuyên cần và thế mạnh của toàn bộ sinh viên lớp DK13-CNTT1",
      "Tổng hợp kết quả học tập (GPA), tiến độ tín chỉ, biên lai học phí và lịch thi của mình",
    ],
  },
  {
    key: "practice",
    label: "Luyện tập",
    icon: "question",
    hint: "Nhập chủ đề hoặc mã học phần muốn luyện tập cá nhân hóa theo năng lực…",
    suggestions: [
      "Dựa trên điểm mạnh và điểm yếu trong bộ nhớ của mình, hãy ra 5 câu hỏi ôn tập phù hợp nhất",
      "Đố 3 bài toán tự lượng giá về Lập trình hướng đối tượng (IT3040) và Cơ sở dữ liệu (IT3090)",
    ],
  },
  {
    key: "plan",
    label: "Lập kế hoạch",
    icon: "calendar",
    hint: "Mô tả mục tiêu ôn thi hoặc định hướng cá nhân để AI ghi nhớ và lập lộ trình…",
    suggestions: [
      "Hãy nhớ giúp mình: mục tiêu của mình là đạt GPA 3.6 kỳ này và thực tập vị trí AI Engineer, lập lộ trình giúp mình",
      "Lập kế hoạch ôn thi giữa kỳ và cuối kỳ cá nhân hóa dựa trên lịch thi và các môn mình còn yếu",
    ],
  },
];

const consentKey = "sao-do:ai-consent";
const sideKey = "sao-do:ai-side-collapsed";
const localThreadsKey = "sao-do:ai-threads:v2";
const localUsageKey = "sao-do:ai-usage:v1";

type StoredThread = {
  conversation: AiConversation;
  messages: AiMessage[];
};

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Preference only.
  }
}

function readLocalThreads(): StoredThread[] {
  try {
    const raw = localStorage.getItem(localThreadsKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredThread[]) : [];
  } catch {
    return [];
  }
}

function writeLocalThreads(threads: StoredThread[]) {
  try {
    localStorage.setItem(localThreadsKey, JSON.stringify(threads.slice(0, 60)));
  } catch {
    // Storage quota or private browsing.
  }
}

function readLocalUsageCount(): number {
  try {
    const todayKey = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(localUsageKey);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date?: string; used?: number };
    return parsed.date === todayKey && typeof parsed.used === "number" ? parsed.used : 0;
  } catch {
    return 0;
  }
}

function incrementLocalUsageCount(): number {
  const next = readLocalUsageCount() + 1;
  try {
    const todayKey = new Date().toISOString().slice(0, 10);
    localStorage.setItem(localUsageKey, JSON.stringify({ date: todayKey, used: next }));
  } catch {
    // Ignore storage error.
  }
  return next;
}

/** Sidebar groups by last activity, like most chat apps: today, the past week, older. */
function groupByRecency(items: AiConversation[], now: number) {
  const day = 24 * 3600 * 1000;
  const groups: { label: string; items: AiConversation[] }[] = [
    { label: "Hôm nay", items: [] },
    { label: "7 ngày qua", items: [] },
    { label: "Trước đó", items: [] },
  ];
  for (const item of items) {
    const age = now - Date.parse(item.updatedAt);
    groups[age < day ? 0 : age < 7 * day ? 1 : 2]!.items.push(item);
  }
  return groups.filter((group) => group.items.length);
}

type Message = AiMessage & {
  error?: string;
  retryContent?: string;
  /** Files sent with this turn, shown on the bubble (this session only; history keeps their names). */
  files?: Pick<Attachment, "id" | "name" | "kind" | "preview">[];
};

export default function AiWorkspace() {
  const {
    data,
    account,
    roster,
    subjectClasses,
    attendanceSessions,
    allSubmissions,
    classAnnouncements,
    clubMembers,
    clubEvents,
    error: loadError,
    avatarUrl,
    refresh,
  } = useStudent();
  const { theme, toggleTheme } = usePhuongTheme();
  const token = data?.token || "local-multi-role-session";
  const [now] = useState(Date.now);
  const [consent, setConsent] = useState<boolean | null>(null);
  const intro = useAiIntro(Boolean(data || loadError) && consent !== null);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [sideOpen, setSideOpen] = useState(false); // phones: drawer
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<AiMode>("explain");
  const [draft, setDraft] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AiConversation | null>(null);
  const [memories, setMemories] = useState<StudentMemoryFact[]>([]);
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [engStudioOpen, setEngStudioOpen] = useState(false);
  const [selectedMemoryStudentCode, setSelectedMemoryStudentCode] = useState<string>("2200286");
  const [newMemoryCategory, setNewMemoryCategory] = useState<MemoryCategory>("hoc_tap");
  const [newMemoryText, setNewMemoryText] = useState("");
  const [memoryToast, setMemoryToast] = useState("");
  const controller = useRef<AbortController | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const imagePicker = useRef<HTMLInputElement>(null);
  const filePicker = useRef<HTMLInputElement>(null);
  const folderPicker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncMemories = () => setMemories(readStudentMemories());
    queueMicrotask(syncMemories);
    return subscribeStudentMemories(syncMemories);
  }, []);

  useEffect(() => {
    if (account.code && roster.some((r) => r.studentCode === account.code)) {
      setSelectedMemoryStudentCode(account.code);
    } else if (roster[0]) {
      setSelectedMemoryStudentCode(roster[0].studentCode);
    }
  }, [account.code, roster]);

  // Build comprehensive student memory & portal context so Model SDU 1.3 knows every student's full dossier and learned traits.
  const studentContext = useMemo(() => {
    if (!data) return "";
    return buildComprehensiveStudentMemoryContext({
      account,
      roster,
      subjectClasses,
      attendanceSessions,
      allSubmissions,
      classAnnouncements,
      clubMembers,
      clubEvents,
      assignments: data.assignments,
      memories,
      now,
    });
  }, [
    account,
    allSubmissions,
    attendanceSessions,
    classAnnouncements,
    clubEvents,
    clubMembers,
    data,
    memories,
    now,
    roster,
    subjectClasses,
  ]);

  const loadMeta = useCallback(async () => {
    try {
      const [nextUsage, list] = await Promise.all([
        aiRequest<AiUsage>("/api/ai/usage", token),
        aiRequest<{ conversations: AiConversation[] }>("/api/ai/conversations", token),
      ]);
      const localUsed = readLocalUsageCount();
      setUsage({
        ...nextUsage,
        used: Math.max(nextUsage.used, localUsed),
      });
      const localThreads = readLocalThreads().map((item) => item.conversation);
      const byId = new Map<string, AiConversation>();
      for (const conv of [...list.conversations, ...localThreads]) {
        if (!byId.has(conv.id)) byId.set(conv.id, conv);
      }
      const merged = [...byId.values()].sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      );
      setConversations(merged);
    } catch (error) {
      const localThreads = readLocalThreads().map((item) => item.conversation);
      setConversations(localThreads);
      setUsage({
        enabled: true,
        used: readLocalUsageCount(),
        limit: 100,
        resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
      });
      if (error instanceof Error && !localThreads.length) {
        setNotice(error.message);
      }
    }
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => {
      setConsent(readFlag(consentKey));
      setSideCollapsed(readFlag(sideKey));
      const preset = new URLSearchParams(location.search).get("assignment");
      if (preset) setAssignmentId(preset);
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadMeta());
  }, [loadMeta]);

  useEffect(() => () => controller.current?.abort(), []);

  // Follow the answer while it streams, unless the reader scrolled up to read.
  useEffect(() => {
    const element = thread.current;
    if (element && element.scrollHeight - element.scrollTop - element.clientHeight < 160) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  const title =
    conversations.find((item) => item.id === activeId)?.title ??
    (messages.length ? "Cuộc trò chuyện" : "Cuộc trò chuyện mới");
  useEffect(() => {
    document.title = `${title} | Đại học Sao Đỏ`;
  }, [title]);

  const newConversation = useCallback(() => {
    if (streaming) return;
    setActiveId(null);
    setMessages([]);
    setNotice("");
    setSideOpen(false);
    requestAnimationFrame(() => composer.current?.focus());
  }, [streaming]);

  // Ctrl/⌘ + Shift + O starts a new conversation; Escape closes modals.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && (pendingDelete || memoryModalOpen)) {
        event.preventDefault();
        setPendingDelete(null);
        setMemoryModalOpen(false);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        newConversation();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [memoryModalOpen, newConversation, pendingDelete]);

  async function openConversation(id: string) {
    if (streaming) return;
    setActiveId(id);
    setNotice("");
    setSideOpen(false);
    const cached = readLocalThreads().find((item) => item.conversation.id === id);
    if (cached) {
      setMessages(cached.messages);
      setMode(cached.conversation.mode);
      requestAnimationFrame(() => {
        if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
      });
      return;
    }
    setLoadingThread(true);
    try {
      const result = await aiRequest<{ conversation: AiConversation; messages: AiMessage[] }>(
        `/api/ai/conversations/${id}`,
        token,
      );
      setMessages(result.messages);
      setMode(result.conversation.mode);
      requestAnimationFrame(() => {
        if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : aiErrorMessage("unknown"));
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }

  async function confirmDeleteConversation(id: string) {
    setPendingDelete(null);
    try {
      const remainingLocal = readLocalThreads().filter((item) => item.conversation.id !== id);
      writeLocalThreads(remainingLocal);
      await aiRequest(`/api/ai/conversations/${id}`, token, { method: "DELETE" }).catch(() => undefined);
      setConversations((items) => items.filter((item) => item.id !== id));
      if (activeId === id) newConversation();
      setStatus("Đã xoá cuộc trò chuyện.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : aiErrorMessage("unknown"));
    }
  }

  async function send(content: string) {
    const files = attachments;
    // Files alone are a valid question; give the model something to answer.
    const text = content.trim() || (files.length ? "Hãy xem giúp mình các tệp đính kèm." : "");
    if (!text || streaming || !token) return;
    setAttachments([]);
    const requestId = crypto.randomUUID();
    const assistantId = `pending-${requestId}`;
    const abort = new AbortController();
    controller.current = abort;
    setStreaming(true);
    setNotice("");
    setDraft("");
    if (composer.current) composer.current.style.height = "auto";
    setStatus("Model SDU 1.3 đang truy xuất bộ nhớ học sinh & soạn câu trả lời…");

    // Automatically learn any self-reported traits from the user's message immediately
    const fallbackStudentCode =
      roster.find((r) => r.studentCode === account.code)?.studentCode ??
      roster[0]?.studentCode ??
      "2200286";
    const userLearned = autoLearnFromUserMessage(text, fallbackStudentCode, roster);
    if (userLearned.length > 0) {
      setMemories(readStudentMemories());
      setMemoryToast(
        `Đã tự động ghi nhớ ${userLearned.length} đặc điểm mới vào Bộ nhớ Học sinh (${userLearned[0]!.studentCode})`,
      );
    }

    const priorHistory = messages
      .filter(
        (m): m is Message & { role: "user" | "assistant" } =>
          (m.role === "user" || m.role === "assistant") && Boolean(m.content.trim()),
      )
      .map((m) => ({ role: m.role, content: m.content }));

    const userMsg: Message = {
      id: `user-${requestId}`,
      role: "user",
      content: text,
      status: "complete",
      createdAt: new Date().toISOString(),
      files: files.map(({ id, name, kind, preview }) => ({ id, name, kind, preview })),
    };
    const pendingAssistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      model: SDU_AI_MODEL_BADGE,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setMessages((items) => [...items, userMsg, pendingAssistantMsg]);
    const patch = (update: (message: Message) => Message) =>
      setMessages((items) => items.map((item) => (item.id === assistantId ? update(item) : item)));

    let resolvedConversationId = activeId ?? crypto.randomUUID();
    let streamedText = "";

    try {
      await streamChat(
        token,
        {
          conversationId: activeId,
          mode,
          content: text,
          assignmentId: assignmentId || null,
          history: priorHistory,
          studentContext,
        },
        requestId,
        (event: AiStreamEvent) => {
          if (event.type === "start") {
            resolvedConversationId = event.conversationId;
            setActiveId(event.conversationId);
          } else if (event.type === "delta") {
            streamedText += event.text;
            const visiblePreview = streamedText.replace(
              /<ghi_nho_sinh_vien[\s\S]*?(?:<\/ghi_nho_sinh_vien>|$)/gi,
              "",
            );
            patch((item) => ({ ...item, content: visiblePreview }));
          } else if (event.type === "complete") {
            patch((item) => ({ ...item, status: "complete" }));
          } else if (event.type === "error") {
            patch((item) => ({
              ...item,
              status: event.code === "cancelled" || item.content ? "interrupted" : "failed",
              error: aiErrorMessage(event.code),
              retryContent: text,
            }));
          }
        },
        abort.signal,
        files.map((file) => ({ blob: file.blob, name: file.name })),
      );

      // Extract & persist any <ghi_nho_sinh_vien> tags emitted by Model SDU 1.3
      const { cleanedText, savedFacts } = extractAndSaveAiMemoryTags(
        streamedText,
        fallbackStudentCode,
      );
      if (savedFacts.length > 0) {
        setMemories(readStudentMemories());
        setMemoryToast(
          `Model SDU 1.3 đã tự động ghi nhớ ${savedFacts.length} đặc điểm mới của SV ${savedFacts[0]!.studentCode}`,
        );
      }
      const finalAssistantText = ensureVisualBlocksInAnswer(
        text,
        cleanedText || streamedText,
      );
      patch((item) => ({ ...item, content: finalAssistantText, status: "complete" }));

      // Persist the conversation and usage locally so history and quota stay accurate in real time.
      const nowIso = new Date().toISOString();
      const existingThreads = readLocalThreads();
      const existingIdx = existingThreads.findIndex(
        (item) => item.conversation.id === resolvedConversationId,
      );
      const convTitle =
        existingIdx >= 0
          ? existingThreads[existingIdx]!.conversation.title
          : text.replace(/\s+/g, " ").slice(0, 60);
      const updatedConv: AiConversation = {
        id: resolvedConversationId,
        title: convTitle,
        mode,
        updatedAt: nowIso,
      };
      const completedAssistant: AiMessage = {
        id: assistantId,
        role: "assistant",
        content: finalAssistantText,
        model: SDU_AI_MODEL_BADGE,
        status: "complete",
        createdAt: nowIso,
      };
      const nextStoredMessages: AiMessage[] = [
        ...(existingIdx >= 0
          ? existingThreads[existingIdx]!.messages
          : messages.map(({ id, role, content: c, status: s, createdAt }) => ({
              id,
              role,
              content: c,
              status: s,
              createdAt,
            }))),
        {
          id: userMsg.id,
          role: "user",
          content: userMsg.content,
          status: "complete",
          createdAt: userMsg.createdAt,
        },
        completedAssistant,
      ];
      const nextThreads = [
        { conversation: updatedConv, messages: nextStoredMessages },
        ...existingThreads.filter((item) => item.conversation.id !== resolvedConversationId),
      ];
      writeLocalThreads(nextThreads);
      const nextUsed = incrementLocalUsageCount();
      setUsage((prev) =>
        prev
          ? {
              ...prev,
              used: Math.max(prev.used + 1, nextUsed),
            }
          : null,
      );
      setConversations((prev) => [
        updatedConv,
        ...prev.filter((item) => item.id !== resolvedConversationId),
      ]);
      setStatus("Trợ lý đã trả lời xong.");
    } catch (error) {
      // Nothing was generated: restore the draft and drop the optimistic turn.
      setMessages((items) => items.filter((item) => item.id !== assistantId && item.id !== `user-${requestId}`));
      setDraft(content);
      setAttachments(files);
      setNotice(error instanceof AiRequestError ? error.message : aiErrorMessage("unknown"));
      setStatus("");
    } finally {
      controller.current = null;
      setStreaming(false);
      void loadMeta();
    }
  }

  /** Adds picked, dropped or pasted files to the tray; reports skipped types and broken limits. */
  async function attach(files: File[], pathOf?: (file: File) => string) {
    if (!files.length || streaming) return;
    setAttaching(true);
    const result = await addFiles(files, attachments, pathOf);
    setAttaching(false);
    setAttachments((items) => [...items, ...result.added]);
    const skipped = result.skipped.length
      ? `Bỏ qua ${result.skipped.length} tệp chưa hỗ trợ (ví dụ: ${result.skipped[0]}). Word/Excel hãy xuất ra PDF.`
      : "";
    setNotice([result.error, skipped].filter(Boolean).join(" "));
    if (result.added.length) setStatus(`Đã đính kèm ${result.added.length} tệp.`);
    composer.current?.focus();
  }

  function detach(id: string) {
    setAttachments((items) => {
      const gone = items.find((item) => item.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return items.filter((item) => item.id !== id);
    });
  }

  const pick = (input: HTMLInputElement | null) => {
    document.getElementById("aw-attach-menu")?.hidePopover();
    input?.click();
  };
  const onPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    void attach([...(event.target.files ?? [])]);
    event.target.value = "";
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  function toggleSide() {
    if (window.matchMedia("(max-width: 860px)").matches) {
      setSideOpen((value) => !value);
      return;
    }
    setSideCollapsed((value) => {
      writeFlag(sideKey, !value);
      return !value;
    });
  }

  const root = (children: React.ReactNode, extra = "") => (
    <div className={`aw ${phuongFonts} ${extra}${intro.arrived ? " aw-arrive" : ""}`} data-theme={theme}>
      {children}
      {intro.splash}
      <SceneCurtain to="/student" />
    </div>
  );

  if (loadError) {
    return root(
      <div className="aw-center">
        <div className="notice error" role="alert">
          <Icon name="alert" />
          <div>
            <strong>Không thể mở trợ lý</strong>
            <p>{loadError}</p>
          </div>
          <button className="button button-outline button-xs" type="button" onClick={() => void refresh()}>
            <Icon name="retry" /> Thử lại
          </button>
        </div>
      </div>,
    );
  }

  if (!data || consent === null) {
    return root(
      <div className="aw-center" aria-busy="true">
        <img src="/sao-do-logo.png" alt="" width={56} height={60} className="aw-loading-logo" />
        <p className="aw-loading-text">Đang mở trợ lý học tập…</p>
      </div>,
    );
  }

  if (!consent) {
    return root(
      <div className="aw-center">
        <div className="aw-consent">
          <img src="/sao-do-logo.png" alt="" width={44} height={47} />
          <h1>Trước khi dùng trợ lý AI</h1>
          <ul>
            <li>Nội dung bạn nhập (và bài tập bạn chọn đính kèm) được gửi tới nhà cung cấp AI của nhà trường để tạo câu trả lời.</li>
            <li>Không nhập mật khẩu, số giấy tờ hay thông tin cá nhân nhạy cảm.</li>
            <li>Cuộc trò chuyện chỉ bạn xem được và tự động xoá sau 30 ngày không dùng; bạn có thể xoá bất kỳ lúc nào.</li>
            <li>AI có thể sai. Câu trả lời là gợi ý học tập, không thay thế nhận xét của giảng viên và không tự động nộp bài.</li>
          </ul>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              writeFlag(consentKey, true);
              setConsent(true);
            }}
          >
            Tôi đã hiểu, bắt đầu
          </button>
        </div>
      </div>,
    );
  }

  const currentMode = modes.find((item) => item.key === mode)!;
  const enabled = usage?.enabled ?? true;
  const exhausted = usage ? usage.used >= usage.limit : false;
  const name = account.displayName || data.session.user.displayName;
  const filtered = query.trim()
    ? conversations.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()))
    : conversations;
  const empty = !messages.length && !loadingThread;

  const selectedRosterStudent =
    roster.find((r) => r.studentCode === selectedMemoryStudentCode) ?? roster[0];
  const selectedStudentDetail = selectedRosterStudent
    ? STUDENT_DETAILED_PROFILES[selectedRosterStudent.studentCode]
    : undefined;
  const selectedStudentMemories = memories.filter(
    (m) => m.studentCode === selectedMemoryStudentCode,
  );

  function handleAddManualMemory(event: FormEvent) {
    event.preventDefault();
    if (!newMemoryText.trim() || !selectedMemoryStudentCode) return;
    const added = addStudentMemoryFact({
      studentCode: selectedMemoryStudentCode,
      category: newMemoryCategory,
      fact: newMemoryText.trim(),
      source: "manual",
    });
    if (added) {
      setMemories(readStudentMemories());
      setNewMemoryText("");
      setMemoryToast(
        `Đã lưu đặc điểm mới vào bộ nhớ của ${selectedRosterStudent?.fullName ?? selectedMemoryStudentCode}`,
      );
    }
  }

  const composerForm = (
    <form className="aw-composer" onSubmit={submit}>
      {memoryToast && (
        <div className="aw-memory-toast" role="status">
          <Icon name="sparkle" />
          <span>{memoryToast}</span>
          <button
            type="button"
            className="aw-toast-open"
            onClick={() => setMemoryModalOpen(true)}
          >
            Xem bộ nhớ
          </button>
          <button
            type="button"
            className="aw-toast-close"
            aria-label="Đóng thông báo"
            onClick={() => setMemoryToast("")}
          >
            ×
          </button>
        </div>
      )}
      {notice && (
        <div className="notice error" role="alert">
          <Icon name="alert" />
          <p style={{ margin: 0 }}>{notice}</p>
        </div>
      )}
      {exhausted && enabled && (
        <div className="notice" role="status">
          <Icon name="info" />
          <p style={{ margin: 0 }}>{aiErrorMessage("ai_quota_exceeded")}</p>
        </div>
      )}
      <div className="aw-box">
        {(attachments.length > 0 || attaching) && (
          <ul className="aw-tray" aria-label="Tệp đính kèm">
            {attachments.map((item) => (
              <li key={item.id} className={`aw-file k-${item.kind}`}>
                {item.preview ? (
                  <img src={item.preview} alt="" />
                ) : (
                  <span className="aw-file-icon" aria-hidden="true"><Icon name={item.kind === "pdf" ? "file" : "list"} /></span>
                )}
                <span className="aw-file-text">
                  <strong title={item.name}>{item.name.split("/").at(-1)}</strong>
                  <small>{item.name.includes("/") ? `${item.name.split("/")[0]}/ · ` : ""}{formatSize(item.size)}</small>
                </span>
                <button type="button" className="aw-file-remove" aria-label={`Bỏ ${item.name}`} onClick={() => detach(item.id)} disabled={streaming}>
                  ×
                </button>
              </li>
            ))}
            {attaching && <li className="aw-file is-loading">Đang xử lý tệp…</li>}
            {attachments.length > 1 && (
              <li className="aw-tray-total">
                {attachments.length} tệp · {formatSize(attachments.reduce((sum, item) => sum + item.size, 0))} / 30 MB
              </li>
            )}
          </ul>
        )}
        <label className="sr-only" htmlFor="ai-input">Tin nhắn cho trợ lý AI</label>
        <textarea
          id="ai-input"
          ref={composer}
          rows={empty ? 3 : 1}
          value={draft}
          maxLength={8000}
          placeholder={enabled ? currentMode.hint : usage ? "Trợ lý AI chưa được bật" : "Đang kiểm tra trợ lý…"}
          disabled={!enabled || exhausted}
          autoFocus
          onChange={(event) => {
            setDraft(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 240)}px`;
          }}
          onKeyDown={onKeyDown}
          onPaste={(event) => {
            const pasted = [...event.clipboardData.files];
            if (!pasted.length) return;
            event.preventDefault();
            void attach(pasted, (file) => (file.name === "image.png" ? `anh-dan-${Date.now()}.png` : file.name));
          }}
        />
        <div className="aw-box-bar">
          <button
            type="button"
            className="aw-attach"
            popoverTarget="aw-attach-menu"
            aria-label="Đính kèm ảnh, tệp hoặc thư mục"
            title="Đính kèm ảnh, tệp hoặc thư mục (dưới 30 MB)"
            disabled={!enabled || exhausted || streaming}
          >
            <Icon name="paperclip" />
          </button>
          <span
            className="aw-model-pill"
            title={SDU_AI_MODEL_DESC}
          >
            <Icon name="sparkle" />
            <strong>{SDU_AI_MODEL_NAME}</strong>
            <small>Qwen 3.8</small>
          </span>
          <button
            type="button"
            className="aw-memory-pill"
            onClick={() => setMemoryModalOpen(true)}
            title="Mở Hệ thống Bộ nhớ Học sinh — AI tự động ghi nhớ đặc điểm và hồ sơ của từng sinh viên"
          >
            <Icon name="users" />
            <span>Bộ nhớ SV ({roster.length} HS · {memories.length} đặc điểm)</span>
          </button>
          <button
            type="button"
            className="aw-memory-pill aw-cad-pill"
            onClick={() => setEngStudioOpen(true)}
            title="Mở Xưởng Kỹ thuật CAD / 3D & Biểu đồ Trực quan (Xuất AutoCAD .DXF, 3D .STL/.OBJ, Biểu đồ .SVG/.CSV)"
          >
            <Icon name="sparkle" />
            <span>Xưởng CAD / 3D & Biểu đồ</span>
          </button>
          <div id="aw-attach-menu" popover="auto" className="aw-attach-menu">
            <button type="button" onClick={() => pick(imagePicker.current)}>
              <Icon name="sparkle" />
              <span><strong>Ảnh</strong><small>Chụp màn hình, ảnh bài làm</small></span>
            </button>
            <button type="button" onClick={() => pick(filePicker.current)}>
              <Icon name="file" />
              <span><strong>Tệp</strong><small>PDF, văn bản, mã nguồn</small></span>
            </button>
            <button type="button" onClick={() => pick(folderPicker.current)}>
              <Icon name="class" />
              <span><strong>Thư mục</strong><small>Cả thư mục tài liệu hoặc dự án</small></span>
            </button>
            <p>Tổng dưới 30 MB · tối đa 100 tệp · có thể kéo thả hoặc dán ảnh</p>
          </div>
          <input ref={imagePicker} type="file" hidden multiple accept="image/png,image/jpeg,image/gif,image/webp" onChange={onPicked} />
          <input ref={filePicker} type="file" hidden multiple onChange={onPicked} />
          <input ref={folderPicker} type="file" hidden multiple {...({ webkitdirectory: "" } as Record<string, string>)} onChange={onPicked} />
          {streaming ? (
            <button className="aw-send stop" type="button" aria-label="Dừng tạo câu trả lời" onClick={() => controller.current?.abort()}>
              <Icon name="stop" />
            </button>
          ) : (
            <button className="aw-send" type="submit" aria-label="Gửi" disabled={!enabled || exhausted || attaching || (!draft.trim() && !attachments.length)}>
              <Icon name="send" />
            </button>
          )}
        </div>
      </div>
      <p className="aw-disclaimer">
        Vận hành trên <strong>{SDU_AI_MODEL_NAME}</strong> (train dữ liệu từ mô hình mở <strong>Qwen 3.8</strong>) · Tự động ghi nhớ đặc điểm từng sinh viên.
      </p>
    </form>
  );

  return root(
    <>
      <aside className="aw-side" aria-label="Lịch sử trò chuyện" id="aw-side">
        <div className="aw-side-head">
          <Link href="/student" className="aw-brand" aria-label="Về cổng học tập">
            <img src="/sao-do-logo.png" alt="" width={30} height={32} />
            <span>
              <strong>Đại học Sao Đỏ</strong>
              <small>{SDU_AI_MODEL_BADGE}</small>
            </span>
          </Link>
          <button className="icon-button" type="button" onClick={toggleSide} aria-label="Đóng thanh bên" aria-controls="aw-side">
            <Icon name="panel" />
          </button>
        </div>
        <button className="aw-new" type="button" onClick={newConversation} disabled={streaming}>
          <Icon name="plus" /> Cuộc trò chuyện mới
          <kbd>Ctrl ⇧ O</kbd>
        </button>
        <button
          className="aw-memory-side-btn"
          type="button"
          onClick={() => setMemoryModalOpen(true)}
        >
          <Icon name="users" />
          <span>
            <strong>Bộ nhớ Học sinh AI</strong>
            <small>{roster.length} hồ sơ SV · {memories.length} ghi nhớ</small>
          </span>
        </button>
        <button
          className="aw-memory-side-btn aw-cad-side-btn"
          type="button"
          onClick={() => setEngStudioOpen(true)}
        >
          <Icon name="sparkle" />
          <span>
            <strong>Xưởng CAD / 3D & Biểu đồ</strong>
            <small>AutoCAD .DXF · 3D .STL/.OBJ · DataViz</small>
          </span>
        </button>
        <label className="aw-search">
          <Icon name="search" />
          <span className="sr-only">Tìm cuộc trò chuyện</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm cuộc trò chuyện" />
        </label>
        <nav className="aw-history" aria-label="Các cuộc trò chuyện">
          {filtered.length ? (
            groupByRecency(filtered, now).map((group) => (
              <div key={group.label}>
                <p className="aw-group">{group.label}</p>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.id} aria-current={item.id === activeId ? "true" : undefined}>
                      <button type="button" title={item.title} onClick={() => void openConversation(item.id)} disabled={streaming}>
                        <span className="aw-title">{item.title}</span>
                      </button>
                      <button
                        className="aw-delete"
                        type="button"
                        aria-label={`Xoá cuộc trò chuyện ${item.title}`}
                        onClick={() => setPendingDelete(item)}
                        disabled={streaming}
                      >
                        <Icon name="trash" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="aw-muted">{query ? "Không tìm thấy cuộc trò chuyện." : "Chưa có cuộc trò chuyện nào."}</p>
          )}
        </nav>
        <div className="aw-side-foot">
          <div className="aw-user">
            <span className="avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" className="avatar-img" /> : initials(name)}
            </span>
            <span>
              <strong>{name}</strong>
            </span>
            <button
              className="icon-button"
              type="button"
              onClick={toggleTheme}
              aria-label="Chế độ tối"
              aria-pressed={theme === "dark"}
              title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
          </div>
          <Link href="/student" className="aw-back">
            <Icon name="back" /> Về cổng học tập
          </Link>
        </div>
      </aside>
      {sideOpen && <button className="aw-scrim" type="button" aria-label="Đóng thanh bên" onClick={() => setSideOpen(false)} />}

      <main
        className={`aw-main${dragging ? " is-dragging" : ""}`}
        id="noi-dung"
        onDragEnter={(event) => {
          if (enabled && event.dataTransfer.types.includes("Files")) setDragging(true);
        }}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) event.preventDefault();
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!enabled || exhausted) return;
          void filesFromDrop(event.dataTransfer.items).then((dropped) => {
            const paths = new Map(dropped.map(({ file, path }) => [file, path]));
            return attach(dropped.map(({ file }) => file), (file) => paths.get(file) ?? file.name);
          });
        }}
      >
        {dragging && (
          <div className="aw-drop" aria-hidden="true">
            <Icon name="paperclip" />
            <strong>Thả ảnh, tệp hoặc thư mục vào đây</strong>
            <span>Tổng dưới 30 MB · ảnh, PDF, văn bản và mã nguồn</span>
          </div>
        )}
        <header className="aw-top">
          <button className="icon-button aw-open-side" type="button" onClick={toggleSide} aria-label="Mở thanh bên" aria-controls="aw-side" aria-expanded={sideOpen}>
            <Icon name="panel" />
          </button>
          <h1>{title}</h1>
          <span className="aw-top-model-chip" title={SDU_AI_MODEL_DESC}>
            <Icon name="sparkle" /> {SDU_AI_MODEL_NAME} · Qwen 3.8
          </span>
          <button
            className="aw-top-memory-btn"
            type="button"
            onClick={() => setMemoryModalOpen(true)}
            title="Mở Bộ nhớ Học sinh AI"
          >
            <Icon name="users" />
            <span>Bộ nhớ SV</span>
          </button>
          <button
            className="aw-top-memory-btn aw-top-cad-btn"
            type="button"
            onClick={() => setEngStudioOpen(true)}
            title="Mở Xưởng Kỹ thuật CAD / 3D & Biểu đồ"
          >
            <Icon name="sparkle" />
            <span>CAD / 3D & Biểu đồ</span>
          </button>
          <button className="icon-button aw-top-new" type="button" onClick={newConversation} disabled={streaming} aria-label="Cuộc trò chuyện mới">
            <Icon name="plus" />
          </button>
        </header>

        {empty ? (
          <div className="aw-welcome">
            <div className="aw-welcome-badge-row">
              <span className="aw-welcome-model-badge">
                <Icon name="sparkle" />
                <strong>{SDU_AI_MODEL_NAME}</strong>
                <span>Train dữ liệu từ mô hình mở Qwen 3.8</span>
              </span>
              <button
                type="button"
                className="aw-welcome-memory-badge"
                onClick={() => setMemoryModalOpen(true)}
              >
                <Icon name="users" />
                <span>Đã ghi nhớ {roster.length} hồ sơ SV ({memories.length} đặc điểm)</span>
              </button>
              <button
                type="button"
                className="aw-welcome-memory-badge aw-welcome-cad-badge"
                onClick={() => setEngStudioOpen(true)}
              >
                <Icon name="sparkle" />
                <span>Vẽ Biểu đồ · Chi tiết máy 2D AutoCAD (.DXF) & 3D (.STL/.OBJ)</span>
              </button>
            </div>
            <h2>
              <img src="/sao-do-logo.png" alt="Logo Đại học Sao Đỏ" width={38} height={41} className="aw-welcome-logo" /> {greeting(new Date(now))}, Đại học Sao Đỏ
            </h2>
            <p>
              {enabled
                ? "Model SDU 1.3 (huấn luyện từ Qwen 3.8) tự động ghi nhớ hồ sơ từng sinh viên, vẽ biểu đồ trực quan, thiết kế bản vẽ chi tiết máy 2D TCVN và xuất file AutoCAD (.DXF) & 3D (.STL/.OBJ)."
                : usage
                  ? aiErrorMessage("ai_disabled")
                  : "Đang kiểm tra trạng thái trợ lý…"}
            </p>
            {composerForm}
            <div className="aw-modes" role="group" aria-label="Chế độ học">
              {modes.map((item) => (
                <button key={item.key} type="button" aria-pressed={item.key === mode} onClick={() => setMode(item.key)}>
                  <Icon name={item.icon} /> {item.label}
                </button>
              ))}
            </div>
            <div className="aw-student-quick-bar" aria-label="Công cụ Vẽ Kỹ thuật CAD / 3D & Biểu đồ">
              <span className="aw-student-quick-label">CAD / 3D & Biểu đồ:</span>
              {[
                {
                  title: "Bánh răng trụ Z24-M2.5",
                  sub: "AutoCAD .DXF · 3D .STL",
                  prompt:
                    "Vẽ chi tiết máy Bánh răng trụ răng thẳng (mô-đun m=2.5, số răng z=24, bề rộng b=22 mm, lỗ trục d=20 mm), tính toán thông số ăn khớp và xuất bản vẽ AutoCAD (.DXF) + file 3D (.STL)",
                },
                {
                  title: "Trục bậc hộp giảm tốc",
                  sub: "Bản vẽ 2D TCVN · 3D .OBJ",
                  prompt:
                    "Thiết kế và vẽ chi tiết máy Trục bậc hộp giảm tốc 3 đoạn kèm rãnh then, xuất bản vẽ AutoCAD (.DXF) và mô hình 3D (.STL / .OBJ)",
                },
                {
                  title: "Khớp nối mặt bích D130",
                  sub: "6 lỗ bu-lông · .DXF/.STL",
                  prompt:
                    "Vẽ chi tiết máy Khớp nối mặt bích tiêu chuẩn D130 (6 lỗ bu-lông trên vòng chia Db=95 mm, lỗ trục d=28 mm), xuất file AutoCAD (.DXF) và file 3D (.STL)",
                },
                {
                  title: "Ổ bi đỡ 6206 & Bu-lông M16",
                  sub: "TCVN · Mô hình 3D",
                  prompt:
                    "Vẽ chi tiết máy Ổ bi đỡ một dãy 6206 (d=30, D=62, B=16 mm) kèm bản vẽ kỹ thuật AutoCAD (.DXF) và mô hình 3D (.STL)",
                },
                {
                  title: "Biểu đồ GPA & Điểm rèn luyện",
                  sub: "Biểu đồ Cột / Radar / CSV",
                  prompt:
                    "Vẽ biểu đồ so sánh GPA, điểm rèn luyện và tỷ lệ chuyên cần của toàn bộ 6 sinh viên lớp DK13-CNTT1",
                },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className="aw-student-quick-chip aw-cad-quick-chip"
                  onClick={() => {
                    setDraft(item.prompt);
                    composer.current?.focus();
                  }}
                >
                  <strong>{item.title}</strong>
                  <small>{item.sub}</small>
                </button>
              ))}
            </div>
            <div className="aw-student-quick-bar" aria-label="Tra cứu nhanh hồ sơ sinh viên trong Bộ nhớ AI">
              <span className="aw-student-quick-label">Hỏi nhanh về SV:</span>
              {roster.map((stu) => (
                <button
                  key={stu.studentCode}
                  type="button"
                  className="aw-student-quick-chip"
                  onClick={() => {
                    setDraft(
                      `Cho mình biết đầy đủ thông tin cá nhân, gia đình, điểm số, chuyên cần và các đặc điểm AI đã ghi nhớ về sinh viên ${stu.fullName} (mã SV ${stu.studentCode})`,
                    );
                    composer.current?.focus();
                  }}
                >
                  <strong>{stu.fullName}</strong>
                  <small>{stu.studentCode} · GPA {stu.gpa}</small>
                </button>
              ))}
            </div>
            {enabled && !exhausted && (
              <div className="aw-suggestions">
                {currentMode.suggestions.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => {
                      setDraft(text.endsWith(":") ? `${text}\n` : text);
                      composer.current?.focus();
                    }}
                  >
                    {text} <Icon name="arrow" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="aw-thread" ref={thread}>
              <div className="aw-column">
                {loadingThread ? (
                  <div aria-label="Đang tải cuộc trò chuyện">
                    <div className="skeleton" style={{ height: 44, width: "55%", marginLeft: "auto", marginBottom: 24 }} />
                    <div className="skeleton" style={{ height: 140 }} />
                  </div>
                ) : (
                  messages.map((message) =>
                    message.role === "user" ? (
                      <div key={message.id} className="aw-msg user">
                        <div className="aw-user-turn">
                          {message.files?.length ? (
                            <ul className="aw-sent-files" aria-label="Tệp đã gửi">
                              {message.files.map((file) => (
                                <li key={file.id}>
                                  {file.preview ? (
                                    <img src={file.preview} alt={file.name} />
                                  ) : (
                                    <span><Icon name={file.kind === "pdf" ? "file" : "list"} /> {file.name.split("/").at(-1)}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <div className="aw-user-bubble">{message.content}</div>
                        </div>
                      </div>
                    ) : (
                      <div key={message.id} className="aw-msg assistant">
                        <span className="aw-avatar" aria-hidden="true"><img src="/sao-do-logo.png" alt="" width={20} height={22} /></span>
                        <div className="aw-answer">
                          {message.status === "pending" && !message.content ? (
                            <span className="typing" aria-label="Đang soạn"><i /><i /><i /></span>
                          ) : (
                            <div className="bubble"><Markdown text={message.content} /></div>
                          )}
                          {message.status !== "pending" && (
                            <div className="aw-actions">
                              {message.status !== "complete" && (
                                <span className="chip danger">
                                  {message.error ?? (message.status === "interrupted" ? "Câu trả lời bị gián đoạn" : "Không tạo được câu trả lời")}
                                </span>
                              )}
                              {message.content && (
                                <button
                                  className="icon-button"
                                  type="button"
                                  aria-label="Sao chép câu trả lời"
                                  title="Sao chép"
                                  onClick={() => {
                                    void navigator.clipboard?.writeText(message.content).then(
                                      () => setStatus("Đã sao chép câu trả lời."),
                                      () => setStatus("Không thể sao chép. Hãy chọn và sao chép thủ công."),
                                    );
                                  }}
                                >
                                  <Icon name="copy" />
                                </button>
                              )}
                              {message.retryContent && !streaming && (
                                <button className="button button-ghost button-small" type="button" onClick={() => void send(message.retryContent!)}>
                                  <Icon name="retry" /> Thử lại
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>
            <div className="aw-dock">{composerForm}</div>
          </>
        )}
        <p className="sr-only" role="status" aria-live="polite">{status}</p>
      </main>
      {pendingDelete && (
        <div
          className="aw-modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPendingDelete(null);
          }}
        >
          <div
            className="aw-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="aw-delete-title"
            aria-describedby="aw-delete-desc"
          >
            <div className="aw-modal-head">
              <span className="aw-modal-icon" aria-hidden="true">
                <Icon name="trash" />
              </span>
              <h2 id="aw-delete-title">Xoá cuộc trò chuyện?</h2>
            </div>
            <p id="aw-delete-desc">
              Bạn có chắc chắn muốn xoá vĩnh viễn cuộc trò chuyện{" "}
              <strong>“{pendingDelete.title}”</strong>? Hành động này không thể hoàn tác.
            </p>
            <div className="aw-modal-actions">
              <button
                type="button"
                className="aw-modal-cancel"
                onClick={() => setPendingDelete(null)}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="aw-modal-confirm"
                autoFocus
                onClick={() => void confirmDeleteConversation(pendingDelete.id)}
              >
                <Icon name="trash" /> Xoá vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
      {memoryModalOpen && (
        <div
          className="aw-modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setMemoryModalOpen(false);
          }}
        >
          <div
            className="aw-memory-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aw-memory-title"
          >
            <div className="aw-memory-modal-head">
              <div>
                <div className="aw-memory-head-badges">
                  <span className="aw-model-tag">
                    <Icon name="sparkle" /> {SDU_AI_MODEL_NAME} · Train từ Qwen 3.8
                  </span>
                  <span className="aw-memory-count-tag">
                    Tự động ghi nhớ {roster.length} sinh viên · {memories.length} đặc điểm
                  </span>
                </div>
                <h2 id="aw-memory-title">Hệ thống Bộ nhớ Học sinh & Hồ sơ Toàn diện (SDU AI Memory)</h2>
                <p>
                  AI tự động ghi nhớ đặc điểm học tập, điểm mạnh, điểm yếu, sở thích, mục tiêu và toàn bộ thông tin sinh viên từ hồ sơ trường & lịch sử trò chuyện.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Đóng bảng bộ nhớ"
                onClick={() => setMemoryModalOpen(false)}
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="aw-memory-body">
              <aside className="aw-memory-roster" aria-label="Danh sách sinh viên">
                <p className="aw-memory-sec-title">Chọn sinh viên ({roster.length})</p>
                <ul>
                  {roster.map((stu) => {
                    const count = memories.filter((m) => m.studentCode === stu.studentCode).length;
                    const active = stu.studentCode === selectedMemoryStudentCode;
                    return (
                      <li key={stu.studentCode}>
                        <button
                          type="button"
                          className={`aw-memory-stu-btn${active ? " is-active" : ""}`}
                          onClick={() => setSelectedMemoryStudentCode(stu.studentCode)}
                        >
                          <span className="aw-memory-stu-avatar">{initials(stu.fullName)}</span>
                          <span className="aw-memory-stu-meta">
                            <strong>{stu.fullName}</strong>
                            <small>
                              {stu.studentCode} · GPA {stu.gpa} · {count} ghi nhớ
                            </small>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </aside>

              <div className="aw-memory-detail">
                {selectedRosterStudent && (
                  <>
                    <div className="aw-memory-profile-card">
                      <div className="aw-memory-profile-top">
                        <div>
                          <h3>
                            {selectedRosterStudent.fullName}{" "}
                            <span>({selectedRosterStudent.studentCode})</span>
                          </h3>
                          <p>
                            {selectedRosterStudent.roleInClass} · Lớp {selectedRosterStudent.cohortClass} · GPA{" "}
                            <strong>{selectedRosterStudent.gpa}/4.0</strong> · Chuyên cần{" "}
                            <strong>{selectedRosterStudent.attendancePct}%</strong>
                          </p>
                        </div>
                        <button
                          type="button"
                          className="aw-ask-stu-btn"
                          onClick={() => {
                            setMemoryModalOpen(false);
                            void send(
                              `Hãy tổng hợp toàn bộ hồ sơ cá nhân, gia đình, điểm số, chuyên cần và các đặc điểm trong bộ nhớ của sinh viên ${selectedRosterStudent.fullName} (${selectedRosterStudent.studentCode}).`,
                            );
                          }}
                        >
                          <Icon name="sparkle" /> Hỏi AI về SV này
                        </button>
                      </div>

                      {selectedStudentDetail && (
                        <div className="aw-memory-static-grid">
                          <div>
                            <small>Ngày sinh & Giới tính</small>
                            <strong>
                              {selectedStudentDetail.dateOfBirth} · {selectedStudentDetail.gender}
                            </strong>
                          </div>
                          <div>
                            <small>Số CCCD & Đoàn viên</small>
                            <strong>
                              {selectedStudentDetail.cccd} (Đoàn: {selectedStudentDetail.youthUnionDate})
                            </strong>
                          </div>
                          <div>
                            <small>Quê quán / Nơi sinh</small>
                            <strong>{selectedStudentDetail.hometown}</strong>
                          </div>
                          <div>
                            <small>Chỗ ở hiện nay</small>
                            <strong>{selectedStudentDetail.currentResidence}</strong>
                          </div>
                          <div>
                            <small>Chuyên ngành & Cố vấn</small>
                            <strong>
                              {selectedStudentDetail.specialization} · CVHT: {selectedStudentDetail.advisorName}
                            </strong>
                          </div>
                          <div>
                            <small>Điểm rèn luyện & Ngoại ngữ</small>
                            <strong>
                              {selectedStudentDetail.conductScore}/100 ({selectedStudentDetail.conductRank}) ·{" "}
                              {selectedStudentDetail.englishLevel}
                            </strong>
                          </div>
                          <div>
                            <small>Tài khoản Ngân hàng & BHYT</small>
                            <strong>
                              {selectedStudentDetail.bankAccount} · {selectedStudentDetail.bhytCode}
                            </strong>
                          </div>
                          <div>
                            <small>Thông tin gia đình</small>
                            <strong>{selectedStudentDetail.familySummary}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    <form className="aw-memory-add-form" onSubmit={handleAddManualMemory}>
                      <select
                        value={newMemoryCategory}
                        onChange={(e) => setNewMemoryCategory(e.target.value as MemoryCategory)}
                        aria-label="Phân loại đặc điểm"
                      >
                        {(Object.keys(MEMORY_CATEGORY_LABELS) as MemoryCategory[]).map((cat) => (
                          <option key={cat} value={cat}>
                            {MEMORY_CATEGORY_LABELS[cat]}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newMemoryText}
                        onChange={(e) => setNewMemoryText(e.target.value)}
                        placeholder={`Thêm đặc điểm ghi nhớ mới cho ${selectedRosterStudent.fullName}…`}
                      />
                      <button type="submit" disabled={!newMemoryText.trim()}>
                        <Icon name="plus" /> Ghi nhớ
                      </button>
                    </form>

                    <div className="aw-memory-facts-head">
                      <strong>
                        Đặc điểm AI đang ghi nhớ về {selectedRosterStudent.fullName} (
                        {selectedStudentMemories.length})
                      </strong>
                      <button
                        type="button"
                        className="aw-memory-reset-btn"
                        onClick={() => {
                          resetStudentMemoriesForCode(selectedRosterStudent.studentCode);
                          setMemories(readStudentMemories());
                        }}
                      >
                        Khôi phục mặc định
                      </button>
                    </div>

                    <ul className="aw-memory-facts-list">
                      {selectedStudentMemories.map((fact) => (
                        <li key={fact.id} className="aw-memory-fact-item">
                          <span className={`aw-memory-cat cat-${fact.category}`}>
                            {MEMORY_CATEGORY_LABELS[fact.category]}
                          </span>
                          <span className="aw-memory-fact-text">{fact.fact}</span>
                          <span className="aw-memory-source">
                            {fact.source === "chat_auto"
                              ? "Tự học từ chat"
                              : fact.source === "manual"
                                ? "Thủ công"
                                : "Hồ sơ gốc"}
                          </span>
                          <button
                            type="button"
                            className="aw-memory-fact-del"
                            aria-label="Xoá ghi nhớ này"
                            onClick={() => {
                              removeStudentMemoryFact(fact.id);
                              setMemories(readStudentMemories());
                            }}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <SduEngineeringStudioModal
        open={engStudioOpen}
        onClose={() => setEngStudioOpen(false)}
        onAskAi={(prompt) => {
          setDraft(prompt);
          void send(prompt);
        }}
      />
    </>,
    `${sideCollapsed ? "is-collapsed" : ""} ${sideOpen ? "is-open" : ""}`,
  );
}
