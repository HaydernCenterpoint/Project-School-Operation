"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/Icon";
import {
  community,
  isVideo,
  mediaAccept,
  mediaLimits,
  mediaProblem,
  type ChatMessage,
  type Profile,
  type RoomSummary,
} from "@/lib/community";
import { useAvatarSync } from "@/lib/avatar";
import { initials } from "@/lib/format";
import { clock, longDay, shortDay } from "@/lib/portal-demo";

const maxLength = 2000;
const groupWindow = 5 * 60_000;

export function when(iso: string) {
  return isToday(iso) ? clock(iso) : shortDay(iso);
}

const isToday = (iso: string) => shortDay(iso) === shortDay(Date.now());
const sameDay = (a: string, b: string) => shortDay(a) === shortDay(b);
const stamp = (iso: string) => `${isToday(iso) ? "Hôm nay" : shortDay(iso)} · ${clock(iso)}`;

const continues = (previous: ChatMessage | undefined, next: ChatMessage | undefined) =>
  Boolean(
    previous &&
      next &&
      !next.reply_to &&
      previous.author_id === next.author_id &&
      sameDay(previous.created_at, next.created_at) &&
      Date.parse(next.created_at) - Date.parse(previous.created_at) < groupWindow,
  );

export const topicSlug: Record<string, string> = {
  "Học tập": "study",
  "Câu lạc bộ": "club",
  "Việc làm": "career",
  "Thể thao": "sport",
  "Tự do": "social",
};

export function userTone(id: string | undefined): number {
  if (!id) return 0;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 6;
}

export function Avatar({
  profile,
  size = "md",
  online,
}: {
  profile: Pick<Profile, "user_id" | "display_name"> | undefined;
  size?: "sm" | "md" | "lg";
  online?: boolean;
}) {
  const customUrl = useAvatarSync(profile?.user_id, false);
  const tone = userTone(profile?.user_id);
  return (
    <span className={`cm-avatar cm-avatar-${size}`} data-tone={tone} aria-hidden="true">
      {customUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local/custom avatar data URL
        <img src={customUrl} alt="" className="avatar-img" />
      ) : profile ? (
        initials(profile.display_name)
      ) : (
        "?"
      )}
      {online && <i className="cm-avatar-dot" />}
    </span>
  );
}

export const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Body({
  message,
  people,
  me,
  onProfile,
}: {
  message: ChatMessage;
  people: Map<string, Profile>;
  me: string;
  onProfile: (id: string) => void;
}) {
  const named = message.mentions.map((id) => people.get(id)).filter((item): item is Profile => Boolean(item));
  if (!named.length) return <>{message.body}</>;
  const byName = new Map(named.map((item) => [`@${item.display_name}`, item]));
  const pattern = new RegExp(`(${[...byName.keys()].sort((a, b) => b.length - a.length).map(escape).join("|")})`, "g");
  return (
    <>
      {message.body.split(pattern).map((part, index) => {
        const person = byName.get(part);
        return person ? (
          <button
            key={index}
            type="button"
            className={`cm-mention${person.user_id === me ? " is-me" : ""}`}
            onClick={() => onProfile(person.user_id)}
          >
            {part}
          </button>
        ) : (
          part
        );
      })}
    </>
  );
}

export function ChatRoom({
  room,
  me,
  people,
  onBack,
  onProfile,
  onChanged,
  onUnknownAuthor,
}: {
  room: RoomSummary;
  me: Profile;
  people: Map<string, Profile>;
  onBack: () => void;
  onProfile: (id: string) => void;
  onChanged: () => Promise<void>;
  onUnknownAuthor: () => Promise<void>;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [suggest, setSuggest] = useState<{ start: number; query: string; index: number } | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [viewing, setViewing] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const viewer = useRef<HTMLDialogElement>(null);
  const [showInfo, setShowInfo] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const readUpTo = useRef("");

  const joined = members.length ? members.includes(me.user_id) : room.joined;
  const other = room.kind === "dm" ? people.get(room.dm_user ?? "") : undefined;
  const title = room.kind === "dm" ? (other?.display_name ?? "Tin nhắn riêng") : room.name!;
  const roomTone = room.kind === "group" ? (topicSlug[room.topic] ?? "study") : "dm";

  const load = useCallback(async () => {
    try {
      const [list, ids] = await Promise.all([community.messages(room.id), community.members(room.id)]);
      const signed = await community.mediaUrls(list);
      setMessages(list);
      setMembers(ids);
      setUrls((old) =>
        [...signed].every(([path, url]) => old.get(path) === url) && old.size === signed.size ? old : signed,
      );
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được tin nhắn");
    }
  }, [room.id]);

  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(() => () => filesRef.current.forEach((item) => URL.revokeObjectURL(item.url)), []);

  function attach(pickedFiles: File[]) {
    const problems = pickedFiles.map(mediaProblem).filter(Boolean);
    const ok = pickedFiles.filter((file) => !mediaProblem(file));
    const space = mediaLimits.maxFiles - files.length;
    if (ok.length > space) problems.push(`Tối đa ${mediaLimits.maxFiles} ảnh hoặc video`);
    setFiles((current) => [
      ...current,
      ...ok.slice(0, Math.max(0, space)).map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
    setError(problems.join(" · "));
    input.current?.focus();
  }

  function detach(index: number) {
    setFiles((current) => {
      URL.revokeObjectURL(current[index]!.url);
      return current.filter((_, at) => at !== index);
    });
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    attach([...(event.target.files ?? [])]);
    event.target.value = "";
  }
  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = [...event.clipboardData.files];
    if (pasted.length) {
      event.preventDefault();
      attach(pasted);
    }
  }
  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (joined) attach([...event.dataTransfer.files]);
  }

  function view(url: string) {
    setViewing(url);
    requestAnimationFrame(() => viewer.current?.showModal());
  }

  useEffect(() => {
    queueMicrotask(() => void load());
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (
      messages?.some((message) => !people.has(message.author_id)) ||
      members.some((id) => !people.has(id))
    ) {
      void onUnknownAuthor();
    }
  }, [messages, members, people, onUnknownAuthor]);

  const newest = messages?.at(-1);
  useEffect(() => {
    if (!joined || !newest || readUpTo.current >= newest.created_at) return;
    readUpTo.current = newest.created_at;
    void community
      .markRead(room.id, me.user_id, newest.created_at)
      .then(onChanged)
      .catch(() => undefined);
  }, [joined, newest, room.id, me.user_id, onChanged]);

  useEffect(() => {
    if (stick.current) log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages]);

  function onScroll() {
    const box = log.current!;
    stick.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  }

  const candidates = suggest
    ? members
        .filter((id) => id !== me.user_id)
        .map((id) => people.get(id))
        .filter((item): item is Profile => Boolean(item) && fold(item!.display_name).includes(fold(suggest.query)))
        .slice(0, 6)
    : [];

  function onType(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setDraft(value);
    const before = value.slice(0, event.target.selectionStart);
    const match = /(?:^|\s)@([^@\n]{0,30})$/.exec(before);
    setSuggest(match ? { start: before.length - match[1]!.length - 1, query: match[1]!, index: 0 } : null);
  }

  function pick(person: Profile) {
    if (!suggest) return;
    const caret = input.current?.selectionStart ?? draft.length;
    const insert = `@${person.display_name} `;
    const next = draft.slice(0, suggest.start) + insert + draft.slice(caret);
    setDraft(next);
    setPicked((value) => new Set(value).add(person.user_id));
    setSuggest(null);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(suggest.start + insert.length, suggest.start + insert.length);
    });
  }

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    if (suggest && candidates.length) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setSuggest({ ...suggest, index: (suggest.index + step + candidates.length) % candidates.length });
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        pick(candidates[suggest.index] ?? candidates[0]!);
        return;
      }
    }
    if (event.key === "Escape") {
      if (suggest) setSuggest(null);
      else setReplyTo(null);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if ((!body && !files.length) || sending || !joined) return;
    const mentions = new Set(
      [...picked].filter((id) => people.get(id) && body.includes(`@${people.get(id)!.display_name}`)),
    );
    if (replyTo && replyTo.author_id !== me.user_id) mentions.add(replyTo.author_id);
    setSending(true);
    let media: string[] = [];
    try {
      media = await community.upload(room.id, me.user_id, files.map((item) => item.file));
      await community.send({
        room_id: room.id,
        author_id: me.user_id,
        body: body.slice(0, maxLength),
        reply_to: replyTo?.id ?? null,
        mentions: [...mentions],
        media,
      });
      files.forEach((item) => URL.revokeObjectURL(item.url));
      setFiles([]);
      setDraft("");
      setPicked(new Set());
      setReplyTo(null);
      stick.current = true;
      await load();
    } catch (sendError) {
      await community.removeMedia(media).catch(() => undefined);
      setError(sendError instanceof Error ? sendError.message : "Không gửi được tin nhắn");
    } finally {
      setSending(false);
      input.current?.focus();
    }
  }

  async function remove(message: ChatMessage) {
    if (!window.confirm("Xoá tin nhắn này?")) return;
    try {
      await community.remove(message);
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Không xoá được tin nhắn");
    }
  }

  async function membership(join: boolean) {
    if (!join && !window.confirm(`Rời nhóm ${title}?`)) return;
    try {
      await (join ? community.join(room.id, me.user_id) : community.leave(room.id, me.user_id));
      await Promise.all([load(), onChanged()]);
      if (join) input.current?.focus();
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Không thực hiện được thao tác");
    }
  }

  function jumpTo(id: string) {
    const target = document.getElementById(`msg-${id}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.classList.add("is-flash");
    window.setTimeout(() => target?.classList.remove("is-flash"), 1400);
  }

  const byId = new Map(messages?.map((message) => [message.id, message]));
  const roster = members
    .map((id) => people.get(id))
    .filter((item): item is Profile => Boolean(item))
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "vi"));
  const headcount = members.length || room.member_count;

  return (
    <div
      className={`cm-room${showInfo && room.kind === "group" ? " show-info" : ""}${dragging ? " is-dragging" : ""}`}
      data-topic={roomTone}
      onDragOver={(event) => {
        if (!joined || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <header className="cm-room-head">
        <button
          className="cm-btn-icon cm-back"
          type="button"
          onClick={onBack}
          aria-label="Quay lại danh sách kênh"
        >
          <Icon name="back" />
        </button>
        <div className="cm-room-id">
          {room.kind === "dm" ? (
            <Avatar profile={other} size="sm" online />
          ) : (
            <span className="cm-glyph" data-topic={roomTone} aria-hidden="true">
              <Icon name={room.icon} />
            </span>
          )}
          <div className="cm-room-title-wrap">
            <div className="cm-room-title-line">
              <h2>
                {room.kind === "dm" ? (
                  <button
                    type="button"
                    className="cm-title-link"
                    onClick={() => other && onProfile(other.user_id)}
                  >
                    {title}
                  </button>
                ) : (
                  title
                )}
              </h2>
              {room.kind === "dm" && other?.student_code && (
                <code className="cm-cohort">
                  {other.student_code}
                  {other.class_name ? ` · ${other.class_name}` : ""}
                </code>
              )}
              {room.kind === "group" && (
                <span className="cm-row-topic">{room.topic}</span>
              )}
              {room.kind === "group" && (
                <span className="cm-mono-meta">{headcount} thành viên</span>
              )}
            </div>
          </div>
        </div>
        {room.kind === "group" && (
          <div className="cm-room-head-actions">
            {roster.length > 0 && (
              <div className="cm-avatar-stack" title={`${roster.length} thành viên`}>
                {roster.slice(0, 3).map((person) => (
                  <button
                    key={person.user_id}
                    type="button"
                    className="cm-stack-item"
                    onClick={() => onProfile(person.user_id)}
                    title={person.display_name}
                  >
                    <Avatar profile={person} size="sm" />
                  </button>
                ))}
                {roster.length > 3 && <span className="cm-stack-more">+{roster.length - 3}</span>}
              </div>
            )}
            <button
              className="cm-btn-icon"
              type="button"
              onClick={() => setShowInfo((value) => !value)}
              aria-pressed={showInfo}
              aria-label="Thông tin kênh và thành viên"
              title="Danh sách thành viên"
            >
              <Icon name="users" />
            </button>
          </div>
        )}
      </header>

      <div className="cm-room-body">
        <div
          className="cm-log"
          ref={log}
          onScroll={onScroll}
          role="log"
          aria-live="polite"
          aria-label={`Tin nhắn trong ${title}`}
        >
          {messages === null ? (
            <div className="cm-log-skeleton" aria-busy="true">
              <span className="sr-only">Đang tải tin nhắn</span>
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton is-mine" />
              <div className="skeleton" />
            </div>
          ) : messages.length === 0 ? (
            <div className="cm-log-empty">
              <strong>{title}</strong>
              <p>Chưa có tin nhắn</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const mine = message.author_id === me.user_id;
                const author = people.get(message.author_id);
                const newDay = !previous || !sameDay(previous.created_at, message.created_at);
                const first = !continues(previous, message);
                const last = !continues(message, messages[index + 1]);
                const parent = message.reply_to ? byId.get(message.reply_to) : undefined;
                const pingsMe = message.mentions.includes(me.user_id);
                return (
                  <div key={message.id}>
                    {newDay && (
                      <p className="cm-day">
                        <span>{isToday(message.created_at) ? "Hôm nay" : longDay(message.created_at)}</span>
                      </p>
                    )}
                    <article
                      id={`msg-${message.id}`}
                      className={`cm-msg${mine ? " is-mine" : ""}${first ? " is-first" : ""}${last ? " is-last" : ""}${pingsMe ? " is-ping" : ""}`}
                    >
                      {!mine && (
                        <div className="cm-msg-side">
                          {first && (
                            <button
                              type="button"
                              className="cm-msg-avatar"
                              onClick={() => onProfile(message.author_id)}
                              aria-label={`Hồ sơ ${author?.display_name ?? ""}`}
                            >
                              <Avatar profile={author} size="sm" />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="cm-stack">
                        {first && (
                          <p className="cm-msg-meta">
                            {!mine && (
                              <>
                                <button
                                  type="button"
                                  className="cm-name"
                                  onClick={() => onProfile(message.author_id)}
                                >
                                  {author?.display_name ?? "Thành viên"}
                                </button>
                                {author?.class_name ? (
                                  <code className="cm-msg-cohort">{author.class_name}</code>
                                ) : author?.faculty ? (
                                  <code className="cm-msg-cohort">{author.faculty}</code>
                                ) : null}
                              </>
                            )}
                            <time dateTime={message.created_at}>{stamp(message.created_at)}</time>
                          </p>
                        )}
                        <div className="cm-bubble-row">
                          <div
                            className={`cm-bubble${message.media.length ? " has-media" : ""}${message.body.trim() ? "" : " is-media-only"}`}
                            title={stamp(message.created_at)}
                          >
                            {message.reply_to && (
                              <button
                                type="button"
                                className="cm-quote"
                                onClick={() => parent && jumpTo(parent.id)}
                                disabled={!parent}
                              >
                                {parent ? (
                                  <>
                                    <b>{people.get(parent.author_id)?.display_name ?? "Thành viên"}</b>
                                    <span>
                                      {parent.body.trim() || (parent.media.some(isVideo) ? "Video" : "Hình ảnh")}
                                    </span>
                                  </>
                                ) : (
                                  <span className="cm-quote-missing">Tin nhắn gốc đã xoá</span>
                                )}
                              </button>
                            )}
                            {message.media.length > 0 && (
                              <div className={`cm-media cm-media-${Math.min(message.media.length, 4)}`}>
                                {message.media.map((path) => {
                                  const url = urls.get(path);
                                  if (!url) {
                                    return (
                                      <span key={path} className="cm-media-missing">
                                        Không tải được tệp
                                      </span>
                                    );
                                  }
                                  return isVideo(path) ? (
                                    <video
                                      key={path}
                                      src={url}
                                      controls
                                      preload="metadata"
                                      playsInline
                                      aria-label={`Video của ${author?.display_name ?? "thành viên"}`}
                                    />
                                  ) : (
                                    <button
                                      key={path}
                                      type="button"
                                      className="cm-media-open"
                                      onClick={() => view(url)}
                                      aria-label={`Xem ảnh của ${author?.display_name ?? "thành viên"}`}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URLs */}
                                      <img src={url} alt="" loading="lazy" decoding="async" />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {message.body.trim() && (
                              <p className="cm-text">
                                <Body message={message} people={people} me={me.user_id} onProfile={onProfile} />
                              </p>
                            )}
                          </div>
                          <div className="cm-tools">
                            {joined && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyTo(message);
                                  input.current?.focus();
                                }}
                                aria-label={`Trả lời ${author?.display_name ?? ""}`}
                                title="Trả lời"
                              >
                                <Icon name="reply" />
                              </button>
                            )}
                            {mine && (
                              <button
                                type="button"
                                onClick={() => void remove(message)}
                                aria-label="Xoá tin nhắn"
                                title="Xoá"
                              >
                                <Icon name="trash" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {room.kind === "group" && (
          <aside className="cm-info" aria-label="Thành viên kênh">
            <div className="cm-info-top">
              <strong>Thành viên ({roster.length})</strong>
              <button
                className="cm-btn-icon cm-info-close"
                type="button"
                onClick={() => setShowInfo(false)}
                aria-label="Đóng danh sách thành viên"
              >
                <Icon name="close" />
              </button>
            </div>
            {room.about && <p className="cm-info-about">{room.about}</p>}
            <ul className="cm-roster">
              {roster.map((person, idx) => (
                <li key={person.user_id}>
                  <button type="button" onClick={() => onProfile(person.user_id)}>
                    <Avatar profile={person} size="sm" online={idx < 4} />
                    <span className="cm-roster-body">
                      <strong>
                        {person.display_name}
                        {person.user_id === me.user_id && <small> (bạn)</small>}
                      </strong>
                      {(person.student_code || person.class_name || person.faculty) && (
                        <code className="cm-roster-code">
                          {[person.student_code, person.class_name ?? person.faculty].filter(Boolean).join(" · ")}
                        </code>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {joined && (
              <button
                className="button button-outline button-small cm-leave"
                type="button"
                onClick={() => void membership(false)}
              >
                <Icon name="logout" /> Rời kênh
              </button>
            )}
          </aside>
        )}
      </div>

      {error && (
        <p className="pt-warn cm-error" role="alert">
          {error}
        </p>
      )}

      {joined ? (
        <form className="cm-compose" onSubmit={send}>
          {replyTo && (
            <p className="cm-replying">
              <Icon name="reply" />
              <span>
                <b>{people.get(replyTo.author_id)?.display_name ?? "Thành viên"}</b>
                <span className="cm-replying-body">{replyTo.body}</span>
              </span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Huỷ trả lời">
                <Icon name="close" />
              </button>
            </p>
          )}
          {suggest && candidates.length > 0 && (
            <ul id="cm-suggest" className="cm-suggest" role="listbox" aria-label="Nhắc tên thành viên">
              {candidates.map((person, index) => (
                <li key={person.user_id} role="option" aria-selected={index === suggest.index}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pick(person);
                    }}
                  >
                    <Avatar profile={person} size="sm" />
                    <span>{person.display_name}</span>
                    {person.class_name && <code className="cm-cohort">{person.class_name}</code>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {files.length > 0 && (
            <ul className="cm-tray" aria-label="Tệp đính kèm">
              {files.map((item, index) => (
                <li key={item.url}>
                  {item.file.type.startsWith("video/") ? (
                    <video src={item.url} muted preload="metadata" aria-hidden="true" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                    <img src={item.url} alt="" />
                  )}
                  {item.file.type.startsWith("video/") && (
                    <span className="cm-tray-kind" aria-hidden="true">
                      <Icon name="play" />
                    </span>
                  )}
                  <button type="button" onClick={() => detach(index)} aria-label={`Bỏ ${item.file.name}`}>
                    <Icon name="close" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="cm-compose-row">
            <input ref={picker} type="file" accept={mediaAccept} multiple hidden onChange={onPick} />
            <button
              className="cm-attach"
              type="button"
              onClick={() => picker.current?.click()}
              disabled={files.length >= mediaLimits.maxFiles || sending}
              aria-label="Đính kèm ảnh hoặc video"
              title="Đính kèm ảnh hoặc video"
            >
              <Icon name="image" />
            </button>
            <label className="sr-only" htmlFor="cm-draft">
              Nhắn tới {title}
            </label>
            <textarea
              id="cm-draft"
              ref={input}
              autoFocus
              value={draft}
              onChange={onType}
              onKeyDown={onKey}
              onPaste={onPaste}
              rows={1}
              maxLength={maxLength}
              placeholder={room.kind === "dm" ? `Nhắn cho ${title}` : `Nhắn trong ${title}`}
              role="combobox"
              aria-autocomplete="list"
              aria-controls="cm-suggest"
              aria-expanded={Boolean(suggest && candidates.length)}
            />
            <button
              className="cm-send"
              type="submit"
              disabled={(!draft.trim() && !files.length) || sending}
              aria-label={sending && files.length ? "Đang gửi tệp" : "Gửi tin nhắn"}
            >
              <Icon name="send" />
            </button>
          </div>
        </form>
      ) : (
        <div className="cm-join">
          <p>
            <b>{title}</b> · {headcount} thành viên
          </p>
          <button
            className="button button-primary button-small"
            type="button"
            onClick={() => void membership(true)}
          >
            Tham gia
          </button>
        </div>
      )}

      <dialog
        ref={viewer}
        className="cm-viewer"
        aria-label="Xem ảnh"
        onClose={() => setViewing(null)}
        onClick={(event) => event.target === event.currentTarget && viewer.current?.close()}
      >
        {viewing && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
            <img src={viewing} alt="Ảnh đính kèm trong cuộc trò chuyện" />
            <div className="cm-viewer-bar">
              <a
                className="cm-btn-icon"
                href={viewing}
                target="_blank"
                rel="noreferrer"
                aria-label="Mở ảnh gốc ở thẻ mới"
              >
                <Icon name="external" />
              </a>
              <button
                className="cm-btn-icon"
                type="button"
                onClick={() => viewer.current?.close()}
                aria-label="Đóng"
              >
                <Icon name="close" />
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
