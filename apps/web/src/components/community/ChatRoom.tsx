"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { community, toneOf, type ChatMessage, type Profile, type RoomSummary } from "@/lib/community";
import { initials } from "@/lib/format";
import { clock, longDay, shortDay } from "@/lib/portal-demo";

const maxLength = 2000;
/** Consecutive messages by one author within this window share a header, like Discord. */
const groupWindow = 5 * 60_000;

export function when(iso: string) {
  return isToday(iso) ? clock(iso) : shortDay(iso);
}

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const stamp = (iso: string) => `${isToday(iso) ? "Hôm nay" : shortDay(iso)} lúc ${clock(iso)}`;

export function Avatar({ profile, size = "md" }: { profile: Pick<Profile, "user_id" | "display_name"> | undefined; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`cm-avatar cm-avatar-${size} tone-${profile ? toneOf(profile.user_id) : 0}`} aria-hidden="true">
      {profile ? initials(profile.display_name) : "?"}
    </span>
  );
}

/** Accent-insensitive, so "@anh" finds "Ánh". */
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Body({ message, people, me, onProfile }: { message: ChatMessage; people: Map<string, Profile>; me: string; onProfile: (id: string) => void }) {
  const named = message.mentions.map((id) => people.get(id)).filter((item): item is Profile => Boolean(item));
  if (!named.length) return <>{message.body}</>;
  const byName = new Map(named.map((item) => [`@${item.display_name}`, item]));
  const pattern = new RegExp(`(${[...byName.keys()].sort((a, b) => b.length - a.length).map(escape).join("|")})`, "g");
  return (
    <>
      {message.body.split(pattern).map((part, index) => {
        const person = byName.get(part);
        return person ? (
          <button key={index} type="button" className={`cm-mention${person.user_id === me ? " is-me" : ""}`} onClick={() => onProfile(person.user_id)}>
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
  room, me, people, onBack, onProfile, onChanged, onUnknownAuthor,
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
  // The member list sits beside the chat on wide screens and opens as a drawer on phones.
  const [showMembers, setShowMembers] = useState(() => matchMedia("(min-width: 1100px)").matches);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const readUpTo = useRef("");

  const joined = members.includes(me.user_id);
  const other = room.kind === "dm" ? people.get(room.dm_user ?? "") : undefined;
  const title = room.kind === "dm" ? (other?.display_name ?? "Tin nhắn riêng") : room.name!;

  const load = useCallback(async () => {
    try {
      const [list, ids] = await Promise.all([community.messages(room.id), community.members(room.id)]);
      setMessages(list);
      setMembers(ids);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được tin nhắn.");
    }
  }, [room.id]);

  useEffect(() => {
    queueMicrotask(() => void load());
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [load]);

  // New authors (someone who just set up their profile) need a name.
  useEffect(() => {
    if (messages?.some((message) => !people.has(message.author_id)) || members.some((id) => !people.has(id))) void onUnknownAuthor();
  }, [messages, members, people, onUnknownAuthor]);

  // Reading the newest message clears unread and pings for this room.
  const newest = messages?.at(-1);
  useEffect(() => {
    if (!joined || !newest || readUpTo.current >= newest.created_at) return;
    readUpTo.current = newest.created_at;
    void community.markRead(room.id, me.user_id, newest.created_at).then(onChanged).catch(() => undefined);
  }, [joined, newest, room.id, me.user_id, onChanged]);

  // Follow the conversation unless the reader scrolled up to look at history.
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
    // Enter sends, Shift+Enter breaks the line.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || sending || !joined) return;
    // A mention counts only while its @Name is still in the text; replies ping the author.
    const mentions = new Set([...picked].filter((id) => people.get(id) && body.includes(`@${people.get(id)!.display_name}`)));
    if (replyTo && replyTo.author_id !== me.user_id) mentions.add(replyTo.author_id);
    setSending(true);
    try {
      await community.send({ room_id: room.id, author_id: me.user_id, body: body.slice(0, maxLength), reply_to: replyTo?.id ?? null, mentions: [...mentions] });
      setDraft("");
      setPicked(new Set());
      setReplyTo(null);
      stick.current = true;
      await load();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Không gửi được tin nhắn.");
    } finally {
      setSending(false);
      input.current?.focus();
    }
  }

  async function remove(message: ChatMessage) {
    if (!window.confirm("Xoá tin nhắn này?")) return;
    try {
      await community.remove(message.id);
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Không xoá được tin nhắn.");
    }
  }

  async function membership(join: boolean) {
    if (!join && !window.confirm(`Rời nhóm ${title}?`)) return;
    try {
      await (join ? community.join(room.id, me.user_id) : community.leave(room.id, me.user_id));
      await Promise.all([load(), onChanged()]);
      if (join) input.current?.focus();
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Không thực hiện được.");
    }
  }

  function jumpTo(id: string) {
    const target = document.getElementById(`msg-${id}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.classList.add("is-flash");
    window.setTimeout(() => target?.classList.remove("is-flash"), 1400);
  }

  const byId = new Map(messages?.map((message) => [message.id, message]));
  const roster = members.map((id) => people.get(id)).filter((item): item is Profile => Boolean(item)).sort((a, b) => a.display_name.localeCompare(b.display_name, "vi"));

  return (
    <div className={`cm-room${showMembers ? " show-members" : ""}`}>
      <header className="cm-room-head">
        <button className="button button-quiet button-small cm-back" type="button" onClick={onBack}>
          <Icon name="back" /> <span>Các nhóm</span>
        </button>
        {room.kind === "dm" ? (
          <button type="button" className="cm-title-button" onClick={() => other && onProfile(other.user_id)}>
            <Avatar profile={other} size="sm" />
            <h2>{title}</h2>
          </button>
        ) : (
          <div className="cm-room-title">
            <span className="cm-icon cm-icon-sm" aria-hidden="true"><Icon name={room.icon} /></span>
            <div>
              <h2>{title}</h2>
              {room.about && <p>{room.about}</p>}
            </div>
          </div>
        )}
        <div className="cm-room-actions">
          {room.kind === "group" && (
            <button className="icon-button" type="button" onClick={() => setShowMembers((value) => !value)} aria-pressed={showMembers} aria-label={`Thành viên (${members.length})`} title="Thành viên">
              <Icon name="users" /><span className="cm-count">{members.length}</span>
            </button>
          )}
          {room.kind === "group" && joined && (
            <button className="icon-button" type="button" onClick={() => void membership(false)} aria-label="Rời nhóm" title="Rời nhóm">
              <Icon name="logout" />
            </button>
          )}
        </div>
      </header>

      <div className="cm-room-body">
        <div className="cm-log" ref={log} onScroll={onScroll} role="log" aria-live="polite" aria-label={`Tin nhắn trong ${title}`}>
          {messages === null ? (
            <p className="pt-muted cm-log-empty">Đang tải tin nhắn…</p>
          ) : messages.length === 0 ? (
            <div className="cm-log-empty">
              <span className="cm-icon" aria-hidden="true"><Icon name={room.kind === "dm" ? "message" : room.icon} /></span>
              <strong>{room.kind === "dm" ? `Bắt đầu trò chuyện với ${title}` : `Chào mừng đến với ${title}!`}</strong>
              <p className="pt-muted">Hãy là người mở lời đầu tiên.</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const previous = messages[index - 1];
              const author = people.get(message.author_id);
              const newDay = !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString();
              const compact = !newDay && !message.reply_to && previous?.author_id === message.author_id
                && Date.parse(message.created_at) - Date.parse(previous.created_at) < groupWindow;
              const parent = message.reply_to ? byId.get(message.reply_to) : undefined;
              const pingsMe = message.mentions.includes(me.user_id);
              return (
                <div key={message.id}>
                  {newDay && <p className="cm-day"><span>{isToday(message.created_at) ? "Hôm nay" : longDay(message.created_at)}</span></p>}
                  <article id={`msg-${message.id}`} className={`cm-msg${compact ? " is-compact" : ""}${pingsMe ? " is-ping" : ""}`}>
                    {message.reply_to && (
                      <button type="button" className="cm-reply-ref" onClick={() => parent && jumpTo(parent.id)} disabled={!parent}>
                        <span className="cm-reply-line" aria-hidden="true" />
                        {parent ? (
                          <><Avatar profile={people.get(parent.author_id)} size="sm" /><b>{people.get(parent.author_id)?.display_name}</b> <span>{parent.body}</span></>
                        ) : (
                          <i>Tin nhắn gốc không còn</i>
                        )}
                      </button>
                    )}
                    {compact ? (
                      <time className="cm-msg-time-side" dateTime={message.created_at}>{clock(message.created_at)}</time>
                    ) : (
                      <button type="button" className="cm-msg-avatar" onClick={() => onProfile(message.author_id)} aria-label={`Hồ sơ ${author?.display_name ?? ""}`}>
                        <Avatar profile={author} />
                      </button>
                    )}
                    <div className="cm-msg-main">
                      {!compact && (
                        <p className="cm-msg-head">
                          <button type="button" className={`cm-name tone-${toneOf(message.author_id)}`} onClick={() => onProfile(message.author_id)}>
                            {author?.display_name ?? "Thành viên"}
                          </button>
                          <time dateTime={message.created_at}>{stamp(message.created_at)}</time>
                        </p>
                      )}
                      <p className="cm-msg-body"><Body message={message} people={people} me={me.user_id} onProfile={onProfile} /></p>
                    </div>
                    <div className="cm-msg-tools">
                      {joined && (
                        <button type="button" onClick={() => { setReplyTo(message); input.current?.focus(); }} aria-label={`Trả lời ${author?.display_name ?? ""}`} title="Trả lời">
                          <Icon name="reply" />
                        </button>
                      )}
                      {message.author_id === me.user_id && (
                        <button type="button" onClick={() => void remove(message)} aria-label="Xoá tin nhắn" title="Xoá">
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </article>
                </div>
              );
            })
          )}
        </div>

        {room.kind === "group" && (
          <aside className="cm-members" aria-label="Thành viên nhóm">
            <h3>Thành viên — {roster.length}</h3>
            <ul>
              {roster.map((person, index) => (
                <li key={person.user_id} style={{ "--i": Math.min(index, 15) } as React.CSSProperties}>
                  <button type="button" onClick={() => onProfile(person.user_id)}>
                    <Avatar profile={person} size="sm" />
                    <span>{person.display_name}{person.user_id === me.user_id && <small> (bạn)</small>}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {error && <p className="pt-warn cm-error" role="alert">{error}</p>}

      {joined ? (
        <form className="cm-compose" onSubmit={send}>
          {replyTo && (
            <p className="cm-replying">
              <Icon name="reply" /> Đang trả lời <b>{people.get(replyTo.author_id)?.display_name}</b>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Huỷ trả lời"><Icon name="close" /></button>
            </p>
          )}
          {suggest && candidates.length > 0 && (
            <ul id="cm-suggest" className="cm-suggest" role="listbox" aria-label="Nhắc đến thành viên">
              {candidates.map((person, index) => (
                <li key={person.user_id} role="option" aria-selected={index === suggest.index}>
                  <button type="button" onMouseDown={(event) => { event.preventDefault(); pick(person); }}>
                    <Avatar profile={person} size="sm" /> {person.display_name}
                    {person.class_name && <small>{person.class_name}</small>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="cm-compose-row">
            <label className="sr-only" htmlFor="cm-draft">Nhắn tới {title}</label>
            <textarea
              id="cm-draft"
              ref={input}
              autoFocus
              value={draft}
              onChange={onType}
              onKeyDown={onKey}
              rows={1}
              maxLength={maxLength}
              placeholder={room.kind === "dm" ? `Nhắn cho ${title}` : `Nhắn vào ${title} · gõ @ để nhắc tên`}
              title="Enter để gửi, Shift+Enter để xuống dòng, @ để nhắc đến ai đó"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="cm-suggest"
              aria-expanded={Boolean(suggest && candidates.length)}
            />
            <button className={`button button-primary cm-send${sending ? " is-sending" : ""}`} type="submit" disabled={!draft.trim() || sending} aria-label="Gửi">
              <Icon name="send" />
            </button>
          </div>
        </form>
      ) : (
        <div className="cm-join">
          <p>Bạn đang xem trước <b>{title}</b>. Tham gia để nhắn tin.</p>
          <button className="button button-primary button-small" type="button" onClick={() => void membership(true)}>Tham gia nhóm</button>
        </div>
      )}
    </div>
  );
}
