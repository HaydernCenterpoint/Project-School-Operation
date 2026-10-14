"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Avatar, ChatRoom, fold, when } from "@/components/community/ChatRoom";
import { Icon, type IconName } from "@/components/Icon";
import { community, roomIcons, toneOf, topics, type Profile, type RoomIcon, type RoomSummary, type Topic } from "@/lib/community";
import "@/components/community/community.css";

function Community() {
  const router = useRouter();
  const roomId = useSearchParams().get("room");
  const [me, setMe] = useState<Profile | null>(null);
  const [people, setPeople] = useState<Map<string, Profile>>(new Map());
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [error, setError] = useState("");
  const [profileOf, setProfileOf] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const refreshPeople = useCallback(async () => {
    const list = await community.profiles();
    setPeople(new Map(list.map((item) => [item.user_id, item])));
  }, []);
  const refreshRooms = useCallback(async () => {
    try {
      setRooms(await community.overview());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được danh sách nhóm.");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setMe(await community.enter());
        await Promise.all([refreshPeople(), refreshRooms()]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không vào được Cộng đồng.");
      }
    })();
  }, [refreshPeople, refreshRooms]);

  // Unread counts and pings stay fresh while the page is visible.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshRooms();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refreshRooms]);

  const open = useCallback((id: string | null) => {
    router.push((id ? `/student/community?room=${id}` : "/student/community") as Route, { scroll: false });
  }, [router]);

  async function message(userId: string) {
    try {
      const id = await community.openDm(userId);
      setProfileOf(null);
      await refreshRooms();
      open(id);
    } catch (dmError) {
      setError(dmError instanceof Error ? dmError.message : "Không mở được tin nhắn riêng.");
    }
  }

  if (error && !rooms) {
    return (
      <div className="notice error" role="alert">
        <Icon name="alert" />
        <div><strong>Không vào được Cộng đồng</strong><p>{error}</p></div>
        <button className="button button-outline button-xs" type="button" onClick={() => location.reload()}><Icon name="retry" /> Thử lại</button>
      </div>
    );
  }
  if (!me || !rooms) {
    return (
      <div className="cm-shell" aria-busy="true">
        <span className="sr-only">Đang tải Cộng đồng…</span>
        <div className="cm-rail cm-rail-skeleton">
          {Array.from({ length: 7 }, (_, index) => <div key={index} className="skeleton" />)}
        </div>
        <div className="cm-pane"><div className="skeleton cm-pane-skeleton" /></div>
      </div>
    );
  }

  const room = roomId ? rooms.find((item) => item.id === roomId) : undefined;
  return (
    <div className={`cm-shell${room ? " has-room" : ""}`}>
      <Rail rooms={rooms} me={me} people={people} active={room?.id} onOpen={open} onProfile={setProfileOf} onCreate={() => dialog.current?.showModal()} />
      <section className="cm-pane" aria-label={room ? undefined : "Cuộc trò chuyện"}>
        {room ? (
          <ChatRoom
            key={room.id}
            room={room}
            me={me}
            people={people}
            onBack={() => open(null)}
            onProfile={setProfileOf}
            onChanged={refreshRooms}
            onUnknownAuthor={refreshPeople}
          />
        ) : (
          <Welcome rooms={rooms} missing={Boolean(roomId)} onOpen={open} onCreate={() => dialog.current?.showModal()} />
        )}
      </section>
      <CreateGroup
        dialog={dialog}
        onCreated={async (id) => {
          await refreshRooms();
          open(id);
        }}
      />
      <ProfileDialog
        profile={profileOf ? people.get(profileOf) : undefined}
        me={me}
        rooms={rooms}
        onClose={() => setProfileOf(null)}
        onMessage={message}
        onSaved={async () => {
          await refreshPeople();
          setMe(await community.enter());
        }}
      />
    </div>
  );
}

const topicIcons: Record<Topic | "Tất cả", IconName> = {
  "Tất cả": "grid", "Học tập": "book", "Câu lạc bộ": "users", "Việc làm": "briefcase", "Thể thao": "ball", "Tự do": "message",
};

/** Newest activity first; rooms nobody has written in yet sort by creation. */
const byActivity = (a: RoomSummary, b: RoomSummary) => (b.last_at ?? b.created_at).localeCompare(a.last_at ?? a.created_at);

function Rail({
  rooms, me, people, active, onOpen, onProfile, onCreate,
}: {
  rooms: RoomSummary[];
  me: Profile;
  people: Map<string, Profile>;
  active: string | undefined;
  onOpen: (id: string) => void;
  onProfile: (id: string) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | "Tất cả">("Tất cả");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterBox = useRef<HTMLDivElement>(null);
  const filterButton = useRef<HTMLButtonElement>(null);

  // The topic menu closes on any press outside it.
  useEffect(() => {
    if (!filterOpen) return;
    const away = (event: PointerEvent) => {
      if (!filterBox.current?.contains(event.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [filterOpen]);

  function closeFilter() {
    setFilterOpen(false);
    filterButton.current?.focus();
  }
  const q = fold(query.trim());
  const nameOf = (room: RoomSummary) => (room.kind === "dm" ? people.get(room.dm_user ?? "")?.display_name ?? "Thành viên" : room.name ?? "");
  const matching = rooms.filter((room) => !q || fold(`${nameOf(room)} ${room.about}`).includes(q));
  const shown = matching
    .filter((room) => (room.kind === "dm" ? topic === "Tất cả" : topic === "Tất cả" || room.topic === topic))
    .sort(byActivity);
  // Counts follow the search box, so a tag shows how many results it would leave.
  const countOf = (tag: Topic | "Tất cả") => (tag === "Tất cả" ? matching.length : matching.filter((room) => room.kind === "group" && room.topic === tag).length);
  // Conversations you are part of share one list, like a messenger inbox; the rest is discovery.
  const inbox = shown.filter((room) => room.kind === "dm" || room.joined);
  const explore = shown.filter((room) => room.kind === "group" && !room.joined);
  const pings = rooms.reduce((sum, room) => sum + Number(room.pings), 0);

  const row = (room: RoomSummary, index: number) => {
    const other = room.kind === "dm" ? people.get(room.dm_user ?? "") : undefined;
    const preview = room.last_body
      ? `${room.kind === "group" && room.last_author ? `${room.last_author}: ` : ""}${room.last_body}`
      : room.kind === "dm" ? "Bắt đầu trò chuyện" : room.about || `${room.member_count} thành viên`;
    return (
      <li key={room.id} style={{ "--i": Math.min(index, 14) } as React.CSSProperties}>
        <button type="button" className={`cm-row${room.unread > 0 ? " is-unread" : ""}`} onClick={() => onOpen(room.id)} aria-current={room.id === active ? "true" : undefined}>
          {room.kind === "dm" ? (
            <Avatar profile={other} />
          ) : (
            <span className={`cm-glyph tone-${toneOf(room.id)}`} aria-hidden="true"><Icon name={room.icon} /></span>
          )}
          <span className="cm-row-main">
            <span className="cm-row-top">
              <strong>{nameOf(room)}</strong>
              {room.last_at && <time dateTime={room.last_at}>{when(room.last_at)}</time>}
            </span>
            <span className="cm-row-bottom">
              <span className="cm-row-preview">{preview}</span>
              {room.pings > 0 && <span className="cm-ping" title={`${room.pings} lần nhắc đến bạn`}><Icon name="at" />{room.pings}<span className="sr-only"> lần nhắc đến bạn</span></span>}
              {room.unread > 0 && <span className="cm-badge">{room.unread > 99 ? "99+" : room.unread}<span className="sr-only"> tin chưa đọc</span></span>}
              {!room.joined && room.kind === "group" && <span className="cm-row-topic">{room.topic}</span>}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <aside className="cm-rail" aria-label="Danh sách trò chuyện">
      <header className="cm-rail-head">
        <h2>Cộng đồng</h2>
        <button className="cm-round cm-me" type="button" onClick={() => onProfile(me.user_id)} aria-label="Hồ sơ của tôi" title="Hồ sơ của tôi">
          <Avatar profile={me} size="sm" />
        </button>
        <button className="cm-round cm-new" type="button" onClick={onCreate} aria-label="Tạo nhóm mới" title="Tạo nhóm mới">
          <Icon name="plus" />
        </button>
      </header>

      <div className="cm-find">
        <label className="cm-search">
          <Icon name="search" />
          <span className="sr-only">Tìm nhóm hoặc người</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nhóm hoặc người" />
        </label>
        <div
          className="cm-filter"
          ref={filterBox}
          onKeyDown={(event) => {
            if (event.key === "Escape" && filterOpen) {
              event.stopPropagation();
              closeFilter();
            }
          }}
        >
          <button
            ref={filterButton}
            type="button"
            className={`cm-filter-button${topic !== "Tất cả" ? " is-active" : ""}`}
            onClick={() => setFilterOpen((value) => !value)}
            aria-expanded={filterOpen}
            aria-controls="cm-filter-menu"
            aria-label={topic === "Tất cả" ? "Lọc theo chủ đề" : `Lọc theo chủ đề: ${topic}`}
            title={topic === "Tất cả" ? "Lọc theo chủ đề" : `Đang lọc: ${topic}`}
          >
            <Icon name={topic === "Tất cả" ? "filter" : topicIcons[topic]} />
            {topic !== "Tất cả" && <span className="cm-filter-dot" aria-hidden="true" />}
          </button>
          {filterOpen && (
            <div id="cm-filter-menu" className="cm-filter-menu" role="group" aria-label="Chủ đề">
              {(["Tất cả", ...topics] as const).map((item) => {
                const count = countOf(item);
                const on = topic === item;
                return (
                  <button
                    key={item}
                    type="button"
                    className="cm-filter-item"
                    aria-pressed={on}
                    disabled={!on && count === 0}
                    autoFocus={on}
                    onClick={() => {
                      setTopic(item);
                      closeFilter();
                    }}
                  >
                    <Icon name={topicIcons[item]} />
                    <span>{item}</span>
                    <span className="cm-count">{count}<span className="sr-only"> cuộc trò chuyện</span></span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="cm-rail-scroll">
        {topic !== "Tất cả" && (
          <p className="cm-filtering">
            <Icon name={topicIcons[topic]} /> Đang lọc: <b>{topic}</b>
            <button type="button" onClick={() => setTopic("Tất cả")}>Bỏ lọc</button>
          </p>
        )}
        {pings > 0 && <p className="cm-ping-note"><Icon name="at" /> {pings} lượt nhắc đến bạn chưa đọc</p>}
        <section aria-labelledby="cm-inbox">
          <h3 id="cm-inbox" className="sr-only">Cuộc trò chuyện của bạn</h3>
          {inbox.length ? (
            <ul key={topic + q} className="cm-list">{inbox.map(row)}</ul>
          ) : (
            <p className="cm-rail-empty">{q || topic !== "Tất cả" ? "Không có cuộc trò chuyện nào khớp bộ lọc." : "Bạn chưa tham gia nhóm nào. Chọn một nhóm bên dưới để bắt đầu."}</p>
          )}
        </section>
        {explore.length > 0 && (
          <section aria-labelledby="cm-explore" className="cm-explore">
            <h3 id="cm-explore">Khám phá nhóm</h3>
            <ul key={topic + q} className="cm-list">{explore.map((room, index) => row(room, index + inbox.length))}</ul>
          </section>
        )}
      </div>
    </aside>
  );
}

function Welcome({ rooms, missing, onOpen, onCreate }: { rooms: RoomSummary[]; missing: boolean; onOpen: (id: string) => void; onCreate: () => void }) {
  // Busiest groups you have not joined yet, as a nudge to start somewhere.
  const picks = rooms.filter((room) => room.kind === "group" && !room.joined).sort((a, b) => b.member_count - a.member_count).slice(0, 3);
  return (
    <div className="cm-welcome">
      {missing && <p className="notice" role="status"><Icon name="info" /> Nhóm này không còn tồn tại hoặc bạn không có quyền xem.</p>}
      <span className="cm-welcome-mark" aria-hidden="true"><Icon name="message" /></span>
      <h2>Chọn một cuộc trò chuyện</h2>
      <p>Nhắn với bạn cùng lớp, vào nhóm ôn thi hoặc câu lạc bộ. Gõ @ trong tin nhắn để gọi tên ai đó.</p>
      <button className="button button-primary" type="button" onClick={onCreate}><Icon name="plus" /> Tạo nhóm</button>
      {picks.length > 0 && (
        <div className="cm-picks">
          <h3>Nhóm đông vui nhất</h3>
          <ul>
            {picks.map((room) => (
              <li key={room.id}>
                <button type="button" onClick={() => onOpen(room.id)}>
                  <span className={`cm-glyph tone-${toneOf(room.id)}`} aria-hidden="true"><Icon name={room.icon} /></span>
                  <span>
                    <strong>{room.name}</strong>
                    <small>{room.member_count} thành viên · {room.topic}</small>
                  </span>
                  <Icon name="chevron" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CreateGroup({ dialog, onCreated }: { dialog: React.RefObject<HTMLDialogElement | null>; onCreated: (id: string) => Promise<void> }) {
  const blank = { name: "", about: "", topic: "Học tập" as Topic, icon: "message" as RoomIcon };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim().replace(/\s+/g, " ");
    if (name.length < 3) return setError("Tên nhóm cần ít nhất 3 ký tự.");
    setBusy(true);
    try {
      const id = await community.createRoom(name, form.about.trim(), form.topic, form.icon);
      dialog.current?.close();
      setForm(blank);
      await onCreated(id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Không tạo được nhóm.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} className="cm-dialog" aria-labelledby="cm-new-title" onClose={() => setError("")}>
      <form className="pt-form" onSubmit={submit}>
        <h3 id="cm-new-title">Tạo nhóm mới</h3>
        <fieldset className="cm-icons">
          <legend>Biểu tượng</legend>
          {(Object.keys(roomIcons) as RoomIcon[]).map((icon) => (
            <label key={icon} title={roomIcons[icon]}>
              <input type="radio" name="icon" value={icon} checked={form.icon === icon} onChange={() => setForm({ ...form, icon })} />
              <span><Icon name={icon} /></span>
              <span className="sr-only">{roomIcons[icon]}</span>
            </label>
          ))}
        </fieldset>
        <label className="field">
          Tên nhóm
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={3} maxLength={60}
            placeholder="Ví dụ: Nhóm ôn Toán cao cấp" aria-invalid={Boolean(error)} aria-describedby={error ? "cm-new-error" : undefined} autoFocus />
        </label>
        <label className="field">
          Chủ đề
          <select value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value as Topic })}>
            {topics.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="field">
          Mô tả <small>(không bắt buộc)</small>
          <textarea value={form.about} onChange={(event) => setForm({ ...form, about: event.target.value })} maxLength={200} rows={3} placeholder="Nhóm này dùng để làm gì?" />
        </label>
        {error && <p className="pt-warn" id="cm-new-error" role="alert">{error}</p>}
        <div className="pt-form-actions">
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Đang tạo…" : "Tạo nhóm"}</button>
          <button className="button button-quiet" type="button" onClick={() => dialog.current?.close()}>Huỷ</button>
        </div>
      </form>
    </dialog>
  );
}

function ProfileDialog({
  profile, me, rooms, onClose, onMessage, onSaved,
}: {
  profile: Profile | undefined;
  me: Profile;
  rooms: RoomSummary[];
  onClose: () => void;
  onMessage: (id: string) => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const self = profile?.user_id === me.user_id;

  useEffect(() => {
    if (profile && !dialog.current?.open) {
      setBio(profile.bio);
      setStatus("");
      dialog.current?.showModal();
    }
    if (!profile) dialog.current?.close();
  }, [profile]);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await community.saveBio(me.user_id, bio.trim());
      await onSaved();
      setStatus("Đã lưu giới thiệu.");
    } catch (saveError) {
      setStatus(saveError instanceof Error ? saveError.message : "Không lưu được.");
    }
  }

  const joined = rooms.filter((room) => room.kind === "group" && room.joined).length;
  return (
    <dialog ref={dialog} className="cm-dialog cm-profile" aria-label={profile ? `Hồ sơ ${profile.display_name}` : "Hồ sơ"} onClose={onClose}>
      {profile && (
        <>
          <div className={`cm-profile-banner tone-${toneOf(profile.user_id)}`} />
          <button className="icon-button cm-profile-close" type="button" onClick={() => dialog.current?.close()} aria-label="Đóng">
            <Icon name="close" />
          </button>
          <Avatar profile={profile} size="lg" />
          <h3>{profile.display_name}</h3>
          {profile.student_code && <p className="pt-code">MSSV {profile.student_code}</p>}
          <dl className="cm-profile-facts">
            {profile.class_name && <><dt>Lớp</dt><dd>{profile.class_name}</dd></>}
            {profile.faculty && <><dt>Khoa</dt><dd>{profile.faculty}</dd></>}
            {self && <><dt>Nhóm đã tham gia</dt><dd>{joined}</dd></>}
          </dl>
          {self ? (
            <form className="pt-form" onSubmit={save}>
              <label className="field">
                Giới thiệu
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={300} rows={3} placeholder="Vài dòng về bạn: sở thích, môn đang học…" />
              </label>
              <div className="pt-form-actions">
                <button className="button button-primary button-small" type="submit" disabled={bio.trim() === profile.bio}>Lưu</button>
              </div>
              <p className="pt-muted" role="status">{status}</p>
            </form>
          ) : (
            <>
              <h4>Giới thiệu</h4>
              <p className="cm-profile-bio">{profile.bio || "Chưa có giới thiệu."}</p>
              <button className="button button-primary" type="button" onClick={() => void onMessage(profile.user_id)}>
                <Icon name="message" /> Nhắn tin riêng
              </button>
            </>
          )}
        </>
      )}
    </dialog>
  );
}

export default function CommunityPage() {
  return (
    <Suspense>
      <Community />
    </Suspense>
  );
}
