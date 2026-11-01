"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  CSSProperties,
  DragEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/Icon";
import { MotionPromptShowcase } from "./MotionPromptWidget";
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
const stamp = (iso: string) => `${clock(iso)} ${isToday(iso) ? "Hôm nay" : shortDay(iso)}`;

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
        <i className="cm-avatar-crown" title="Trưởng nhóm">
          <Icon name="shield" />
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
  memberProfiles,
}: {
  room: Pick<RoomSummary, "name" | "icon" | "avatar_url" | "topic" | "accent"> & { member_count?: number };
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  onEdit?: () => void;
  memberProfiles?: Pick<Profile, "user_id" | "display_name" | "avatar_url">[];
}) {
  const slug = topicSlug[room.topic] ?? "study";
  const hasPhoto = Boolean(room.avatar_url);
  const compositeList = !hasPhoto && memberProfiles && memberProfiles.length >= 2 ? memberProfiles.slice(0, 4) : null;

  const content = (
    <>
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- group avatar image or preset
        <img src={room.avatar_url!} alt="" className="cm-room-avatar-img" />
      ) : compositeList ? (
        <span className="cm-zalo-grid4">
          {compositeList.slice(0, 3).map((person) => {
            const url = person.avatar_url ?? getDefaultUserAvatar(person.user_id, person.display_name);
            return (
              // eslint-disable-next-line @next/next/no-img-element -- member mini portrait
              <img key={person.user_id} src={url} alt="" className="cm-zalo-grid4-cell" />
            );
          })}
          {(room.member_count ?? compositeList.length) > 4 ? (
            <span className="cm-zalo-grid4-count">{room.member_count}</span>
          ) : compositeList[3] ? (
            // eslint-disable-next-line @next/next/no-img-element -- 4th member mini portrait
            <img
              src={compositeList[3].avatar_url ?? getDefaultUserAvatar(compositeList[3].user_id, compositeList[3].display_name)}
              alt=""
              className="cm-zalo-grid4-cell"
            />
          ) : (
            <span className="cm-zalo-grid4-count">{compositeList.length}</span>
          )}
        </span>
      ) : (
        <Icon name={room.icon} />
      )}
      {editable && (
        <span className="cm-room-avatar-edit" title="Đổi ảnh đại diện nhóm (Trưởng nhóm)">
          <Icon name="image" />
        </span>
      )}
    </>
  );

  if (editable && onEdit) {
    return (
      <button
        type="button"
        className={`cm-glyph cm-glyph-${size} is-editable${hasPhoto || compositeList ? " has-img" : ""}`}
        data-topic={slug}
        data-accent={room.accent}
        onClick={onEdit}
        aria-label={`Đổi ảnh đại diện nhóm ${room.name ?? ""}`}
        title="Bấm để đổi ảnh cộng đồng & cài đặt nhóm (Trưởng nhóm)"
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={`cm-glyph cm-glyph-${size}${hasPhoto || compositeList ? " has-img" : ""}`}
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
  externalOpenCustomizeCounter = 0,
}: {
  room: RoomSummary;
  me: Profile;
  people: Map<string, Profile>;
  onBack: () => void;
  onProfile: (id: string) => void;
  onChanged: () => Promise<void>;
  onUnknownAuthor: () => Promise<void>;
  externalOpenCustomizeCounter?: number;
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
  // Open right-hand "Thông tin hội thoại" panel by default on desktop like Zalo PC
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<"info" | "customize" | "media">("info");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [msgQuery, setMsgQuery] = useState("");

  useEffect(() => {
    if (externalOpenCustomizeCounter > 0) {
      queueMicrotask(() => {
        setDrawerTab("customize");
        setDrawerOpen(true);
      });
    }
  }, [externalOpenCustomizeCounter]);

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
    if (!window.confirm("Thu hồi / xoá tin nhắn này?")) return;
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

  function toggleDrawerTab(tab: "info" | "customize" | "media") {
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
  const filteredMessages =
    messages && msgQuery.trim()
      ? messages.filter((m) => fold(m.body).includes(fold(msgQuery.trim())))
      : messages;

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

      {/* ZALO 68PX CHAT HEADER */}
      <header className="cm-room-head">
        <button
          className="cm-btn-icon cm-back"
          type="button"
          onClick={onBack}
          aria-label="Quay lại danh sách hội thoại"
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
              memberProfiles={roster}
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
              {room.kind === "group" && room.is_owner && (
                <button
                  type="button"
                  className="cm-title-edit-btn"
                  onClick={() => setEditDialogOpen(true)}
                  aria-label="Đổi tên & ảnh đại diện nhóm"
                  title="Đổi tên & ảnh đại diện nhóm (Trưởng nhóm)"
                >
                  <Icon name="pen" />
                </button>
              )}
            </div>
            <div className="cm-room-subline">
              {room.kind === "group" ? (
                <>
                  <button
                    type="button"
                    className="cm-zalo-member-count"
                    onClick={() => {
                      setDrawerTab("info");
                      setDrawerOpen(true);
                    }}
                    title="Xem danh sách thành viên nhóm"
                  >
                    <Icon name="users" />
                    <span>{headcount} thành viên</span>
                  </button>
                  <span className="cm-sub-dot">·</span>
                  <span className="cm-row-topic">{room.topic}</span>
                  {room.is_owner && (
                    <>
                      <span className="cm-sub-dot">·</span>
                      <button
                        type="button"
                        className="cm-owner-pill"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Icon name="pen" /> Trưởng nhóm · Sửa ảnh nhóm
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="cm-online-status">Đang hoạt động</span>
                  {other?.class_name && (
                    <>
                      <span className="cm-sub-dot">·</span>
                      <code className="cm-cohort">{other.class_name}</code>
                    </>
                  )}
                  {other?.faculty && (
                    <>
                      <span className="cm-sub-dot">·</span>
                      <span className="cm-room-about-inline">{other.faculty}</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="cm-room-head-actions">
          {room.kind === "group" && (
            <button
              className="cm-btn-icon"
              type="button"
              onClick={() => {
                setDrawerTab("info");
                setDrawerOpen(true);
              }}
              aria-label="Thêm thành viên vào nhóm"
              title="Thêm thành viên vào nhóm"
            >
              <Icon name="users" />
            </button>
          )}

          <button
            className={`cm-btn-icon${searchOpen ? " is-active" : ""}`}
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-pressed={searchOpen}
            aria-label="Tìm kiếm tin nhắn"
            title="Tìm kiếm tin nhắn trong hội thoại"
          >
            <Icon name="search" />
          </button>

          <button
            className={`cm-btn-icon${drawerOpen && drawerTab === "customize" ? " is-active" : ""}`}
            type="button"
            onClick={() => toggleDrawerTab("customize")}
            aria-pressed={drawerOpen && drawerTab === "customize"}
            aria-label="Tuỳ biến giao diện"
            title="Tuỳ biến màu sắc, hình nền & bong bóng chat"
          >
            <Icon name="sparkle" />
          </button>

          <button
            className={`cm-btn-icon${drawerOpen && drawerTab === "info" ? " is-active" : ""}`}
            type="button"
            onClick={() => toggleDrawerTab("info")}
            aria-pressed={drawerOpen && drawerTab === "info"}
            aria-label="Thông tin hội thoại"
            title="Đóng/mở bảng Thông tin hội thoại"
          >
            <Icon name="panel" />
          </button>
        </div>
      </header>

      {/* IN-ROOM MESSAGE SEARCH BAR */}
      {searchOpen && (
        <div className="cm-msg-search-bar">
          <Icon name="search" />
          <input
            type="search"
            value={msgQuery}
            onChange={(e) => setMsgQuery(e.target.value)}
            placeholder={`Tìm tin nhắn trong ${title}…`}
            autoFocus
          />
          {msgQuery && (
            <span className="cm-mono-meta">{filteredMessages?.length ?? 0} kết quả</span>
          )}
          <button
            type="button"
            className="cm-btn-icon"
            onClick={() => {
              setMsgQuery("");
              setSearchOpen(false);
            }}
            aria-label="Đóng tìm kiếm"
          >
            <Icon name="close" />
          </button>
        </div>
      )}

      {/* ZALO PINNED MESSAGE / BẢNG TIN NHÓM BANNER */}
      {(room.pinned_note || pinnedMessage) && (
        <div className="cm-pin-bar">
          <span className="cm-pin-badge" aria-hidden="true">
            <Icon name="pin" />
          </span>
          <div className="cm-pin-content">
            {pinnedMessage ? (
              <button
                type="button"
                className="cm-pin-jump"
                onClick={() => jumpTo(pinnedMessage.id)}
              >
                <span className="cm-pin-title">Tin nhắn đã ghim</span>
                <span className="cm-pin-sub">
                  <b>{people.get(pinnedMessage.author_id)?.display_name ?? "Thành viên"}:</b>{" "}
                  {pinnedMessage.body}
                </span>
              </button>
            ) : (
              <div className="cm-pin-jump">
                <span className="cm-pin-title">Bảng tin nhóm</span>
                <span className="cm-pin-sub">{room.pinned_note}</span>
              </div>
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
              title={pinnedMessage ? "Bỏ ghim tin nhắn" : "Sửa thông báo bảng tin"}
            >
              {pinnedMessage ? "Bỏ ghim" : "Sửa"}
            </button>
          )}
        </div>
      )}

      {/* MAIN BODY: CHAT STREAM + RIGHT ZALO INFO SIDEBAR */}
      <div className="cm-room-body">
        <div className="cm-chat-column">
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
                    backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, var(--zalo-canvas) 78%, transparent), color-mix(in srgb, var(--zalo-canvas) 84%, transparent)), url(${prefs.customWallpaperUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {filteredMessages === null ? (
              <div className="cm-log-skeleton" aria-busy="true">
                <span className="sr-only">Đang tải tin nhắn</span>
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton is-mine" />
                <div className="skeleton" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="cm-log-empty">
                <RoomAvatar
                  room={room}
                  size="lg"
                  editable={room.is_owner}
                  onEdit={() => setEditDialogOpen(true)}
                  memberProfiles={roster}
                />
                <strong>{title}</strong>
                <p>
                  {msgQuery
                    ? `Không tìm thấy tin nhắn khớp "${msgQuery}"`
                    : "Hãy gửi lời chào hoặc chia sẻ tài liệu đầu tiên vào nhóm"}
                </p>
              </div>
            ) : (
              <>
                {filteredMessages.map((message, index) => {
                  const previous = filteredMessages[index - 1];
                  const mine = message.author_id === me.user_id;
                  const author = mine ? me : people.get(message.author_id);
                  const newDay = !previous || !sameDay(previous.created_at, message.created_at);
                  const first = !continues(previous, message);
                  const last = !continues(message, filteredMessages[index + 1]);
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
                          <span>
                            {clock(message.created_at)} ·{" "}
                            {isToday(message.created_at) ? "Hôm nay" : longDay(message.created_at)}
                          </span>
                        </p>
                      )}
                      <article
                        id={`msg-${message.id}`}
                        className={`cm-msg${mine ? " is-mine" : ""}${first ? " is-first" : ""}${last ? " is-last" : ""}${pingsMe ? " is-ping" : ""}${isPinned ? " is-pinned" : ""}`}
                        style={{ "--stagger-i": Math.min(index, 14) } as CSSProperties}
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
                          <div className="cm-bubble-row">
                            <div
                              className={`cm-bubble${message.media.length ? " has-media" : ""}${message.body.trim() ? "" : " is-media-only"}`}
                              title={stamp(message.created_at)}
                            >
                              {first && !mine && (
                                <p className="cm-msg-sender-head">
                                  <button
                                    type="button"
                                    className="cm-name"
                                    onClick={() => onProfile(message.author_id)}
                                  >
                                    {author?.display_name ?? "Thành viên"}
                                  </button>
                                  {isAuthorOwner && (
                                    <span className="cm-role-tag">Trưởng nhóm</span>
                                  )}
                                  {prefs.showCohortBadge &&
                                    (author?.class_name ? (
                                      <code className="cm-msg-cohort">{author.class_name}</code>
                                    ) : author?.faculty ? (
                                      <code className="cm-msg-cohort">{author.faculty}</code>
                                    ) : null)}
                                </p>
                              )}

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
                                    <span className="cm-quote-missing">Tin nhắn gốc đã thu hồi</span>
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
                                    {message.edited_at && <small className="cm-edited"> (đã chỉnh sửa)</small>}
                                  </p>
                                )
                              )}

                              <span className="cm-bubble-foot">
                                <time dateTime={message.created_at}>{clock(message.created_at)}</time>
                                {mine && last && <span className="cm-seen-tag">Đã gửi</span>}
                              </span>
                            </div>

                            <div className="cm-tools">
                              {joined && (
                                <div className="cm-react-bar" role="group" aria-label="Thả biểu cảm">
                                  {QUICK_REACTIONS.map((emoji) => (
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
                                  title="Trả lời (Trích dẫn)"
                                >
                                  <Icon name="reply" />
                                </button>
                              )}
                              {room.kind === "group" && room.is_owner && (
                                <button
                                  type="button"
                                  onClick={() => void togglePinMessage(message.id)}
                                  aria-label={isPinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}
                                  title={isPinned ? "Bỏ ghim" : "Ghim lên đầu nhóm"}
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
                                  aria-label="Chỉnh sửa tin nhắn"
                                  title="Chỉnh sửa tin nhắn"
                                >
                                  <Icon name="pen" />
                                </button>
                              )}
                              {(mine || room.is_owner) && (
                                <button
                                  type="button"
                                  onClick={() => void remove(message)}
                                  aria-label="Thu hồi tin nhắn"
                                  title="Thu hồi / Xoá"
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

          {error && (
            <p className="pt-warn cm-error" role="alert">
              {error}
            </p>
          )}

          {/* ZALO 2-ROW COMPOSER */}
          {joined ? (
            <form className="cm-compose" onSubmit={send}>
              {replyTo && (
                <div className="cm-replying">
                  <Icon name="reply" />
                  <div className="cm-replying-text">
                    <b>Trả lời {people.get(replyTo.author_id)?.display_name ?? "Thành viên"}</b>
                    <span className="cm-replying-body">{replyTo.body}</span>
                  </div>
                  <button type="button" onClick={() => setReplyTo(null)} aria-label="Huỷ trả lời">
                    <Icon name="close" />
                  </button>
                </div>
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

              {/* Row 1: Zalo Action Toolbar */}
              <div className="cm-zalo-toolbar" role="toolbar" aria-label="Công cụ soạn tin nhắn">
                <input ref={picker} type="file" accept={mediaAccept} multiple hidden onChange={onPick} />
                <button
                  type="button"
                  className="cm-zalo-tool"
                  onClick={() => picker.current?.click()}
                  disabled={files.length >= mediaLimits.maxFiles || sending}
                  title="Gửi hình ảnh hoặc video"
                >
                  <Icon name="image" />
                  <span>Ảnh / Video</span>
                </button>
                {room.kind === "group" && (
                  <button
                    type="button"
                    className="cm-zalo-tool"
                    onClick={() => {
                      const next = `${draft}${draft && !draft.endsWith(" ") ? " " : ""}@`;
                      setDraft(next);
                      setSuggest({ start: next.length - 1, query: "", index: 0 });
                      input.current?.focus();
                    }}
                    title="Nhắc tên thành viên (@)"
                  >
                    <span className="cm-at-symbol">@</span>
                    <span>Nhắc tên</span>
                  </button>
                )}
                {room.kind === "group" && room.is_owner && (
                  <button
                    type="button"
                    className="cm-zalo-tool"
                    onClick={() => setEditDialogOpen(true)}
                    title="Ghim thông báo hoặc đổi ảnh nhóm"
                  >
                    <Icon name="pin" />
                    <span>Bảng tin & Ảnh nhóm</span>
                  </button>
                )}
                <div className="cm-zalo-toolbar-spacer" />
                <div className="cm-zalo-quick-emojis" aria-label="Gửi nhanh biểu cảm">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="cm-zalo-emoji-btn"
                      onClick={() => setDraft((d) => `${d}${emoji}`)}
                      title={`Chèn ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Zalo Input + Send */}
              <div className="cm-compose-row">
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
                  placeholder={`Nhập @, tin nhắn tới ${title}`}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="cm-suggest"
                  aria-expanded={Boolean(suggest && candidates.length)}
                />
                <button
                  className="cm-zalo-send-btn"
                  type="submit"
                  disabled={(!draft.trim() && !files.length) || sending}
                >
                  <Icon name="send" />
                  <span>Gửi</span>
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
        </div>

        {/* COLUMN 4: ZALO RIGHT "THÔNG TIN HỘI THOẠI / THÔNG TIN NHÓM" SIDEBAR */}
        <aside className="cm-info" aria-label="Thông tin hội thoại">
          <header className="cm-info-head">
            <h3>{room.kind === "group" ? "Thông tin nhóm" : "Thông tin hội thoại"}</h3>
            <button
              className="cm-btn-icon cm-info-close"
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Đóng bảng thông tin"
              title="Thu gọn bảng thông tin"
            >
              <Icon name="close" />
            </button>
          </header>

          {/* Zalo Profile Summary Hero */}
          <div className="cm-zalo-profile-hero">
            {room.kind === "group" ? (
              <RoomAvatar
                room={room}
                size="lg"
                editable={room.is_owner}
                onEdit={() => quickGroupAvatarInput.current?.click()}
                memberProfiles={roster}
              />
            ) : (
              <button
                type="button"
                className="cm-msg-avatar"
                onClick={() => other && onProfile(other.user_id)}
              >
                <Avatar profile={other} size="lg" online />
              </button>
            )}

            <div className="cm-zalo-hero-title">
              <strong>{title}</strong>
              {room.kind === "group" && room.is_owner && (
                <button
                  type="button"
                  className="cm-title-edit-btn"
                  onClick={() => setEditDialogOpen(true)}
                  title="Đổi tên & cài đặt nhóm"
                >
                  <Icon name="pen" />
                </button>
              )}
            </div>

            {room.kind === "group" ? (
              <span className="cm-zalo-hero-sub">
                {room.topic} · {headcount} thành viên
                {room.is_owner ? " · Bạn là Trưởng nhóm" : ""}
              </span>
            ) : (
              <span className="cm-zalo-hero-sub">
                {[other?.student_code, other?.class_name ?? other?.faculty].filter(Boolean).join(" · ")}
              </span>
            )}

            {/* 4 Zalo Circular Action Buttons */}
            <div className="cm-zalo-quick-actions">
              {room.kind === "group" && room.is_owner ? (
                <button
                  type="button"
                  className="cm-zalo-qbtn"
                  onClick={() => quickGroupAvatarInput.current?.click()}
                >
                  <span className="cm-zalo-qicon">
                    <Icon name="image" />
                  </span>
                  <small>Đổi ảnh nhóm</small>
                </button>
              ) : (
                <button
                  type="button"
                  className="cm-zalo-qbtn"
                  onClick={() => other && onProfile(other.user_id)}
                >
                  <span className="cm-zalo-qicon">
                    <Icon name="user" />
                  </span>
                  <small>Xem hồ sơ</small>
                </button>
              )}

              <button
                type="button"
                className={`cm-zalo-qbtn${drawerTab === "info" ? " is-active" : ""}`}
                onClick={() => setDrawerTab("info")}
              >
                <span className="cm-zalo-qicon">
                  <Icon name="users" />
                </span>
                <small>{room.kind === "group" ? `Thành viên (${roster.length})` : "Hồ sơ"}</small>
              </button>

              <button
                type="button"
                className={`cm-zalo-qbtn${drawerTab === "customize" ? " is-active" : ""}`}
                onClick={() => setDrawerTab("customize")}
              >
                <span className="cm-zalo-qicon">
                  <Icon name="sparkle" />
                </span>
                <small>Tuỳ biến</small>
              </button>

              <button
                type="button"
                className={`cm-zalo-qbtn${drawerTab === "media" ? " is-active" : ""}`}
                onClick={() => setDrawerTab("media")}
              >
                <span className="cm-zalo-qicon">
                  <Icon name="grid" />
                </span>
                <small>Ảnh/Video ({sharedMediaMessages.length})</small>
              </button>
            </div>
          </div>

          {drawerTab === "info" && (
            <div className="cm-info-pane">
              {room.kind === "group" ? (
                <>
                  {/* Group Owner Quick Photo & Preset Strip */}
                  {room.is_owner && (
                    <section className="cm-zalo-sec">
                      <div className="cm-zalo-sec-head">
                        <h4>Ảnh đại diện cộng đồng (Trưởng nhóm)</h4>
                        <div className="cm-zalo-sec-links">
                          <button
                            type="button"
                            className="cm-link-btn"
                            onClick={() => quickGroupAvatarInput.current?.click()}
                          >
                            Tải ảnh
                          </button>
                          {room.avatar_url && (
                            <button
                              type="button"
                              className="cm-link-btn"
                              onClick={async () => {
                                await community.updateRoom(room.id, { avatar_url: null });
                                await onChanged();
                              }}
                              title="Chuyển về lưới 4 avatar thành viên kiểu Zalo"
                            >
                              Ghép 4 avatar
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="cm-photo-grid">
                        {ROOM_PHOTO_PRESETS.slice(0, 8).map((preset) => (
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
                      <button
                        type="button"
                        className="button button-outline button-xs cm-full-btn"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Icon name="pen" /> Chỉnh sửa tên, mô tả & bảng tin nhóm
                      </button>
                    </section>
                  )}

                  {room.about && (
                    <section className="cm-zalo-sec">
                      <div className="cm-zalo-sec-head">
                        <h4>Giới thiệu nhóm</h4>
                      </div>
                      <p className="cm-info-about">{room.about}</p>
                    </section>
                  )}

                  <section className="cm-zalo-sec">
                    <div className="cm-zalo-sec-head">
                      <h4>Thành viên ({roster.length})</h4>
                    </div>

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
                                  {person.user_id === me.user_id && <small> (Bạn)</small>}
                                </strong>
                                <span className="cm-roster-sub">
                                  {isPrimaryOwner && (
                                    <span className="cm-role-badge is-owner">Trưởng nhóm</span>
                                  )}
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
                                title={`Mời ${person.display_name} khỏi nhóm`}
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
                  </section>

                  {joined && (
                    <div className="cm-zalo-sec">
                      <button
                        className="button button-outline button-small cm-leave"
                        type="button"
                        onClick={() => void membership(false)}
                      >
                        <Icon name="logout" /> Rời nhóm
                      </button>
                    </div>
                  )}
                </>
              ) : (
                other && (
                  <div className="cm-zalo-sec">
                    <div className="cm-zalo-sec-head">
                      <h4>Thông tin sinh viên / giảng viên</h4>
                    </div>
                    <p className="cm-info-about">{other.bio || other.faculty}</p>
                    <button
                      type="button"
                      className="button button-outline button-small cm-full-btn"
                      onClick={() => onProfile(other.user_id)}
                    >
                      <Icon name="user" /> Xem hồ sơ chi tiết
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
                    <h4>Ảnh cộng đồng (Trưởng nhóm)</h4>
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
                  <h4>Màu chủ đạo giao diện</h4>
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
                  <h4>Hình nền khung chat</h4>
                  <button
                    type="button"
                    className="cm-link-btn"
                    onClick={() => wallpaperInput.current?.click()}
                  >
                    Tải ảnh riêng
                  </button>
                </div>
                <div className="cm-seg-grid">
                  {(
                    [
                      ["zalo", "Phấn Hoa Phượng"],
                      ["clean", "Giấy sáng"],
                      ["grid", "Lưới kỹ thuật"],
                      ["dots", "Chấm bi"],
                      ["warm", "Kem ấm SDU"],
                      ["campus", "Khuôn viên SDU"],
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
                <div className="cm-seg-grid">
                  {(
                    [
                      ["zalo", "Theo màu trang"],
                      ["modern", "Đậm màu chủ đạo"],
                      ["compact", "Gọn khít"],
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
                <div className="cm-custom-sec-head">
                  <h4>Hiệu ứng chuyển động (Motion Prompt)</h4>
                </div>
                <MotionPromptShowcase />
              </section>

              <section className="cm-custom-sec">
                <h4>Mật độ & Cỡ chữ</h4>
                <div className="cm-seg-row">
                  {(
                    [
                      ["compact", "Khít"],
                      ["cozy", "Chuẩn Zalo"],
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
                <h4>Khung Avatar & Hiển thị</h4>
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
                  <span>Hiện avatar của tôi bên phải tin nhắn</span>
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
                className="button button-outline button-small cm-full-btn"
                onClick={resetPrefs}
              >
                Khôi phục giao diện Zalo mặc định
              </button>
            </div>
          )}

          {drawerTab === "media" && (
            <div className="cm-info-pane">
              <div className="cm-zalo-sec">
                <div className="cm-zalo-sec-head">
                  <h4>Ảnh / Video đã gửi ({sharedMediaMessages.length})</h4>
                </div>
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
                  <p className="cm-rail-empty">Chưa có ảnh hoặc video nào được chia sẻ trong hội thoại này.</p>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {editDialogOpen && room.kind === "group" && (
        <EditRoomDialog
          room={room}
          roster={roster}
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
  roster,
  onClose,
  onSaved,
}: {
  room: RoomSummary;
  roster: Profile[];
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
    accent: room.accent ?? "ocean",
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
            <h3>Quản lý nhóm & Đổi ảnh cộng đồng</h3>
            <small className="cm-dialog-sub">Quyền Trưởng nhóm · Áp dụng ngay cho toàn bộ thành viên</small>
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
                member_count: room.member_count,
              }}
              size="lg"
              memberProfiles={roster}
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
                <Icon name="image" /> Tải ảnh nhóm từ máy
              </button>
              <button
                type="button"
                className="button button-outline button-xs"
                onClick={() => setForm({ ...form, avatar_url: null })}
                title="Hiển thị lưới 4 avatar thành viên kiểu Zalo"
              >
                Ghép 4 avatar kiểu Zalo
              </button>
              <button
                type="button"
                className="button button-quiet button-xs"
                onClick={() => bannerFileInput.current?.click()}
              >
                Đổi ảnh bìa
              </button>
            </div>
          </div>

          <div className="cm-preset-strip">
            <span className="cm-field-label">Hoặc chọn nhanh ảnh cộng đồng mẫu SDU:</span>
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
            Phân loại thẻ
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
          Giới thiệu nhóm
          <textarea
            value={form.about}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
            rows={2}
            maxLength={200}
            placeholder="Mục tiêu, lịch sinh hoạt hoặc học phần"
          />
        </label>

        <label className="field">
          Thông báo ghim trên Bảng tin nhóm
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
