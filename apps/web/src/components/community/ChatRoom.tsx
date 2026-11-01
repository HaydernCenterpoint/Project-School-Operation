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
  QUICK_REACTIONS,
  ROOM_ACCENTS,
  ROOM_PHOTO_PRESETS,
  roomIcons,
  topics,
  useChatPreferences,
  type ChatMessage,
  type Profile,
  type RoomAccent,
  type RoomIcon,
  type RoomPatch,
  type RoomSummary,
  type Topic,
} from "@/lib/community";
import { cropAvatarFile, getDefaultUserAvatar, useAvatarSync } from "@/lib/avatar";
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
  crown,
}: {
  profile: Pick<Profile, "user_id" | "display_name" | "avatar_url"> | undefined;
  size?: "xs" | "sm" | "md" | "lg";
  online?: boolean;
  crown?: boolean;
}) {
  const syncedUrl = useAvatarSync(profile?.user_id, false);
  const resolvedUrl =
    syncedUrl ??
    profile?.avatar_url ??
    (profile ? getDefaultUserAvatar(profile.user_id, profile.display_name) : null);
  const tone = userTone(profile?.user_id);

  return (
    <span
      className={`cm-avatar cm-avatar-${size}`}
      data-tone={tone}
      title={profile?.display_name}
      aria-hidden="true"
    >
      {resolvedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local/custom or SVG portrait data URL
        <img src={resolvedUrl} alt="" className="avatar-img" />
      ) : profile ? (
        initials(profile.display_name)
      ) : (
        "?"
      )}
      {online && <i className="cm-avatar-dot" />}
      {crown && (
        <i className="cm-avatar-crown" title="Chủ nhóm">
          ★
        </i>
      )}
    </span>
  );
}

export function RoomAvatar({
  room,
  size = "md",
  editable = false,
  onEdit,
}: {
  room: Pick<RoomSummary, "name" | "icon" | "avatar_url" | "topic" | "accent">;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  onEdit?: () => void;
}) {
  const slug = topicSlug[room.topic] ?? "study";
  const content = (
    <>
      {room.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- group avatar image or preset
        <img src={room.avatar_url} alt="" className="cm-room-avatar-img" />
      ) : (
        <Icon name={room.icon} />
      )}
      {editable && (
        <span className="cm-room-avatar-edit" title="Đổi ảnh đại diện nhóm">
          <Icon name="image" />
        </span>
      )}
    </>
  );

  if (editable && onEdit) {
    return (
      <button
        type="button"
        className={`cm-glyph cm-glyph-${size} is-editable${room.avatar_url ? " has-img" : ""}`}
        data-topic={slug}
        data-accent={room.accent}
        onClick={onEdit}
        aria-label={`Đổi ảnh đại diện nhóm ${room.name ?? ""}`}
        title="Bấm để đổi ảnh đại diện & cài đặt nhóm (Chủ nhóm)"
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={`cm-glyph cm-glyph-${size}${room.avatar_url ? " has-img" : ""}`}
      data-topic={slug}
      data-accent={room.accent}
      aria-hidden="true"
    >
      {content}
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
  const { prefs, updatePrefs, resetPrefs } = useChatPreferences();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [editBody, setEditBody] = useState("");
  const [suggest, setSuggest] = useState<{ start: number; query: string; index: number } | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [viewing, setViewing] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"members" | "customize" | "media">("members");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState("");

  const picker = useRef<HTMLInputElement>(null);
  const quickGroupAvatarInput = useRef<HTMLInputElement>(null);
  const wallpaperInput = useRef<HTMLInputElement>(null);
  const viewer = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const readUpTo = useRef("");

  const joined = members.length ? members.includes(me.user_id) : room.joined;
  const other = room.kind === "dm" ? people.get(room.dm_user ?? "") : undefined;
  const title = room.kind === "dm" ? (other?.display_name ?? "Tin nhắn riêng") : room.name!;
  const roomTone = room.kind === "group" ? (topicSlug[room.topic] ?? "study") : "dm";
  const effectiveAccent: RoomAccent = prefs.accent === "auto" ? (room.accent ?? "crimson") : prefs.accent;

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

  async function onQuickGroupAvatarPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !room.is_owner) return;
    try {
      const cropped = await cropAvatarFile(file, 256);
      await community.updateRoom(room.id, { avatar_url: cropped });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đổi được ảnh đại diện nhóm");
    }
  }

  async function onWallpaperPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const cropped = await cropAvatarFile(file, 960);
      updatePrefs({ wallpaper: "custom", customWallpaperUrl: cropped });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được ảnh nền");
    }
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
      await Promise.all([load(), onChanged()]);
    } catch (sendError) {
      await community.removeMedia(media).catch(() => undefined);
      setError(sendError instanceof Error ? sendError.message : "Không gửi được tin nhắn");
    } finally {
      setSending(false);
      input.current?.focus();
    }
  }

  async function saveEditMessage(event: FormEvent) {
    event.preventDefault();
    if (!editingMsg || !editBody.trim()) return;
    await community.editMessage(editingMsg.id, editBody.trim());
    setEditingMsg(null);
    setEditBody("");
    await Promise.all([load(), onChanged()]);
  }

  async function react(messageId: string, emoji: string) {
    await community.toggleReaction(messageId, me.user_id, emoji);
    await load();
  }

  async function togglePinMessage(messageId: string) {
    const nextPinned = room.pinned_message_id === messageId ? null : messageId;
    await community.updateRoom(room.id, { pinned_message_id: nextPinned });
    await onChanged();
  }

  async function remove(message: ChatMessage) {
    if (!window.confirm("Xoá tin nhắn này?")) return;
    try {
      await community.remove(message);
      await Promise.all([load(), onChanged()]);
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

  function openDrawer(tab: "members" | "customize" | "media") {
    if (drawerOpen && drawerTab === tab) {
      setDrawerOpen(false);
    } else {
      setDrawerTab(tab);
      setDrawerOpen(true);
    }
  }

  const byId = new Map(messages?.map((message) => [message.id, message]));
  const roster = members
    .map((id) => people.get(id))
    .filter((item): item is Profile => Boolean(item))
    .sort((a, b) => {
      const aOwner = a.user_id === room.owner_id ? 2 : room.co_owners.includes(a.user_id) ? 1 : 0;
      const bOwner = b.user_id === room.owner_id ? 2 : room.co_owners.includes(b.user_id) ? 1 : 0;
      if (aOwner !== bOwner) return bOwner - aOwner;
      return a.display_name.localeCompare(b.display_name, "vi");
    });
  const nonMembers = [...people.values()]
    .filter((person) => !members.includes(person.user_id))
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "vi"));
  const headcount = members.length || room.member_count;
  const pinnedMessage = room.pinned_message_id ? byId.get(room.pinned_message_id) : undefined;
  const sharedMediaMessages = (messages ?? []).filter((m) => m.media.length > 0);

  return (
    <div
      className={`cm-room${drawerOpen ? " show-info" : ""}${dragging ? " is-dragging" : ""}`}
      data-topic={roomTone}
      data-accent={effectiveAccent}
      data-wallpaper={prefs.wallpaper}
      data-bubble={prefs.bubbleStyle}
      data-density={prefs.density}
      data-font={prefs.fontSize}
      data-avatar-shape={prefs.avatarShape}
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
      <input
        ref={quickGroupAvatarInput}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onQuickGroupAvatarPick}
      />
      <input
        ref={wallpaperInput}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp"
        onChange={onWallpaperPick}
      />

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
            <button
              type="button"
              className="cm-msg-avatar"
              onClick={() => other && onProfile(other.user_id)}
              title={other?.display_name}
            >
              <Avatar profile={other} size="md" online />
            </button>
          ) : (
            <RoomAvatar
              room={room}
              size="md"
              editable={room.is_owner}
              onEdit={() => setEditDialogOpen(true)}
            />
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
              {room.kind === "group" && <span className="cm-row-topic">{room.topic}</span>}
              {room.kind === "group" && room.is_owner && (
                <button
                  type="button"
                  className="cm-owner-pill"
                  onClick={() => setEditDialogOpen(true)}
                  title="Bạn là Chủ nhóm — bấm để đổi ảnh đại diện & cài đặt nhóm"
                >
                  <Icon name="pen" /> Chủ nhóm · Sửa ảnh & nhóm
                </button>
              )}
            </div>
            <div className="cm-room-subline">
              {room.kind === "group" ? (
                <>
                  <span className="cm-mono-meta">{headcount} thành viên</span>
                  {room.about && <span className="cm-room-about-inline">{room.about}</span>}
                </>
              ) : (
                <span className="cm-room-about-inline">
                  {other?.role_title ?? other?.faculty ?? "Trò chuyện trực tiếp"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="cm-room-head-actions">
          {room.kind === "group" && roster.length > 0 && (
            <div className="cm-avatar-stack" title={`${roster.length} thành viên`}>
              {roster.slice(0, 5).map((person) => (
                <button
                  key={person.user_id}
                  type="button"
                  className="cm-stack-item"
                  onClick={() => onProfile(person.user_id)}
                  title={`${person.display_name}${person.user_id === room.owner_id ? " (Chủ nhóm)" : ""}`}
                >
                  <Avatar
                    profile={person}
                    size="xs"
                    crown={person.user_id === room.owner_id}
                  />
                </button>
              ))}
              {roster.length > 5 && <span className="cm-stack-more">+{roster.length - 5}</span>}
            </div>
          )}

          {room.kind === "group" && room.is_owner && (
            <button
              className="cm-btn-icon"
              type="button"
              onClick={() => setEditDialogOpen(true)}
              aria-label="Chỉnh sửa ảnh và cài đặt nhóm"
              title="Chỉnh sửa ảnh & thông tin nhóm (Chủ nhóm)"
            >
              <Icon name="pen" />
            </button>
          )}

          <button
            className={`cm-btn-icon${drawerOpen && drawerTab === "customize" ? " is-active" : ""}`}
            type="button"
            onClick={() => openDrawer("customize")}
            aria-pressed={drawerOpen && drawerTab === "customize"}
            aria-label="Tuỳ biến giao diện chat"
            title="Tuỳ biến giao diện & chủ đề chat"
          >
            <Icon name="sparkle" />
          </button>

          <button
            className={`cm-btn-icon${drawerOpen && drawerTab === "members" ? " is-active" : ""}`}
            type="button"
            onClick={() => openDrawer("members")}
            aria-pressed={drawerOpen && drawerTab === "members"}
            aria-label="Thông tin kênh và thành viên"
            title="Thành viên & cài đặt kênh"
          >
            <Icon name="panel" />
          </button>
        </div>
      </header>

      {(room.pinned_note || pinnedMessage) && (
        <div className="cm-pin-bar">
          <Icon name="pin" />
          <div className="cm-pin-content">
            {pinnedMessage ? (
              <button
                type="button"
                className="cm-pin-jump"
                onClick={() => jumpTo(pinnedMessage.id)}
              >
                <strong>Ghim · {people.get(pinnedMessage.author_id)?.display_name ?? "Thành viên"}:</strong>{" "}
                <span>{pinnedMessage.body}</span>
              </button>
            ) : (
              <span>
                <strong>Thông báo nhóm:</strong> {room.pinned_note}
              </span>
            )}
          </div>
          {room.is_owner && (
            <button
              type="button"
              className="cm-pin-action"
              onClick={() =>
                pinnedMessage
                  ? void togglePinMessage(pinnedMessage.id)
                  : setEditDialogOpen(true)
              }
              title={pinnedMessage ? "Bỏ ghim tin nhắn" : "Sửa thông báo ghim"}
            >
              <Icon name={pinnedMessage ? "close" : "pen"} />
            </button>
          )}
        </div>
      )}

      <div className="cm-room-body">
        <div
          className="cm-log"
          ref={log}
          onScroll={onScroll}
          role="log"
          aria-live="polite"
          aria-label={`Tin nhắn trong ${title}`}
          style={
            prefs.wallpaper === "custom" && prefs.customWallpaperUrl
              ? {
                  backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, var(--paper) 82%, transparent), color-mix(in srgb, var(--paper) 88%, transparent)), url(${prefs.customWallpaperUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
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
              <RoomAvatar room={room} size="lg" editable={room.is_owner} onEdit={() => setEditDialogOpen(true)} />
              <strong>{title}</strong>
              <p>Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện đầu tiên.</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const mine = message.author_id === me.user_id;
                const author = mine ? me : people.get(message.author_id);
                const newDay = !previous || !sameDay(previous.created_at, message.created_at);
                const first = !continues(previous, message);
                const last = !continues(message, messages[index + 1]);
                const parent = message.reply_to ? byId.get(message.reply_to) : undefined;
                const pingsMe = message.mentions.includes(me.user_id);
                const isPinned = room.pinned_message_id === message.id;
                const reactionEntries = Object.entries(message.reactions ?? {}).filter(
                  ([, userIds]) => userIds.length > 0,
                );
                const isAuthorOwner =
                  room.kind === "group" && message.author_id === room.owner_id;

                return (
                  <div key={message.id}>
                    {newDay && (
                      <p className="cm-day">
                        <span>{isToday(message.created_at) ? "Hôm nay" : longDay(message.created_at)}</span>
                      </p>
                    )}
                    <article
                      id={`msg-${message.id}`}
                      className={`cm-msg${mine ? " is-mine" : ""}${first ? " is-first" : ""}${last ? " is-last" : ""}${pingsMe ? " is-ping" : ""}${isPinned ? " is-pinned" : ""}`}
                    >
                      {(!mine || prefs.showMyAvatar) && (
                        <div className="cm-msg-side">
                          {first && (
                            <button
                              type="button"
                              className="cm-msg-avatar"
                              onClick={() => onProfile(message.author_id)}
                              aria-label={`Hồ sơ ${author?.display_name ?? ""}`}
                            >
                              <Avatar
                                profile={author}
                                size="sm"
                                crown={isAuthorOwner}
                              />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="cm-stack">
                        {first && (
                          <p className="cm-msg-meta">
                            <button
                              type="button"
                              className="cm-name"
                              onClick={() => onProfile(message.author_id)}
                            >
                              {author?.display_name ?? "Thành viên"}
                            </button>
                            {isAuthorOwner && <span className="cm-role-tag">Chủ nhóm</span>}
                            {prefs.showCohortBadge &&
                              (author?.class_name ? (
                                <code className="cm-msg-cohort">{author.class_name}</code>
                              ) : author?.faculty ? (
                                <code className="cm-msg-cohort">{author.faculty}</code>
                              ) : null)}
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
                            {editingMsg?.id === message.id ? (
                              <form className="cm-edit-inline" onSubmit={saveEditMessage}>
                                <input
                                  value={editBody}
                                  onChange={(e) => setEditBody(e.target.value)}
                                  autoFocus
                                />
                                <button type="submit" className="button button-primary button-xs">
                                  Lưu
                                </button>
                                <button
                                  type="button"
                                  className="button button-quiet button-xs"
                                  onClick={() => setEditingMsg(null)}
                                >
                                  Huỷ
                                </button>
                              </form>
                            ) : (
                              message.body.trim() && (
                                <p className="cm-text">
                                  <Body message={message} people={people} me={me.user_id} onProfile={onProfile} />
                                  {message.edited_at && <small className="cm-edited"> (đã sửa)</small>}
                                </p>
                              )
                            )}
                          </div>

                          <div className="cm-tools">
                            {joined && (
                              <div className="cm-react-bar" role="group" aria-label="Thả biểu cảm">
                                {QUICK_REACTIONS.slice(0, 4).map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className="cm-react-pick"
                                    onClick={() => void react(message.id, emoji)}
                                    title={`Thả ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
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
                            {room.kind === "group" && room.is_owner && (
                              <button
                                type="button"
                                onClick={() => void togglePinMessage(message.id)}
                                aria-label={isPinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}
                                title={isPinned ? "Bỏ ghim" : "Ghim tin nhắn"}
                              >
                                <Icon name="pin" />
                              </button>
                            )}
                            {mine && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMsg(message);
                                  setEditBody(message.body);
                                }}
                                aria-label="Sửa tin nhắn"
                                title="Sửa tin nhắn"
                              >
                                <Icon name="pen" />
                              </button>
                            )}
                            {(mine || room.is_owner) && (
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

                        {reactionEntries.length > 0 && (
                          <div className="cm-reactions">
                            {reactionEntries.map(([emoji, userIds]) => {
                              const active = userIds.includes(me.user_id);
                              const names = userIds
                                .map((id) => people.get(id)?.display_name ?? "Thành viên")
                                .join(", ");
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  className={`cm-reaction-chip${active ? " is-active" : ""}`}
                                  onClick={() => void react(message.id, emoji)}
                                  title={names}
                                >
                                  <span>{emoji}</span>
                                  <small>{userIds.length}</small>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </article>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <aside className="cm-info" aria-label="Bảng thông tin và tuỳ biến">
          <div className="cm-info-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={drawerTab === "members"}
              className={drawerTab === "members" ? "is-active" : ""}
              onClick={() => setDrawerTab("members")}
            >
              {room.kind === "group" ? `Nhóm (${roster.length})` : "Hồ sơ"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={drawerTab === "customize"}
              className={drawerTab === "customize" ? "is-active" : ""}
              onClick={() => setDrawerTab("customize")}
            >
              Tuỳ biến
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={drawerTab === "media"}
              className={drawerTab === "media" ? "is-active" : ""}
              onClick={() => setDrawerTab("media")}
            >
              Tệp ({sharedMediaMessages.length})
            </button>
            <button
              className="cm-btn-icon cm-info-close"
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Đóng bảng bên"
            >
              <Icon name="close" />
            </button>
          </div>

          {drawerTab === "members" && (
            <div className="cm-info-pane">
              {room.kind === "group" ? (
                <>
                  <div
                    className="cm-group-card"
                    style={
                      room.banner_url
                        ? {
                            backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.35), rgba(15, 23, 42, 0.82)), url(${room.banner_url})`,
                          }
                        : undefined
                    }
                  >
                    <div className="cm-group-card-top">
                      <RoomAvatar
                        room={room}
                        size="lg"
                        editable={room.is_owner}
                        onEdit={() => quickGroupAvatarInput.current?.click()}
                      />
                      <div className="cm-group-card-meta">
                        <strong>{room.name}</strong>
                        <span>
                          {room.topic} · {roster.length} thành viên
                        </span>
                      </div>
                    </div>
                    {room.is_owner && (
                      <div className="cm-group-owner-bar">
                        <button
                          type="button"
                          className="cm-owner-btn"
                          onClick={() => quickGroupAvatarInput.current?.click()}
                        >
                          <Icon name="image" /> Đổi ảnh nhóm
                        </button>
                        <button
                          type="button"
                          className="cm-owner-btn"
                          onClick={() => setEditDialogOpen(true)}
                        >
                          <Icon name="pen" /> Cài đặt nhóm
                        </button>
                      </div>
                    )}
                  </div>

                  {room.about && <p className="cm-info-about">{room.about}</p>}

                  {room.is_owner && nonMembers.length > 0 && (
                    <div className="cm-add-member">
                      <select
                        value={addingMemberId}
                        onChange={(e) => setAddingMemberId(e.target.value)}
                        aria-label="Chọn thành viên thêm vào nhóm"
                      >
                        <option value="">+ Thêm thành viên vào nhóm…</option>
                        {nonMembers.map((person) => (
                          <option key={person.user_id} value={person.user_id}>
                            {person.display_name} ({person.class_name ?? person.faculty ?? "SDU"})
                          </option>
                        ))}
                      </select>
                      {addingMemberId && (
                        <button
                          type="button"
                          className="button button-primary button-xs"
                          onClick={async () => {
                            await community.addMember(room.id, addingMemberId);
                            setAddingMemberId("");
                            await Promise.all([load(), onChanged()]);
                          }}
                        >
                          Thêm
                        </button>
                      )}
                    </div>
                  )}

                  <ul className="cm-roster">
                    {roster.map((person, idx) => {
                      const isPrimaryOwner = person.user_id === room.owner_id;
                      const isCoOwner = !isPrimaryOwner && room.co_owners.includes(person.user_id);
                      return (
                        <li key={person.user_id} className="cm-roster-item">
                          <button type="button" onClick={() => onProfile(person.user_id)}>
                            <Avatar
                              profile={person}
                              size="sm"
                              online={idx < 5}
                              crown={isPrimaryOwner}
                            />
                            <span className="cm-roster-body">
                              <strong>
                                {person.display_name}
                                {person.user_id === me.user_id && <small> (bạn)</small>}
                              </strong>
                              <span className="cm-roster-sub">
                                {isPrimaryOwner && <span className="cm-role-badge is-owner">Chủ nhóm</span>}
                                {isCoOwner && <span className="cm-role-badge">Phó nhóm</span>}
                                {(person.student_code || person.class_name || person.faculty) && (
                                  <code className="cm-roster-code">
                                    {[person.student_code, person.class_name ?? person.faculty]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </code>
                                )}
                              </span>
                            </span>
                          </button>
                          {room.is_owner && person.user_id !== me.user_id && (
                            <button
                              type="button"
                              className="cm-roster-kick"
                              title={`Mời ${person.display_name} rời nhóm`}
                              onClick={async () => {
                                await community.removeMember(room.id, person.user_id);
                                await Promise.all([load(), onChanged()]);
                              }}
                            >
                              <Icon name="close" />
                            </button>
                          )}
                        </li>
                      );
                    })}
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
                </>
              ) : (
                other && (
                  <div className="cm-dm-card">
                    <Avatar profile={other} size="lg" online />
                    <strong>{other.display_name}</strong>
                    {other.class_name && <code className="cm-cohort">{other.class_name}</code>}
                    <p className="cm-info-about">{other.bio || other.faculty}</p>
                    <button
                      type="button"
                      className="button button-outline button-small"
                      onClick={() => onProfile(other.user_id)}
                    >
                      <Icon name="user" /> Mở hồ sơ chi tiết
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {drawerTab === "customize" && (
            <div className="cm-info-pane cm-custom-pane">
              {room.kind === "group" && room.is_owner && (
                <section className="cm-custom-sec">
                  <div className="cm-custom-sec-head">
                    <h4>Ảnh cộng đồng (Chủ nhóm)</h4>
                    <button
                      type="button"
                      className="cm-link-btn"
                      onClick={() => quickGroupAvatarInput.current?.click()}
                    >
                      Tải ảnh lên
                    </button>
                  </div>
                  <div className="cm-photo-grid">
                    {ROOM_PHOTO_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`cm-photo-swatch${room.avatar_url === preset.url ? " is-active" : ""}`}
                        onClick={async () => {
                          await community.updateRoom(room.id, { avatar_url: preset.url });
                          await onChanged();
                        }}
                        title={preset.label}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- preset campus photo */}
                        <img src={preset.url} alt={preset.label} />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="cm-custom-sec">
                <div className="cm-custom-sec-head">
                  <h4>Màu chủ đạo khung chat</h4>
                </div>
                <div className="cm-accent-grid">
                  {ROOM_ACCENTS.map((item) => {
                    const active = effectiveAccent === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`cm-accent-chip${active ? " is-active" : ""}`}
                        onClick={async () => {
                          updatePrefs({ accent: item.id });
                          if (room.kind === "group" && room.is_owner) {
                            await community.updateRoom(room.id, { accent: item.id });
                            await onChanged();
                          }
                        }}
                      >
                        <i style={{ background: item.color }} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="cm-custom-sec">
                <div className="cm-custom-sec-head">
                  <h4>Nền khung chat</h4>
                  <button
                    type="button"
                    className="cm-link-btn"
                    onClick={() => wallpaperInput.current?.click()}
                  >
                    Ảnh riêng
                  </button>
                </div>
                <div className="cm-seg-grid">
                  {(
                    [
                      ["clean", "Giấy phẳng"],
                      ["grid", "Lưới kỹ thuật"],
                      ["dots", "Chấm bi"],
                      ["warm", "Ấm dịu"],
                      ["campus", "Khuôn viên"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`cm-seg-btn${prefs.wallpaper === id ? " is-active" : ""}`}
                      onClick={() => updatePrefs({ wallpaper: id })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="cm-custom-sec">
                <h4>Kiểu bong bóng tin nhắn</h4>
                <div className="cm-seg-row">
                  {(
                    [
                      ["modern", "Hiện đại"],
                      ["compact", "Gọn"],
                      ["minimal", "Tối giản"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`cm-seg-btn${prefs.bubbleStyle === id ? " is-active" : ""}`}
                      onClick={() => updatePrefs({ bubbleStyle: id })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="cm-custom-sec">
                <h4>Mật độ & Cỡ chữ</h4>
                <div className="cm-seg-row">
                  {(
                    [
                      ["compact", "Khít"],
                      ["cozy", "Vừa"],
                      ["comfortable", "Thoáng"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`cm-seg-btn${prefs.density === id ? " is-active" : ""}`}
                      onClick={() => updatePrefs({ density: id })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="cm-seg-row">
                  {(
                    [
                      ["sm", "Chữ nhỏ"],
                      ["md", "Chữ vừa"],
                      ["lg", "Chữ lớn"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`cm-seg-btn${prefs.fontSize === id ? " is-active" : ""}`}
                      onClick={() => updatePrefs({ fontSize: id })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="cm-custom-sec">
                <h4>Khung Avatar & Nhãn</h4>
                <div className="cm-seg-row">
                  <button
                    type="button"
                    className={`cm-seg-btn${prefs.avatarShape === "circle" ? " is-active" : ""}`}
                    onClick={() => updatePrefs({ avatarShape: "circle" })}
                  >
                    Avatar tròn
                  </button>
                  <button
                    type="button"
                    className={`cm-seg-btn${prefs.avatarShape === "squircle" ? " is-active" : ""}`}
                    onClick={() => updatePrefs({ avatarShape: "squircle" })}
                  >
                    Bo góc vuông
                  </button>
                </div>
                <label className="cm-toggle-row">
                  <span>Hiện avatar của tôi trên tin nhắn</span>
                  <input
                    type="checkbox"
                    checked={prefs.showMyAvatar}
                    onChange={(e) => updatePrefs({ showMyAvatar: e.target.checked })}
                  />
                </label>
                <label className="cm-toggle-row">
                  <span>Hiện nhãn lớp niên chế / khoa</span>
                  <input
                    type="checkbox"
                    checked={prefs.showCohortBadge}
                    onChange={(e) => updatePrefs({ showCohortBadge: e.target.checked })}
                  />
                </label>
              </section>

              <button
                type="button"
                className="button button-outline button-small"
                onClick={resetPrefs}
              >
                Khôi phục giao diện mặc định
              </button>
            </div>
          )}

          {drawerTab === "media" && (
            <div className="cm-info-pane">
              {sharedMediaMessages.length > 0 ? (
                <div className="cm-shared-grid">
                  {sharedMediaMessages.flatMap((m) =>
                    m.media.map((path) => {
                      const url = urls.get(path) ?? path;
                      return (
                        <button
                          key={`${m.id}-${path}`}
                          type="button"
                          className="cm-shared-thumb"
                          onClick={() => view(url)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- shared media thumb */}
                          <img src={url} alt="" />
                        </button>
                      );
                    }),
                  )}
                </div>
              ) : (
                <p className="cm-rail-empty">Chưa có ảnh hoặc video nào được chia sẻ trong kênh này.</p>
              )}
            </div>
          )}
        </aside>
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
              placeholder={room.kind === "dm" ? `Nhắn cho ${title}` : `Nhắn trong ${title} (gõ @ để nhắc tên)`}
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
            Tham gia nhóm
          </button>
        </div>
      )}

      {editDialogOpen && room.kind === "group" && (
        <EditRoomDialog
          room={room}
          onClose={() => setEditDialogOpen(false)}
          onSaved={async () => {
            setEditDialogOpen(false);
            await onChanged();
          }}
        />
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

function EditRoomDialog({
  room,
  onClose,
  onSaved,
}: {
  room: RoomSummary;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const avatarFileInput = useRef<HTMLInputElement>(null);
  const bannerFileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<{
    name: string;
    about: string;
    topic: Topic;
    icon: RoomIcon;
    avatar_url: string | null;
    banner_url: string | null;
    accent: RoomAccent;
    pinned_note: string;
  }>({
    name: room.name ?? "",
    about: room.about ?? "",
    topic: room.topic,
    icon: room.icon,
    avatar_url: room.avatar_url,
    banner_url: room.banner_url,
    accent: room.accent ?? "crimson",
    pinned_note: room.pinned_note ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  async function onUploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await cropAvatarFile(file, 256);
      setForm((prev) => ({ ...prev, avatar_url: dataUrl }));
      setErr("");
    } catch (uploadErr) {
      setErr(uploadErr instanceof Error ? uploadErr.message : "Không đọc được ảnh");
    }
  }

  async function onUploadBanner(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await cropAvatarFile(file, 720);
      setForm((prev) => ({ ...prev, banner_url: dataUrl }));
      setErr("");
    } catch (uploadErr) {
      setErr(uploadErr instanceof Error ? uploadErr.message : "Không đọc được ảnh bìa");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanName = form.name.trim().replace(/\s+/g, " ");
    if (cleanName.length < 3) {
      setErr("Tên nhóm cần ít nhất 3 ký tự");
      return;
    }
    setBusy(true);
    try {
      const patch: RoomPatch = {
        name: cleanName,
        about: form.about.trim(),
        topic: form.topic,
        icon: form.icon,
        avatar_url: form.avatar_url,
        banner_url: form.banner_url,
        accent: form.accent,
        pinned_note: form.pinned_note.trim() || null,
      };
      await community.updateRoom(room.id, patch);
      await onSaved();
    } catch (saveErr) {
      setErr(saveErr instanceof Error ? saveErr.message : "Không lưu được cài đặt nhóm");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} className="cm-dialog cm-edit-room-dialog" onClose={onClose}>
      <form className="pt-form" onSubmit={submit}>
        <div className="cm-dialog-head">
          <div>
            <h3>Tuỳ chỉnh nhóm & Ảnh cộng đồng</h3>
            <small className="cm-dialog-sub">Quyền Chủ nhóm · Thay đổi áp dụng ngay cho toàn bộ thành viên</small>
          </div>
          <button className="cm-btn-icon" type="button" onClick={onClose} aria-label="Đóng">
            <Icon name="close" />
          </button>
        </div>

        <div className="cm-room-editor-hero">
          <div className="cm-room-editor-avatar">
            <RoomAvatar
              room={{
                name: form.name,
                icon: form.icon,
                avatar_url: form.avatar_url,
                topic: form.topic,
                accent: form.accent,
              }}
              size="lg"
            />
            <div className="cm-room-editor-btns">
              <input
                ref={avatarFileInput}
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onUploadAvatar}
              />
              <input
                ref={bannerFileInput}
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp"
                onChange={onUploadBanner}
              />
              <button
                type="button"
                className="button button-primary button-xs"
                onClick={() => avatarFileInput.current?.click()}
              >
                <Icon name="image" /> Tải ảnh đại diện nhóm
              </button>
              <button
                type="button"
                className="button button-outline button-xs"
                onClick={() => bannerFileInput.current?.click()}
              >
                Đổi ảnh bìa
              </button>
              {form.avatar_url && (
                <button
                  type="button"
                  className="button button-quiet button-xs"
                  onClick={() => setForm({ ...form, avatar_url: null })}
                >
                  Dùng biểu tượng
                </button>
              )}
            </div>
          </div>

          <div className="cm-preset-strip">
            <span className="cm-field-label">Hoặc chọn nhanh ảnh cộng đồng mẫu:</span>
            <div className="cm-photo-grid">
              {ROOM_PHOTO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`cm-photo-swatch${form.avatar_url === preset.url ? " is-active" : ""}`}
                  onClick={() => setForm({ ...form, avatar_url: preset.url })}
                  title={preset.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- preset campus photo */}
                  <img src={preset.url} alt={preset.label} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="cm-form-grid-2">
          <label className="field">
            Tên nhóm cộng đồng
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={3}
              maxLength={60}
            />
          </label>
          <label className="field">
            Chủ đề
            <select
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value as Topic })}
            >
              {topics.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          Mô tả nhóm
          <textarea
            value={form.about}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
            rows={2}
            maxLength={200}
            placeholder="Mục tiêu, lịch sinh hoạt hoặc học phần"
          />
        </label>

        <label className="field">
          Thông báo ghim đầu nhóm
          <input
            value={form.pinned_note}
            onChange={(e) => setForm({ ...form, pinned_note: e.target.value })}
            maxLength={180}
            placeholder="Ví dụ: Lịch họp nhóm 20:00 tối thứ Năm hàng tuần"
          />
        </label>

        <div className="cm-form-grid-2">
          <fieldset className="cm-icons">
            <legend>Biểu tượng dự phòng</legend>
            {(Object.keys(roomIcons) as RoomIcon[])
              .filter((icon) => icon !== "sparkle")
              .map((icon) => (
                <label key={icon} title={roomIcons[icon]}>
                  <input
                    type="radio"
                    name="room-icon"
                    value={icon}
                    checked={form.icon === icon}
                    onChange={() => setForm({ ...form, icon })}
                  />
                  <span>
                    <Icon name={icon} />
                  </span>
                </label>
              ))}
          </fieldset>

          <fieldset className="cm-icons">
            <legend>Màu chủ đạo nhóm</legend>
            <div className="cm-accent-swatches">
              {ROOM_ACCENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`cm-color-dot${form.accent === item.id ? " is-active" : ""}`}
                  style={{ background: item.color }}
                  onClick={() => setForm({ ...form, accent: item.id })}
                  title={item.label}
                />
              ))}
            </div>
          </fieldset>
        </div>

        {err && (
          <p className="pt-warn" role="alert">
            {err}
          </p>
        )}

        <div className="pt-form-actions">
          <button className="button button-primary button-small" type="submit" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu thay đổi nhóm"}
          </button>
          <button className="button button-quiet button-small" type="button" onClick={onClose}>
            Huỷ
          </button>
        </div>
      </form>
    </dialog>
  );
}
