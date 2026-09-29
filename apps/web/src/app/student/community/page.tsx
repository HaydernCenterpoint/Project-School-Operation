"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Avatar, ChatRoom, when } from "@/components/community/ChatRoom";
import { Icon } from "@/components/Icon";
import { Empty, PageTitle } from "@/components/portal/Parts";
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
      <div aria-busy="true">
        <span className="sr-only">Đang tải Cộng đồng…</span>
        <div className="skeleton" style={{ height: 56, width: 280, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 420 }} />
      </div>
    );
  }

  const room = roomId ? rooms.find((item) => item.id === roomId) : undefined;
  return (
    <>
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
        <Hub
          rooms={rooms}
          me={me}
          people={people}
          missing={Boolean(roomId)}
          onOpen={open}
          onProfile={setProfileOf}
          onCreated={async (id) => {
            await refreshRooms();
            open(id);
          }}
        />
      )}
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
    </>
  );
}

function Hub({
  rooms, me, people, missing, onOpen, onProfile, onCreated,
}: {
  rooms: RoomSummary[];
  me: Profile;
  people: Map<string, Profile>;
  missing: boolean;
  onOpen: (id: string) => void;
  onProfile: (id: string) => void;
  onCreated: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | "Tất cả">("Tất cả");
  const dialog = useRef<HTMLDialogElement>(null);
  const q = query.trim().toLowerCase();
  const groups = rooms.filter((room) => room.kind === "group"
    && (topic === "Tất cả" || room.topic === topic)
    && `${room.name} ${room.about}`.toLowerCase().includes(q));
  const mine = groups.filter((room) => room.joined);
  const others = groups.filter((room) => !room.joined);
  const dms = rooms.filter((room) => room.kind === "dm" && (!q || people.get(room.dm_user ?? "")?.display_name.toLowerCase().includes(q)));
  const pings = rooms.reduce((sum, room) => sum + Number(room.pings), 0);

  const card = (room: RoomSummary, index: number) => (
    <li key={room.id} style={{ "--i": Math.min(index, 12) } as React.CSSProperties}>
      <button type="button" className="cm-card" onClick={() => onOpen(room.id)}>
        <span className="cm-card-top">
          <span className="cm-icon" aria-hidden="true"><Icon name={room.icon} /></span>
          {room.pings > 0 && <span key={`p${room.pings}`} className="cm-ping" title={`${room.pings} lần nhắc đến bạn`}><Icon name="at" />{room.pings}<span className="sr-only"> lần nhắc đến bạn</span></span>}
          {room.unread > 0 && <span key={`u${room.unread}`} className="cm-badge">{room.unread > 99 ? "99+" : room.unread}<span className="sr-only"> tin chưa đọc</span></span>}
        </span>
        <strong>{room.name}</strong>
        <span className="cm-card-about">{room.last_body ? <><b>{room.last_author}:</b> {room.last_body}</> : room.about || "Chưa có tin nhắn"}</span>
        <span className="cm-card-meta">
          <span className="chip">{room.topic}</span>
          <span><Icon name="users" /> {room.member_count}</span>
          {room.last_at && <time dateTime={room.last_at}>{when(room.last_at)}</time>}
        </span>
      </button>
    </li>
  );

  return (
    <div className="cm-hub">
      <PageTitle title="Cộng đồng" lead="Nhóm chat của sinh viên Sao Đỏ: ôn thi, câu lạc bộ, việc làm, thể thao và làm quen bạn mới.">
        <button className="button button-outline button-small" type="button" onClick={() => onProfile(me.user_id)}>
          <Avatar profile={me} size="sm" /> Hồ sơ của tôi
        </button>
        <button className="button button-primary button-small" type="button" onClick={() => dialog.current?.showModal()}>
          <Icon name="plus" /> Tạo nhóm
        </button>
      </PageTitle>

      {missing && <p className="notice" role="status"><Icon name="info" /> Nhóm này không còn tồn tại hoặc bạn không có quyền xem.</p>}
      {pings > 0 && <p className="cm-ping-note"><span className="cm-ping"><Icon name="at" /></span> Bạn có {pings} lượt nhắc đến chưa đọc.</p>}

      <div className="cm-toolbar">
        <label className="cm-search">
          <Icon name="search" />
          <span className="sr-only">Tìm nhóm hoặc người</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nhóm hoặc người…" />
        </label>
        <div className="segmented pt-scroll" role="group" aria-label="Lọc theo chủ đề">
          {(["Tất cả", ...topics] as const).map((item) => (
            <button key={item} type="button" aria-pressed={topic === item} onClick={() => setTopic(item)}>{item}</button>
          ))}
        </div>
      </div>

      {dms.length > 0 && (
        <section className="cm-hub-section" aria-labelledby="cm-dms">
          <h3 id="cm-dms">Tin nhắn riêng</h3>
          <ul className="cm-dm-row">
            {dms.map((room, index) => {
              const other = people.get(room.dm_user ?? "");
              return (
                <li key={room.id} style={{ "--i": Math.min(index, 12) } as React.CSSProperties}>
                  <button type="button" className="cm-dm" onClick={() => onOpen(room.id)}>
                    <span className="cm-dm-avatar">
                      <Avatar profile={other} />
                      {room.unread > 0 && <span key={room.unread} className="cm-badge">{room.unread}<span className="sr-only"> tin chưa đọc</span></span>}
                    </span>
                    <strong>{other?.display_name ?? "Thành viên"}</strong>
                    <small>{room.last_body ?? "Bắt đầu trò chuyện"}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="cm-hub-section" aria-labelledby="cm-mine">
        <h3 id="cm-mine">Nhóm của bạn <span>{mine.length}</span></h3>
        {mine.length ? <ul key={topic + q} className="cm-grid">{mine.map(card)}</ul> : <Empty icon="message" title="Bạn chưa tham gia nhóm nào" text="Chọn một nhóm bên dưới hoặc tạo nhóm mới." />}
      </section>

      <section className="cm-hub-section" aria-labelledby="cm-explore">
        <h3 id="cm-explore">Khám phá <span>{others.length}</span></h3>
        {others.length ? <ul key={topic + q} className="cm-grid">{others.map(card)}</ul> : <p className="pt-muted">Không còn nhóm nào khác{q || topic !== "Tất cả" ? " khớp bộ lọc" : ""}.</p>}
      </section>

      <CreateGroup dialog={dialog} onCreated={onCreated} />
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
