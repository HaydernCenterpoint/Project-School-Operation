"use client";

/* eslint-disable @next/next/no-img-element -- small static logo */
import type { AiConversation, AiMessage, AiMode, AiStreamEvent, AiUsage } from "@sao-do/contracts";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import "@/components/app-phuong.css";
import "@/components/ai-workspace.css";
import "@/app/landing.css";
import { useAiIntro } from "@/components/AiIntro";
import { SceneCurtain } from "@/components/landing/SceneTransition";
import { Icon, type IconName } from "@/components/Icon";
import { phuongFonts } from "@/components/landing/fonts";
import { PhuongFlower } from "@/components/landing/Phuong";
import { Markdown } from "@/components/Markdown";
import { aiErrorMessage, aiRequest, AiRequestError, streamChat } from "@/lib/ai-client";
import { formatSize, addFiles, filesFromDrop, type Attachment } from "@/lib/ai-files";
import { initials } from "@/lib/format";
import { useStudent } from "@/lib/student-context";
import { usePhuongTheme } from "@/lib/theme";

const modes: {
  key: AiMode;
  label: string;
  desc: string;
  icon: IconName;
  hint: string;
  suggestions: { tag: string; text: string }[];
}[] = [
  {
    key: "explain",
    label: "Giải thích",
    desc: "Phân tích khái niệm từng bước kèm ví dụ trực quan",
    icon: "book",
    hint: "Nhập khái niệm, định lý hoặc đoạn mã cần giải thích…",
    suggestions: [
      { tag: "IT3040 · Kỹ thuật lập trình", text: "Giải thích đệ quy và ngăn xếp lời gọi hàm bằng ví dụ thực tế" },
      { tag: "IT3080 · Cơ sở dữ liệu", text: "Vì sao cần chuẩn hoá bảng lên 3NF và khi nào nên dừng ở 2NF" },
    ],
  },
  {
    key: "summarize",
    label: "Tóm tắt",
    desc: "Cô đọng giáo trình, ghi chép trên lớp thành ý cốt lõi",
    icon: "list",
    hint: "Dán ghi chép bài giảng hoặc đính kèm tài liệu PDF cần tóm tắt…",
    suggestions: [
      { tag: "Đề cương học phần", text: "Tóm tắt chương này thành 5 luận điểm chính kèm công thức cần nhớ:" },
      { tag: "Ôn tập trước giờ thi", text: "Rút gọn ghi chép bài giảng sau thành bảng đối chiếu ngắn gọn:" },
    ],
  },
  {
    key: "practice",
    label: "Luyện tập",
    desc: "Tạo câu hỏi tự lượng giá và gợi ý hướng suy luận",
    icon: "question",
    hint: "Nhập chương học hoặc chủ đề muốn tự kiểm tra…",
    suggestions: [
      { tag: "IT3090 · Mạng máy tính", text: "Ra 5 câu hỏi tình huống về định tuyến IP và bắt tay TCP 3 bước" },
      { tag: "IT3011 · Cấu trúc dữ liệu", text: "Đố 3 bài toán phân tích độ phức tạp thời gian của cây tìm kiếm nhị phân" },
    ],
  },
  {
    key: "plan",
    label: "Lập kế hoạch",
    desc: "Chia mốc ôn tập và tiến độ bài tập lớn theo tuần",
    icon: "calendar",
    hint: "Nêu môn học, hạn nộp và quỹ thời gian trong tuần của bạn…",
    suggestions: [
      { tag: "Lịch ôn thi học kỳ", text: "Lập lộ trình ôn thi cuối kỳ 4 môn chuyên ngành trong 14 ngày" },
      { tag: "Đồ án môn học", text: "Chia nhỏ bài tập lớn thành các mốc kiểm tra theo từng tuần" },
    ],
  },
];

const consentKey = "sao-do:ai-consent";
const sideKey = "sao-do:ai-side-collapsed";

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
  const { data, error: loadError, refresh } = useStudent();
  const { theme, toggleTheme } = usePhuongTheme();
  const token = data?.token ?? "";
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
  const controller = useRef<AbortController | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const imagePicker = useRef<HTMLInputElement>(null);
  const filePicker = useRef<HTMLInputElement>(null);
  const folderPicker = useRef<HTMLInputElement>(null);

  const loadMeta = useCallback(async () => {
    if (!token) return;
    try {
      const [nextUsage, list] = await Promise.all([
        aiRequest<AiUsage>("/api/ai/usage", token),
        aiRequest<{ conversations: AiConversation[] }>("/api/ai/conversations", token),
      ]);
      setUsage(nextUsage);
      setConversations(list.conversations);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : aiErrorMessage("unknown"));
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

  const title = conversations.find((item) => item.id === activeId)?.title ?? (messages.length ? "Cuộc trò chuyện" : "Cuộc trò chuyện mới");
  useEffect(() => {
    document.title = `${title} | Trợ lý AI Sao Đỏ`;
  }, [title]);

  const newConversation = useCallback(() => {
    if (streaming) return;
    setActiveId(null);
    setMessages([]);
    setNotice("");
    setSideOpen(false);
    requestAnimationFrame(() => composer.current?.focus());
  }, [streaming]);

  // Ctrl/⌘ + Shift + O starts a new conversation, as in other chat tools.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        newConversation();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newConversation]);

  async function openConversation(id: string) {
    if (streaming) return;
    setActiveId(id);
    setNotice("");
    setSideOpen(false);
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

  async function deleteConversation(id: string) {
    if (!window.confirm("Xoá vĩnh viễn cuộc trò chuyện này?")) return;
    try {
      await aiRequest(`/api/ai/conversations/${id}`, token, { method: "DELETE" });
      setConversations((items) => items.filter((item) => item.id !== id));
      if (activeId === id) newConversation();
      setStatus("Đã xoá cuộc trò chuyện");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : aiErrorMessage("unknown"));
    }
  }

  async function send(content: string) {
    const files = attachments;
    // Files alone are a valid question; give the model something to answer.
    const text = content.trim() || (files.length ? "Hãy xem giúp mình các tệp đính kèm" : "");
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
    setMessages((items) => [
      ...items,
      {
        id: `user-${requestId}`,
        role: "user",
        content: text,
        status: "complete",
        createdAt: new Date().toISOString(),
        files: files.map(({ id, name, kind, preview }) => ({ id, name, kind, preview })),
      },
      { id: assistantId, role: "assistant", content: "", status: "pending", createdAt: new Date().toISOString() },
    ]);
    const patch = (update: (message: Message) => Message) =>
      setMessages((items) => items.map((item) => (item.id === assistantId ? update(item) : item)));

    try {
      await streamChat(
        token,
        { conversationId: activeId, mode, content: text, assignmentId: assignmentId || null },
        requestId,
        (event: AiStreamEvent) => {
          if (event.type === "start") setActiveId(event.conversationId);
          else if (event.type === "delta") patch((item) => ({ ...item, content: item.content + event.text }));
          else if (event.type === "complete") patch((item) => ({ ...item, status: "complete" }));
          else
            patch((item) => ({
              ...item,
              status: event.code === "cancelled" || item.content ? "interrupted" : "failed",
              error: aiErrorMessage(event.code),
              retryContent: text,
            }));
        },
        abort.signal,
        files.map((file) => ({ blob: file.blob, name: file.name })),
      );
      setStatus("Trợ lý đã trả lời xong");
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
    if (result.added.length) setStatus(`Đã đính kèm ${result.added.length} tệp`);
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
        <PhuongFlower size={56} className="aw-loading-flower" />
        <p className="aw-loading-text">Đang mở trợ lý học tập…</p>
      </div>,
    );
  }

  if (!consent) {
    return root(
      <div className="aw-center">
        <div className="aw-consent">
          <PhuongFlower size={44} />
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
  const enabled = usage?.enabled ?? false;
  const exhausted = usage ? usage.used >= usage.limit : false;
  const name = data.session.user.displayName;
  const filtered = query.trim()
    ? conversations.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()))
    : conversations;
  const empty = !messages.length && !loadingThread;
  const selectedAssignment = data.assignments.find((item) => item.id === assignmentId);

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
              <Icon name="image" />
              <span><strong>Ảnh bài làm</strong><small>Chụp màn hình, ảnh vở ghi</small></span>
            </button>
            <button type="button" onClick={() => pick(filePicker.current)}>
              <Icon name="file" />
              <span><strong>Tài liệu & mã nguồn</strong><small>PDF, văn bản, tệp lập trình</small></span>
            </button>
            <button type="button" onClick={() => pick(folderPicker.current)}>
              <Icon name="class" />
              <span><strong>Thư mục dự án</strong><small>Tải lên toàn bộ thư mục bài tập</small></span>
            </button>
            <p>Tối đa 30 MB · 100 tệp · hỗ trợ kéo thả hoặc dán trực tiếp</p>
          </div>
          <input ref={imagePicker} type="file" hidden multiple accept="image/png,image/jpeg,image/gif,image/webp" onChange={onPicked} />
          <input ref={filePicker} type="file" hidden multiple onChange={onPicked} />
          <input ref={folderPicker} type="file" hidden multiple {...({ webkitdirectory: "" } as Record<string, string>)} onChange={onPicked} />
          <label className="aw-pill" title="Đính kèm bài tập làm ngữ cảnh">
            <Icon name="assignment" />
            <span className="sr-only">Đính kèm bài tập làm ngữ cảnh</span>
            <select value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} disabled={streaming}>
              <option value="">Không gắn bài tập</option>
              {data.assignments.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
          {!empty && (
            <label className="aw-pill">
              <Icon name={currentMode.icon} />
              <span className="sr-only">Chế độ học</span>
              <select value={mode} onChange={(event) => setMode(event.target.value as AiMode)} disabled={streaming}>
                {modes.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
            </label>
          )}
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
      <p className="aw-disclaimer">Trợ lý AI hỗ trợ gợi mở phương pháp — hãy tự kiểm chứng với giáo trình trước khi nộp bài</p>
    </form>
  );

  return root(
    <>
      <aside className="aw-side" aria-label="Lịch sử trò chuyện" id="aw-side">
        <div className="aw-side-head">
          <Link href="/student" className="aw-brand" aria-label="Về cổng học tập">
            <img src="/sao-do-logo.png" alt="" width={28} height={30} />
            <span>
              <strong>Trợ lý Sao Đỏ</strong>
              <small>Bàn học học thuật</small>
            </span>
          </Link>
          <button className="icon-button" type="button" onClick={toggleSide} aria-label="Đóng thanh bên" aria-controls="aw-side">
            <Icon name="panel" />
          </button>
        </div>
        <button className="aw-new" type="button" onClick={newConversation} disabled={streaming}>
          <Icon name="plus" />
          <span>Trò chuyện mới</span>
          <kbd className="aw-kbd">Ctrl ⇧ O</kbd>
        </button>
        <label className="aw-search">
          <Icon name="search" />
          <span className="sr-only">Tìm cuộc trò chuyện</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm lịch sử học tập" />
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
                        onClick={() => void deleteConversation(item.id)}
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
            <p className="aw-muted">{query ? "Không tìm thấy cuộc trò chuyện" : "Chưa có phiên trao đổi nào"}</p>
          )}
        </nav>
        <div className="aw-side-foot">
          <div className="aw-user">
            <span className="avatar aw-user-avatar">{initials(name)}</span>
            <span>
              <strong>{name}</strong>
              <small>Sinh viên</small>
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
          <span className="aw-top-meta">
            <i className={`aw-status-dot${enabled ? " is-online" : ""}`} aria-hidden="true" />
            {currentMode.label}
            {selectedAssignment ? ` · ${selectedAssignment.title}` : ""}
          </span>
          <button className="icon-button aw-top-new" type="button" onClick={newConversation} disabled={streaming} aria-label="Cuộc trò chuyện mới">
            <Icon name="plus" />
          </button>
        </header>

        {empty ? (
          <div className="aw-welcome">
            <div className="aw-desk-head">
              <div>
                <h2>Bàn học & ôn luyện học phần</h2>
                <p>
                  {enabled
                    ? currentMode.desc
                    : usage
                      ? aiErrorMessage("ai_disabled")
                      : "Đang kiểm tra trạng thái trợ lý…"}
                </p>
              </div>
              <span className="aw-desk-badge">
                <i className={`aw-status-dot${enabled ? " is-online" : ""}`} aria-hidden="true" />
                <span>{data.assignments.length} bài tập trong kỳ</span>
              </span>
            </div>

            <div className="aw-modes" role="group" aria-label="Chế độ học">
              {modes.map((item) => (
                <button key={item.key} type="button" aria-pressed={item.key === mode} onClick={() => setMode(item.key)}>
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {composerForm}

            {enabled && !exhausted && (
              <div className="aw-suggestions" aria-label="Gợi ý câu hỏi theo học phần">
                {currentMode.suggestions.map((item) => (
                  <button
                    key={item.text}
                    type="button"
                    onClick={() => {
                      setDraft(item.text.endsWith(":") ? `${item.text}\n` : item.text);
                      composer.current?.focus();
                    }}
                  >
                    <div className="aw-suggestion-body">
                      <code>{item.tag}</code>
                      <span>{item.text}</span>
                    </div>
                    <Icon name="arrow" />
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
    </>,
    `${sideCollapsed ? "is-collapsed" : ""} ${sideOpen ? "is-open" : ""}`,
  );
}
