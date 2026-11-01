"use client";

/* eslint-disable @next/next/no-img-element -- small static logo */
import type { AiConversation, AiMessage, AiMode, AiStreamEvent, AiUsage } from "@sao-do/contracts";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/components/app-phuong.css";
import "@/components/ai-workspace.css";
import "@/app/landing.css";
import { useAiIntro } from "@/components/AiIntro";
import { SceneCurtain } from "@/components/landing/SceneTransition";
import { Icon, type IconName } from "@/components/Icon";
import { phuongFonts } from "@/components/landing/fonts";
import { PhuongFlower } from "@/components/landing/Phuong";
import { Markdown } from "@/components/Markdown";
import { ensureVisualBlocksInAnswer } from "@/lib/ai-cad-chart-engine";
import { aiErrorMessage, aiRequest, AiRequestError, streamChat } from "@/lib/ai-client";
import { addFiles, filesFromDrop, formatSize, type Attachment } from "@/lib/ai-files";
import {
  autoLearnFromUserMessage,
  buildComprehensiveStudentMemoryContext,
  extractAndSaveAiMemoryTags,
  readStudentMemories,
  subscribeStudentMemories,
} from "@/lib/ai-student-memory";
import { greeting, initials } from "@/lib/format";
import {
  courseByCode,
  courses,
  exams,
  gpa,
  invoices,
  letter,
  longDay,
  money,
  semester,
  sessions,
  sessionTime,
  standing,
  terms,
  total,
  weekdays,
} from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";
import { usePhuongTheme } from "@/lib/theme";

const modes: { key: AiMode; label: string; icon: IconName; hint: string; suggestions: string[] }[] = [
  {
    key: "explain",
    label: "Giải thích",
    icon: "book",
    hint: "Hỏi về môn học, lịch học, điểm số hoặc khái niệm bạn chưa hiểu…",
    suggestions: [
      "Tóm tắt lịch học trong tuần và các bài tập sắp đến hạn của mình",
      "Giải thích đệ quy và chuẩn hoá cơ sở dữ liệu 3NF kèm ví dụ thực tế",
    ],
  },
  {
    key: "summarize",
    label: "Tóm tắt",
    icon: "list",
    hint: "Dán ghi chép hoặc hỏi tổng hợp bảng điểm, học phí, lịch thi…",
    suggestions: [
      "Tổng hợp kết quả học tập (GPA), tiến độ tín chỉ và học phí kỳ này của mình",
      "Tóm tắt nội dung trọng tâm các môn đang học trong học kỳ HK1 2026-2027",
    ],
  },
  {
    key: "practice",
    label: "Luyện tập",
    icon: "question",
    hint: "Nhập chủ đề hoặc mã học phần muốn luyện tập…",
    suggestions: [
      "Ra 5 câu hỏi ôn tập môn IT3080 (Mạng máy tính) và IT3090 (Cơ sở dữ liệu)",
      "Đố 3 bài toán tự lượng giá về Lập trình hướng đối tượng (IT3040)",
    ],
  },
  {
    key: "plan",
    label: "Lập kế hoạch",
    icon: "calendar",
    hint: "Mô tả mục tiêu ôn thi hoặc bài tập cần lập tiến độ…",
    suggestions: [
      "Lập kế hoạch ôn thi giữa kỳ và cuối kỳ dựa trên lịch thi thật của mình",
      "Chia nhỏ tiến độ hoàn thành các bài tập đang mở trong lớp học phần",
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
  const [memoryTick, setMemoryTick] = useState(0);
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
    return subscribeStudentMemories(() => setMemoryTick((t) => t + 1));
  }, []);

  // Build real portal data + background student memory context so Model SDU 1.3 knows all student profiles silently.
  const studentContext = useMemo(() => {
    void memoryTick;
    if (!data) return "";
    const allGradeRows = terms.flatMap((term) => term.rows);
    const cumulativeGpa = gpa(allGradeRows);
    const currentInvoices = invoices(now);
    const activeInvoice = currentInvoices[0];
    const invoiceTotal = activeInvoice
      ? activeInvoice.items.reduce((sum, item) => sum + item.amount, 0)
      : 0;
    const invoiceRemaining = activeInvoice ? Math.max(0, invoiceTotal - activeInvoice.paid) : 0;

    const scheduleLines = sessions.map((s) => {
      const c = courseByCode.get(s.course);
      return `- ${weekdays[s.day]}: ${s.course} (${c?.name ?? s.course}) · Tiết ${s.from}-${s.to} (${sessionTime(s)}) · Phòng ${s.room} · ${s.kind} · GV: ${c?.lecturer ?? ""}`;
    });

    const examLines = exams(now).map((ex) => {
      const c = courseByCode.get(ex.course);
      return `- ${ex.round} ${ex.course} (${c?.name ?? ex.course}): ${longDay(ex.at)} lúc ${new Date(ex.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · Phòng ${ex.room} · ${ex.seat} · ${ex.form} (${ex.minutes} phút)`;
    });

    const gradeLines = terms.map((term) => {
      const termGpa = gpa(term.rows);
      const rowDetails = term.rows
        .map((r) => {
          const score = total(r);
          const l = letter(score);
          return `${r.code} ${r.name} (${r.credits} TC): Điểm TK ${score} (${l.grade})`;
        })
        .join("; ");
      return `- ${term.name} (GPA ${termGpa.value}/4.0): ${rowDetails}`;
    });

    const assignmentLines = data.assignments.map((a) => {
      const sub = data.submissions.find((s) => s.assignmentId === a.id);
      const dueStr = a.dueAt ? new Date(a.dueAt).toLocaleDateString("vi-VN") : "Không giới hạn";
      const subStr = sub
        ? `Đã nộp (${sub.status === "reviewed" ? `Đã chấm${sub.feedback ? ` - Nhận xét: ${sub.feedback}` : ""}` : "Đang chờ chấm"})`
        : "Chưa nộp";
      return `- [${a.id}] ${a.title} (Hạn: ${dueStr}) · Trạng thái: ${subStr} · Yêu cầu: ${a.instructions}`;
    });

    const rosterSummary = roster
      .map((acc) => `${acc.fullName} (${acc.studentCode} · GPA ${acc.gpa})`)
      .join(", ");

    const memoryKnowledgeBase = buildComprehensiveStudentMemoryContext({
      account,
      roster,
      subjectClasses,
      attendanceSessions,
      allSubmissions,
      classAnnouncements,
      clubMembers,
      clubEvents,
      assignments: data.assignments,
      memories: readStudentMemories(),
      now,
    });

    return [
      `Hồ sơ người dùng đang đăng nhập: ${account.displayName} (Mã: ${account.code})`,
      `Vai trò: ${account.roleTitle} · Lớp hành chính: ${account.cohortClass} · Khoa: ${account.department} · Email: ${account.email} · Cố vấn học tập: ${account.advisorName}`,
      `Học kỳ hiện tại: ${semester.name} (${semester.short})`,
      `Tổng kết học tập tích lũy: GPA ${cumulativeGpa.value}/4.0 (${standing(cumulativeGpa.value)}) · Đã tích lũy ${cumulativeGpa.credits}/150 tín chỉ`,
      `Học phí kỳ ${semester.short}: Tổng ${money(invoiceTotal)}, đã đóng ${money(activeInvoice?.paid ?? 0)}, còn cần đóng ${money(invoiceRemaining)} (Hạn: ${activeInvoice ? new Date(activeInvoice.due).toLocaleDateString("vi-VN") : "N/A"})`,
      `Các học phần đang học kỳ này (${courses.reduce((s, c) => s + c.credits, 0)} tín chỉ):\n${courses.map((c) => `- ${c.code}: ${c.name} (${c.credits} tín chỉ) · Giảng viên: ${c.lecturer}`).join("\n")}`,
      `Thời khóa biểu trong tuần:\n${scheduleLines.join("\n")}`,
      `Lịch thi sắp tới:\n${examLines.join("\n")}`,
      `Bài tập & Đồ án trên hệ thống:\n${assignmentLines.join("\n")}`,
      `Bảng điểm các học kỳ trước:\n${gradeLines.join("\n")}`,
      `Danh sách thành viên lớp ${account.cohortClass}: ${rosterSummary}`,
      memoryKnowledgeBase,
    ].join("\n\n");
  }, [
    account,
    allSubmissions,
    attendanceSessions,
    classAnnouncements,
    clubEvents,
    clubMembers,
    data,
    memoryTick,
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

  // Ctrl/⌘ + Shift + O starts a new conversation; Escape closes the custom delete modal.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && pendingDelete) {
        event.preventDefault();
        setPendingDelete(null);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        newConversation();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newConversation, pendingDelete]);

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
    setStatus("Trợ lý đang soạn câu trả lời…");

    // Background student memory learning from user message
    const fallbackStudentCode =
      roster.find((r) => r.studentCode === account.code)?.studentCode ??
      roster[0]?.studentCode ??
      "2200286";
    autoLearnFromUserMessage(text, fallbackStudentCode, roster);
    const latestContext = studentContext;

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
          studentContext: latestContext,
        },
        requestId,
        (event: AiStreamEvent) => {
          if (event.type === "start") {
            resolvedConversationId = event.conversationId;
            setActiveId(event.conversationId);
          } else if (event.type === "delta") {
            streamedText += event.text;
            const cleanedPreview = streamedText.replace(/\[\[MEMORY_ADD:[\s\S]*?\]\]/g, "").trimEnd();
            patch((item) => ({ ...item, content: cleanedPreview }));
          } else if (event.type === "complete") {
            const { cleanedText } = extractAndSaveAiMemoryTags(streamedText, account.code);
            const enrichedText = ensureVisualBlocksInAnswer(text, cleanedText);
            streamedText = enrichedText;
            patch((item) => ({ ...item, content: enrichedText, status: "complete" }));
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
        content: streamedText,
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
        <img src="/sao-do-logo.png" alt="" width={56} height={56} className="aw-loading-logo" />
        <p className="aw-loading-text">Đang mở trợ lý học tập…</p>
      </div>,
    );
  }

  if (!consent) {
    return root(
      <div className="aw-center">
        <div className="aw-consent">
          <img src="/sao-do-logo.png" alt="Đại học Sao Đỏ" width={48} height={48} />
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

  const composerForm = (
    <form className="aw-composer" onSubmit={submit}>
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
      <p className="aw-disclaimer">Trợ lý AI có thể sai. Hãy tự kiểm chứng trước khi dùng cho bài tập.</p>
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
              <small>Học cùng AI</small>
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
          <button className="icon-button aw-top-new" type="button" onClick={newConversation} disabled={streaming} aria-label="Cuộc trò chuyện mới">
            <Icon name="plus" />
          </button>
        </header>

        {empty ? (
          <div className="aw-welcome">
            <h2>
              <img src="/sao-do-logo.png" alt="Đại học Sao Đỏ" width={36} height={36} className="aw-welcome-logo" />{" "}
              {greeting(new Date(now))}, Đại học Sao Đỏ
            </h2>
            <p>
              {enabled
                ? "Hôm nay bạn muốn học gì? Trợ lý trả lời bằng tiếng Việt và đã kết nối dữ liệu học tập thật của bạn."
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
                        <span className="aw-avatar" aria-hidden="true"><PhuongFlower size={20} /></span>
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
    </>,
    `${sideCollapsed ? "is-collapsed" : ""} ${sideOpen ? "is-open" : ""}`,
  );
}
