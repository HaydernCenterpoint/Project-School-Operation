"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Avatar, ChatRoom, fold, topicSlug, when } from "@/components/community/ChatRoom";
import { Icon, type IconName } from "@/components/Icon";
import { cropAvatarFile, persistAvatar } from "@/lib/avatar";
import {
  community,
  roomIcons,
  topics,
  type Profile,
  type RoomIcon,
  type RoomSummary,
  type Topic,
} from "@/lib/community";
import { useStudent } from "@/lib/student-context";
import "@/components/community/community.css";

function cohortTag(profile: Pick<Profile, "student_code" | "class_name" | "faculty"> | undefined) {
  if (!profile) return null;
  const parts = [profile.student_code, profile.class_name ?? profile.faculty].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

const DIRECTORY_VIEW = "__directory__";

function Community() {
  const router = useRouter();
  const { account } = useStudent();
  const searchParams = useSearchParams();
  const paramRoomId = searchParams.get("room");
  const [overrideRoom, setOverrideRoom] = useState<{ base: string | null; id: string | null } | null>(null);
  const selectedId = overrideRoom && overrideRoom.base === paramRoomId ? overrideRoom.id : paramRoomId;
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
      setError(loadError instanceof Error ? loadError.message : "Không tải được danh sách nhóm");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setMe(await community.enter());
        await Promise.all([refreshPeople(), refreshRooms()]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không vào được Cộng đồng");
      }
    })();
  }, [account.id, refreshPeople, refreshRooms]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshRooms();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refreshRooms]);

  const open = useCallback(
    (id: string | null) => {
      setOverrideRoom({ base: paramRoomId, id });
      const queryId = id && id !== DIRECTORY_VIEW ? id : null;
      const nextUrl = (queryId ? `/student/community?room=${queryId}` : "/student/community") as Route;
      router.push(nextUrl, { scroll: false });
    },
    [paramRoomId, router],
  );

  async function message(userId: string) {
    try {
      const id = await community.openDm(userId);
      setProfileOf(null);
      await refreshRooms();
      open(id);
    } catch (dmError) {
      setError(dmError instanceof Error ? dmError.message : "Không mở được tin nhắn riêng");
    }
  }

  if (error && !rooms) {
    return (
      <div className="notice error" role="alert">
        <Icon name="alert" />
        <div>
          <strong>Không vào được Cộng đồng</strong>
          <p>{error}</p>
        </div>
        <button className="button button-outline button-xs" type="button" onClick={() => location.reload()}>
          <Icon name="retry" /> Thử lại
        </button>
      </div>
    );
  }

  if (!me || !rooms) {
    return (
      <div className="cm-shell" aria-busy="true">
        <span className="sr-only">Đang tải Cộng đồng</span>
        <div className="cm-rail cm-rail-skeleton">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="skeleton" />
          ))}
        </div>
        <div className="cm-pane">
          <div className="skeleton cm-pane-skeleton" />
        </div>
      </div>
    );
  }

  const defaultRoom = [...rooms]
    .filter((item) => item.joined || item.kind === "dm")
    .sort(byActivity)[0] ?? rooms[0];
  const explicitDirectory = selectedId === DIRECTORY_VIEW;
  const room = explicitDirectory
    ? undefined
    : selectedId
      ? rooms.find((item) => item.id === selectedId)
      : defaultRoom;
  const mobileHasRoom = Boolean(selectedId && selectedId !== DIRECTORY_VIEW && room);

  return (
    <div className={`cm-shell${mobileHasRoom ? " has-room" : ""}`}>
      <Rail
        rooms={rooms}
        me={me}
        people={people}
        active={room?.id}
        directoryActive={explicitDirectory}
        onOpen={open}
        onDirectory={() => open(DIRECTORY_VIEW)}
        onProfile={setProfileOf}
        onMessage={message}
        onCreate={() => dialog.current?.showModal()}
      />
      <section className="cm-pane" aria-label={room ? undefined : "Danh mục kênh và thành viên"}>
        {room ? (
          <ChatRoom
            key={room.id}
            room={room}
            me={me}
            people={people}
            onBack={() => open(DIRECTORY_VIEW)}
            onProfile={setProfileOf}
            onChanged={refreshRooms}
            onUnknownAuthor={refreshPeople}
          />
        ) : (
          <DirectoryView
            rooms={rooms}
            me={me}
            people={people}
            onOpen={open}
            onProfile={setProfileOf}
            onMessage={message}
            onCreate={() => dialog.current?.showModal()}
          />
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
        key={profileOf ?? "closed"}
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
  "Tất cả": "grid",
  "Học tập": "book",
  "Câu lạc bộ": "users",
  "Việc làm": "briefcase",
  "Thể thao": "ball",
  "Tự do": "message",
};

const byActivity = (a: RoomSummary, b: RoomSummary) =>
  (b.last_at ?? b.created_at).localeCompare(a.last_at ?? a.created_at);

function Rail({
  rooms,
  me,
  people,
  active,
  directoryActive,
  onOpen,
  onDirectory,
  onProfile,
  onMessage,
  onCreate,
}: {
  rooms: RoomSummary[];
  me: Profile;
  people: Map<string, Profile>;
  active: string | undefined;
  directoryActive: boolean;
  onOpen: (id: string) => void;
  onDirectory: () => void;
  onProfile: (id: string) => void;
  onMessage: (id: string) => Promise<void>;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | "Tất cả">("Tất cả");
  const [tab, setTab] = useState<"channels" | "people">("channels");

  const q = fold(query.trim());
  const nameOf = (room: RoomSummary) =>
    room.kind === "dm" ? (people.get(room.dm_user ?? "")?.display_name ?? "Thành viên") : (room.name ?? "");
  const matching = rooms.filter((room) => !q || fold(`${nameOf(room)} ${room.about}`).includes(q));
  const shown = matching
    .filter((room) => (room.kind === "dm" ? topic === "Tất cả" : topic === "Tất cả" || room.topic === topic))
    .sort(byActivity);
  const inbox = shown.filter((room) => room.kind === "dm" || room.joined);
  const explore = shown.filter((room) => room.kind === "group" && !room.joined);

  const contacts = [...people.values()]
    .filter(
      (person) =>
        person.user_id !== me.user_id &&
        (!q || fold(`${person.display_name} ${person.student_code ?? ""} ${person.class_name ?? ""} ${person.faculty ?? ""}`).includes(q)),
    )
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "vi"));

  const row = (room: RoomSummary) => {
    const other = room.kind === "dm" ? people.get(room.dm_user ?? "") : undefined;
    const slug = room.kind === "group" ? (topicSlug[room.topic] ?? "study") : "dm";
    const preview = room.last_body
      ? `${room.kind === "group" && room.last_author ? `${room.last_author}: ` : ""}${room.last_body}`
      : room.kind === "dm"
        ? (other?.class_name ?? other?.faculty ?? "Tin nhắn riêng")
        : `${room.member_count} thành viên`;
    return (
      <li key={room.id}>
        <button
          type="button"
          className={`cm-row${room.unread > 0 ? " is-unread" : ""}`}
          data-topic={slug}
          onClick={() => onOpen(room.id)}
          aria-current={room.id === active ? "true" : undefined}
        >
          {room.kind === "dm" ? (
            <Avatar profile={other} size="sm" online />
          ) : (
            <span className="cm-glyph" data-topic={slug} aria-hidden="true">
              <Icon name={room.icon} />
            </span>
          )}
          <span className="cm-row-main">
            <span className="cm-row-top">
              <strong>{nameOf(room)}</strong>
              {room.last_at && <time dateTime={room.last_at}>{when(room.last_at)}</time>}
            </span>
            <span className="cm-row-bottom">
              <span className="cm-row-preview">{preview}</span>
              {room.pings > 0 && (
                <span className="cm-ping" title={`${room.pings} lượt nhắc tên`}>
                  @{room.pings}
                </span>
              )}
              {room.unread > 0 && (
                <span className="cm-badge">
                  {room.unread > 99 ? "99+" : room.unread}
                </span>
              )}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <aside className="cm-rail" aria-label="Danh sách kênh thảo luận">
      <header className="cm-rail-head">
        <div className="cm-rail-title">
          <h2>Cộng đồng</h2>
        </div>
        <button
          className={`cm-btn-icon${directoryActive ? " is-active" : ""}`}
          type="button"
          onClick={onDirectory}
          aria-pressed={directoryActive}
          aria-label="Khám phá kênh & danh bạ"
          title="Khám phá kênh & danh bạ"
        >
          <Icon name="grid" />
        </button>
        <button
          className="cm-btn-icon"
          type="button"
          onClick={onCreate}
          aria-label="Tạo nhóm mới"
          title="Tạo nhóm mới"
        >
          <Icon name="plus" />
        </button>
        <button
          className="cm-btn-icon cm-me"
          type="button"
          onClick={() => onProfile(me.user_id)}
          aria-label="Hồ sơ của tôi"
          title="Hồ sơ của tôi"
        >
          <Avatar profile={me} size="sm" />
        </button>
      </header>

      <div className="cm-find">
        <label className="cm-search">
          <Icon name="search" />
          <span className="sr-only">Tìm kiếm</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kênh, thành viên"
          />
        </label>
        <div className="cm-mode-switch" role="tablist" aria-label="Chế độ danh sách">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "channels"}
            className={tab === "channels" ? "is-active" : ""}
            onClick={() => setTab("channels")}
          >
            Kênh
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "people"}
            className={tab === "people" ? "is-active" : ""}
            onClick={() => setTab("people")}
          >
            Danh bạ
          </button>
        </div>
      </div>

      {tab === "channels" && (
        <div className="cm-rail-topics" role="group" aria-label="Lọc theo chủ đề">
          {(["Tất cả", ...topics] as const).map((item) => {
            const on = topic === item;
            return (
              <button
                key={item}
                type="button"
                className={`cm-topic-pill${on ? " is-active" : ""}`}
                aria-pressed={on}
                onClick={() => setTopic(item)}
              >
                <span>{item}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="cm-rail-scroll">
        {tab === "channels" ? (
          <>
            <section aria-labelledby="cm-inbox">
              <div className="cm-sec-head">
                <h3 id="cm-inbox">Đang tham gia</h3>
                <span>{inbox.length}</span>
              </div>
              {inbox.length ? (
                <ul className="cm-list">{inbox.map(row)}</ul>
              ) : (
                <p className="cm-rail-empty">Không có kênh phù hợp</p>
              )}
            </section>
            {explore.length > 0 && (
              <section aria-labelledby="cm-explore" className="cm-explore">
                <div className="cm-sec-head">
                  <h3 id="cm-explore">Kênh khác</h3>
                  <span>{explore.length}</span>
                </div>
                <ul className="cm-list">{explore.map(row)}</ul>
              </section>
            )}
          </>
        ) : (
          <section aria-labelledby="cm-contacts">
            <div className="cm-sec-head">
              <h3 id="cm-contacts">Thành viên & Giảng viên</h3>
              <span>{contacts.length}</span>
            </div>
            {contacts.length ? (
              <ul className="cm-list">
                {contacts.map((person, index) => (
                  <li key={person.user_id} className="cm-contact-item">
                    <button
                      type="button"
                      className="cm-row"
                      onClick={() => void onMessage(person.user_id)}
                    >
                      <Avatar profile={person} size="sm" online={index < 5} />
                      <span className="cm-row-main">
                        <span className="cm-row-top">
                          <strong>{person.display_name}</strong>
                          {person.class_name && <code className="cm-cohort">{person.class_name}</code>}
                        </span>
                        <span className="cm-row-bottom">
                          <span className="cm-row-preview">{person.faculty ?? person.student_code ?? "Thành viên"}</span>
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="cm-contact-info"
                      onClick={() => onProfile(person.user_id)}
                      aria-label={`Hồ sơ ${person.display_name}`}
                      title="Xem hồ sơ"
                    >
                      <Icon name="user" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cm-rail-empty">Không tìm thấy thành viên</p>
            )}
          </section>
        )}
      </div>
    </aside>
  );
}

function DirectoryView({
  rooms,
  me,
  people,
  onOpen,
  onProfile,
  onMessage,
  onCreate,
}: {
  rooms: RoomSummary[];
  me: Profile;
  people: Map<string, Profile>;
  onOpen: (id: string) => void;
  onProfile: (id: string) => void;
  onMessage: (id: string) => Promise<void>;
  onCreate: () => void;
}) {
  const [hubTopic, setHubTopic] = useState<Topic | "Tất cả">("Tất cả");
  const groups = rooms
    .filter((room) => room.kind === "group" && (hubTopic === "Tất cả" || room.topic === hubTopic))
    .sort((a, b) => Number(b.joined) - Number(a.joined) || byActivity(a, b));
  const directoryPeople = [...people.values()].filter((person) => person.user_id !== me.user_id);

  return (
    <div className="cm-welcome">
      <div className="cm-welcome-inner">
        <header className="cm-dir-bar">
          <div className="cm-dir-bar-top">
            <h2>Danh mục kênh & danh bạ</h2>
            <button className="button button-primary button-small" type="button" onClick={onCreate}>
              <Icon name="plus" /> Tạo nhóm
            </button>
          </div>
          <div className="cm-hub-topics" role="group" aria-label="Lọc nhóm theo chủ đề">
            {(["Tất cả", ...topics] as const).map((item) => {
              const on = hubTopic === item;
              const totalInTopic =
                item === "Tất cả"
                  ? rooms.filter((r) => r.kind === "group").length
                  : rooms.filter((r) => r.kind === "group" && r.topic === item).length;
              return (
                <button
                  key={item}
                  type="button"
                  className={`cm-topic-pill${on ? " is-active" : ""}`}
                  aria-pressed={on}
                  onClick={() => setHubTopic(item)}
                >
                  <Icon name={topicIcons[item]} />
                  <span>{item}</span>
                  <small>{totalInTopic}</small>
                </button>
              );
            })}
          </div>
        </header>

        <div className="cm-dir-grid">
          <section className="cm-dir-card" aria-labelledby="cm-dir-channels">
            <header className="cm-dir-card-head">
              <h3 id="cm-dir-channels">Kênh thảo luận</h3>
              <span className="cm-mono-meta">{groups.length}</span>
            </header>

            {groups.length > 0 ? (
              <ul className="cm-dir-list">
                {groups.map((room) => {
                  const slug = topicSlug[room.topic] ?? "study";
                  return (
                    <li key={room.id}>
                      <button
                        type="button"
                        className="cm-dir-row"
                        data-topic={slug}
                        onClick={() => onOpen(room.id)}
                      >
                        <span className="cm-glyph" data-topic={slug} aria-hidden="true">
                          <Icon name={room.icon} />
                        </span>
                        <span className="cm-dir-row-main">
                          <span className="cm-dir-row-top">
                            <strong>{room.name}</strong>
                            <span className="cm-row-topic">{room.topic}</span>
                            <span className="cm-member-pill">{room.member_count} TV</span>
                          </span>
                          <span className="cm-dir-row-sub">
                            {room.last_body
                              ? `${room.last_author ? `${room.last_author}: ` : ""}${room.last_body}`
                              : room.about}
                          </span>
                        </span>
                        {room.unread > 0 ? (
                          <span className="cm-badge">{room.unread}</span>
                        ) : (
                          <span className="cm-dir-state">{room.joined ? "Mở" : "Xem"}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="cm-rail-empty">Không có kênh nào thuộc chủ đề này</p>
            )}
          </section>

          <section className="cm-dir-card" aria-labelledby="cm-dir-people">
            <header className="cm-dir-card-head">
              <h3 id="cm-dir-people">Danh bạ</h3>
              <span className="cm-mono-meta">{directoryPeople.length}</span>
            </header>
            <ul className="cm-dir-people">
              {directoryPeople.map((person, index) => (
                <li key={person.user_id}>
                  <button
                    type="button"
                    className="cm-person-main"
                    onClick={() => onProfile(person.user_id)}
                  >
                    <Avatar profile={person} size="sm" online={index < 5} />
                    <span className="cm-person-info">
                      <span className="cm-person-top">
                        <strong>{person.display_name}</strong>
                        {cohortTag(person) && <code className="cm-cohort">{cohortTag(person)}</code>}
                      </span>
                      {person.faculty && <small className="cm-person-bio">{person.faculty}</small>}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="cm-btn-icon cm-dm-btn"
                    onClick={() => void onMessage(person.user_id)}
                    aria-label={`Nhắn tin cho ${person.display_name}`}
                    title="Nhắn tin trực tiếp"
                  >
                    <Icon name="message" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function CreateGroup({
  dialog,
  onCreated,
}: {
  dialog: React.RefObject<HTMLDialogElement | null>;
  onCreated: (id: string) => Promise<void>;
}) {
  const blank = { name: "", about: "", topic: "Học tập" as Topic, icon: "message" as RoomIcon };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim().replace(/\s+/g, " ");
    if (name.length < 3) return setError("Tên nhóm cần ít nhất 3 ký tự");
    setBusy(true);
    try {
      const id = await community.createRoom(name, form.about.trim(), form.topic, form.icon);
      dialog.current?.close();
      setForm(blank);
      await onCreated(id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Không tạo được nhóm");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} className="cm-dialog" aria-labelledby="cm-new-title" onClose={() => setError("")}>
      <form className="pt-form" onSubmit={submit}>
        <div className="cm-dialog-head">
          <h3 id="cm-new-title">Tạo nhóm mới</h3>
          <button
            className="cm-btn-icon"
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Đóng"
          >
            <Icon name="close" />
          </button>
        </div>
        <fieldset className="cm-icons">
          <legend>Biểu tượng</legend>
          {(Object.keys(roomIcons) as RoomIcon[])
            .filter((icon) => icon !== "sparkle")
            .map((icon) => (
              <label key={icon} title={roomIcons[icon]}>
                <input
                  type="radio"
                  name="icon"
                  value={icon}
                  checked={form.icon === icon}
                  onChange={() => setForm({ ...form, icon })}
                />
                <span>
                  <Icon name={icon} />
                </span>
                <span className="sr-only">{roomIcons[icon]}</span>
              </label>
            ))}
        </fieldset>
        <label className="field">
          Tên nhóm
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            minLength={3}
            maxLength={60}
            placeholder="Ví dụ: Nhóm ôn Toán rời rạc MI1140"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "cm-new-error" : undefined}
            autoFocus
          />
        </label>
        <label className="field">
          Chủ đề
          <select value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value as Topic })}>
            {topics.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Mô tả <small>(tuỳ chọn)</small>
          <textarea
            value={form.about}
            onChange={(event) => setForm({ ...form, about: event.target.value })}
            maxLength={200}
            rows={2}
            placeholder="Học phần, mục tiêu hoặc lịch trao đổi"
          />
        </label>
        {error && (
          <p className="pt-warn" id="cm-new-error" role="alert">
            {error}
          </p>
        )}
        <div className="pt-form-actions">
          <button className="button button-primary button-small" type="submit" disabled={busy}>
            {busy ? "Đang tạo…" : "Tạo nhóm"}
          </button>
          <button className="button button-quiet button-small" type="button" onClick={() => dialog.current?.close()}>
            Huỷ
          </button>
        </div>
      </form>
    </dialog>
  );
}

function ProfileDialog({
  profile,
  me,
  rooms,
  onClose,
  onMessage,
  onSaved,
}: {
  profile: Profile | undefined;
  me: Profile;
  rooms: RoomSummary[];
  onClose: () => void;
  onMessage: (id: string) => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [status, setStatus] = useState("");
  const self = profile?.user_id === me.user_id;

  async function onPickAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !self) return;
    try {
      const cropped = await cropAvatarFile(file);
      await persistAvatar(me.user_id, cropped);
      setStatus("Đã lưu ảnh đại diện");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Không đổi được ảnh đại diện");
    }
  }

  useEffect(() => {
    if (profile && !dialog.current?.open) {
      dialog.current?.showModal();
    }
    if (!profile) dialog.current?.close();
  }, [profile]);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await community.saveBio(me.user_id, bio.trim());
      await onSaved();
      setStatus("Đã lưu");
    } catch (saveError) {
      setStatus(saveError instanceof Error ? saveError.message : "Không lưu được");
    }
  }

  const joined = rooms.filter((room) => room.kind === "group" && room.joined).length;
  return (
    <dialog
      ref={dialog}
      className="cm-dialog cm-profile"
      aria-label={profile ? `Hồ sơ ${profile.display_name}` : "Hồ sơ"}
      onClose={onClose}
    >
      {profile && (
        <>
          <header className="cm-profile-head">
            <div className="cm-profile-identity">
              <Avatar profile={profile} size="lg" />
              <div className="cm-profile-meta">
                <h3>{profile.display_name}</h3>
                {cohortTag(profile) && <code className="cm-cohort">{cohortTag(profile)}</code>}
                {self && (
                  <>
                    <input
                      ref={avatarInput}
                      type="file"
                      hidden
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={onPickAvatar}
                    />
                    <button
                      type="button"
                      className="cm-avatar-change"
                      onClick={() => avatarInput.current?.click()}
                    >
                      <Icon name="image" /> Đổi ảnh
                    </button>
                  </>
                )}
              </div>
            </div>
            <button
              className="cm-btn-icon"
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Đóng"
            >
              <Icon name="close" />
            </button>
          </header>

          <dl className="cm-profile-facts">
            {profile.student_code && (
              <div>
                <dt>Mã định danh</dt>
                <dd className="is-mono">{profile.student_code}</dd>
              </div>
            )}
            {profile.class_name && (
              <div>
                <dt>Lớp</dt>
                <dd className="is-mono">{profile.class_name}</dd>
              </div>
            )}
            {profile.faculty && (
              <div>
                <dt>Đơn vị</dt>
                <dd>{profile.faculty}</dd>
              </div>
            )}
            {self && (
              <div>
                <dt>Kênh tham gia</dt>
                <dd className="is-mono">{joined}</dd>
              </div>
            )}
          </dl>

          {self ? (
            <form className="pt-form" onSubmit={save}>
              <label className="field">
                Giới thiệu
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Hướng nghiên cứu, học phần hoặc vai trò"
                />
              </label>
              <div className="pt-form-actions">
                <button className="button button-primary button-small" type="submit" disabled={bio.trim() === profile.bio}>
                  Lưu
                </button>
                {status && (
                  <span className="cm-status-note" role="status">
                    {status}
                  </span>
                )}
              </div>
            </form>
          ) : (
            <div className="cm-profile-about">
              {profile.bio && <p className="cm-profile-bio">{profile.bio}</p>}
              <button
                className="button button-primary button-small"
                type="button"
                onClick={() => void onMessage(profile.user_id)}
              >
                <Icon name="message" /> Nhắn tin
              </button>
            </div>
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
