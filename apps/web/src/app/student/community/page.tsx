"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, type ChangeEvent, type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { Avatar, ChatRoom, fold, RoomAvatar, topicSlug, when } from "@/components/community/ChatRoom";
import { Icon, type IconName } from "@/components/Icon";
import { cropAvatarFile, getDefaultUserAvatar, persistAvatar } from "@/lib/avatar";
import {
  community,
  ROOM_ACCENTS,
  ROOM_PHOTO_PRESETS,
  roomIcons,
  topics,
  useChatPreferences,
  type Profile,
  type RoomAccent,
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
  const [navTab, setNavTab] = useState<"messages" | "contacts">("messages");
  const [customizeTrigger, setCustomizeTrigger] = useState(0);
  const { prefs: chatPrefs } = useChatPreferences();
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
      if (id && id !== DIRECTORY_VIEW) {
        setNavTab("messages");
      }
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
        <div className="cm-znav" />
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

  const defaultRoom =
    [...rooms]
      .filter((item) => item.joined || item.kind === "dm")
      .sort(byActivity)[0] ?? rooms[0];
  const explicitDirectory = selectedId === DIRECTORY_VIEW || navTab === "contacts";
  const room = explicitDirectory
    ? undefined
    : selectedId
      ? rooms.find((item) => item.id === selectedId)
      : defaultRoom;
  const mobileHasRoom = Boolean(selectedId && selectedId !== DIRECTORY_VIEW && room && navTab === "messages");
  const totalUnread = rooms.reduce((acc, r) => acc + (r.unread || 0), 0);
  const prefAccent = chatPrefs.accent === "auto" ? undefined : chatPrefs.accent;
  const shellAccent: RoomAccent = room?.accent ?? prefAccent ?? "crimson";

  return (
    <div className={`cm-shell${mobileHasRoom ? " has-room" : ""}`} data-accent={shellAccent}>
      {/* COLUMN 1: ZALO BLUE LEFT NAVIGATION DOCK */}
      <nav className="cm-znav" aria-label="Thanh công cụ Zalo SDU">
        <div className="cm-znav-top">
          <button
            type="button"
            className="cm-znav-avatar"
            onClick={() => setProfileOf(me.user_id)}
            aria-label={`Hồ sơ của tôi: ${me.display_name}`}
            title={`${me.display_name} · Bấm để đổi ảnh đại diện`}
          >
            <Avatar profile={me} size="md" online />
          </button>

          <button
            type="button"
            className={`cm-znav-btn${navTab === "messages" && !explicitDirectory ? " is-active" : ""}`}
            onClick={() => {
              setNavTab("messages");
              if (selectedId === DIRECTORY_VIEW && defaultRoom) {
                open(defaultRoom.id);
              }
            }}
            aria-label="Tin nhắn"
            title="Tin nhắn"
          >
            <Icon name="message" />
            {totalUnread > 0 && (
              <span className="cm-znav-badge">{totalUnread > 99 ? "99+" : totalUnread}</span>
            )}
          </button>

          <button
            type="button"
            className={`cm-znav-btn${explicitDirectory ? " is-active" : ""}`}
            onClick={() => {
              setNavTab("contacts");
              open(DIRECTORY_VIEW);
            }}
            aria-label="Danh bạ & Nhóm cộng đồng"
            title="Danh bạ & Nhóm cộng đồng"
          >
            <Icon name="users" />
          </button>
        </div>

        <div className="cm-znav-bottom">
          <button
            type="button"
            className="cm-znav-btn"
            onClick={() => {
              if (explicitDirectory && defaultRoom) {
                setNavTab("messages");
                open(defaultRoom.id);
              }
              setCustomizeTrigger((c) => c + 1);
            }}
            aria-label="Tuỳ biến giao diện"
            title="Tuỳ biến giao diện & chủ đề"
          >
            <Icon name="sparkle" />
          </button>

          <button
            type="button"
            className="cm-znav-btn"
            onClick={() => dialog.current?.showModal()}
            aria-label="Tạo nhóm mới"
            title="Tạo nhóm mới"
          >
            <Icon name="plus" />
          </button>
        </div>
      </nav>

      {/* COLUMN 2: ZALO CONVERSATION LIST SIDEBAR */}
      <Rail
        rooms={rooms}
        me={me}
        people={people}
        active={room?.id}
        navTab={navTab}
        onSelectNavTab={(nextTab) => {
          setNavTab(nextTab);
          if (nextTab === "contacts") open(DIRECTORY_VIEW);
          else if (defaultRoom) open(defaultRoom.id);
        }}
        onOpen={open}
        onProfile={setProfileOf}
        onMessage={message}
        onCreate={() => dialog.current?.showModal()}
      />

      {/* COLUMNS 3 & 4: ZALO CHAT CANVAS + RIGHT CONVERSATION INFO SIDEBAR */}
      <section className="cm-pane" aria-label={room ? undefined : "Danh bạ và nhóm cộng đồng"}>
        {room ? (
          <ChatRoom
            key={room.id}
            room={room}
            me={me}
            people={people}
            onBack={() => {
              setNavTab("contacts");
              open(DIRECTORY_VIEW);
            }}
            onProfile={setProfileOf}
            onChanged={refreshRooms}
            onUnknownAuthor={refreshPeople}
            externalOpenCustomizeCounter={customizeTrigger}
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
  navTab,
  onSelectNavTab,
  onOpen,
  onProfile,
  onMessage,
  onCreate,
}: {
  rooms: RoomSummary[];
  me: Profile;
  people: Map<string, Profile>;
  active: string | undefined;
  navTab: "messages" | "contacts";
  onSelectNavTab: (tab: "messages" | "contacts") => void;
  onOpen: (id: string) => void;
  onProfile: (id: string) => void;
  onMessage: (id: string) => Promise<void>;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");
  const [topic, setTopic] = useState<Topic | "Tất cả">("Tất cả");

  const q = fold(query.trim());
  const nameOf = (room: RoomSummary) =>
    room.kind === "dm" ? (people.get(room.dm_user ?? "")?.display_name ?? "Thành viên") : (room.name ?? "");
  const matching = rooms.filter((room) => !q || fold(`${nameOf(room)} ${room.about}`).includes(q));
  const byCategory = matching
    .filter((room) => (room.kind === "dm" ? topic === "Tất cả" : topic === "Tất cả" || room.topic === topic))
    .filter((room) => (filterMode === "unread" ? room.unread > 0 : true))
    .sort(byActivity);
  const inbox = byCategory.filter((room) => room.kind === "dm" || room.joined);
  const explore = byCategory.filter((room) => room.kind === "group" && !room.joined);

  const contacts = [...people.values()]
    .filter(
      (person) =>
        person.user_id !== me.user_id &&
        (!q ||
          fold(
            `${person.display_name} ${person.student_code ?? ""} ${person.class_name ?? ""} ${person.faculty ?? ""}`,
          ).includes(q)),
    )
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "vi"));

  const allProfiles = [...people.values()];

  const row = (room: RoomSummary, index: number) => {
    const other = room.kind === "dm" ? people.get(room.dm_user ?? "") : undefined;
    const slug = room.kind === "group" ? (topicSlug[room.topic] ?? "study") : "dm";
    const preview = room.last_body
      ? `${room.kind === "group" && room.last_author ? `${room.last_author}: ` : ""}${room.last_body}`
      : room.kind === "dm"
        ? (other?.class_name ?? other?.faculty ?? "Tin nhắn riêng")
        : `${room.member_count} thành viên · ${room.topic}`;
    return (
      <li key={room.id} style={{ "--stagger-i": Math.min(index, 12) } as CSSProperties}>
        <button
          type="button"
          className={`cm-row${room.unread > 0 ? " is-unread" : ""}`}
          data-topic={slug}
          onClick={() => onOpen(room.id)}
          aria-current={room.id === active ? "true" : undefined}
        >
          {room.kind === "dm" ? (
            <Avatar profile={other} size="md" online />
          ) : (
            <RoomAvatar room={room} size="md" memberProfiles={allProfiles} />
          )}
          <span className="cm-row-main">
            <span className="cm-row-top">
              <strong>
                {room.kind === "group" && (
                  <span className="cm-group-mini-badge" title="Nhóm cộng đồng">
                    Nhóm
                  </span>
                )}
                {nameOf(room)}
                {room.kind === "group" && room.is_owner && (
                  <i className="cm-owner-star" title="Bạn là Trưởng nhóm">
                    <Icon name="shield" />
                  </i>
                )}
              </strong>
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
                <span className="cm-badge">{room.unread > 99 ? "99+" : room.unread}</span>
              )}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <aside className="cm-rail" aria-label="Danh sách hội thoại Zalo SDU">
      {/* ZALO TOP SEARCH + ACTION BUTTONS */}
      <div className="cm-zalo-search-head">
        <label className="cm-search">
          <Icon name="search" />
          <span className="sr-only">Tìm kiếm</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kiếm"
          />
        </label>
        <button
          className={`cm-btn-icon${navTab === "contacts" ? " is-active" : ""}`}
          type="button"
          onClick={() => onSelectNavTab(navTab === "contacts" ? "messages" : "contacts")}
          aria-label="Danh bạ sinh viên & giảng viên"
          title="Danh bạ sinh viên & giảng viên"
        >
          <Icon name="user" />
        </button>
        <button
          className="cm-btn-icon"
          type="button"
          onClick={onCreate}
          aria-label="Tạo nhóm chat mới"
          title="Tạo nhóm chat mới"
        >
          <Icon name="plus" />
        </button>
      </div>

      {/* ZALO FILTER TABS: TẤT CẢ | CHƯA ĐỌC | PHÂN LOẠI */}
      <div className="cm-zalo-filter-bar">
        <div className="cm-zalo-tabs" role="tablist" aria-label="Bộ lọc hội thoại">
          <button
            type="button"
            role="tab"
            aria-selected={navTab === "messages" && filterMode === "all"}
            className={navTab === "messages" && filterMode === "all" ? "is-active" : ""}
            onClick={() => {
              onSelectNavTab("messages");
              setFilterMode("all");
            }}
          >
            Tất cả
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={navTab === "messages" && filterMode === "unread"}
            className={navTab === "messages" && filterMode === "unread" ? "is-active" : ""}
            onClick={() => {
              onSelectNavTab("messages");
              setFilterMode("unread");
            }}
          >
            Chưa đọc
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={navTab === "contacts"}
            className={navTab === "contacts" ? "is-active" : ""}
            onClick={() => onSelectNavTab("contacts")}
          >
            Danh bạ
          </button>
        </div>

        {navTab === "messages" && (
          <select
            className="cm-zalo-category-select"
            value={topic}
            onChange={(e) => setTopic(e.target.value as Topic | "Tất cả")}
            aria-label="Phân loại nhóm"
          >
            <option value="Tất cả">Phân loại</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* CONVERSATION OR CONTACT LIST */}
      <div className="cm-rail-scroll">
        {navTab === "messages" ? (
          <>
            {inbox.length ? (
              <ul className="cm-list">{inbox.map(row)}</ul>
            ) : (
              <p className="cm-rail-empty">
                {filterMode === "unread"
                  ? "Không có tin nhắn chưa đọc"
                  : "Không có hội thoại phù hợp"}
              </p>
            )}
            {explore.length > 0 && (
              <section aria-labelledby="cm-explore" className="cm-explore">
                <div className="cm-sec-head">
                  <h3 id="cm-explore">Cộng đồng gợi ý</h3>
                  <span>{explore.length}</span>
                </div>
                <ul className="cm-list">{explore.map(row)}</ul>
              </section>
            )}
          </>
        ) : (
          <section aria-labelledby="cm-contacts">
            <div className="cm-sec-head">
              <h3 id="cm-contacts">Bạn bè & Giảng viên ({contacts.length})</h3>
            </div>
            {contacts.length ? (
              <ul className="cm-list">
                {contacts.map((person, index) => (
                  <li
                    key={person.user_id}
                    className="cm-contact-item"
                    style={{ "--stagger-i": Math.min(index, 12) } as CSSProperties}
                  >
                    <button
                      type="button"
                      className="cm-row"
                      onClick={() => void onMessage(person.user_id)}
                    >
                      <Avatar profile={person} size="md" online={index < 5} />
                      <span className="cm-row-main">
                        <span className="cm-row-top">
                          <strong>{person.display_name}</strong>
                          {person.class_name && <code className="cm-cohort">{person.class_name}</code>}
                        </span>
                        <span className="cm-row-bottom">
                          <span className="cm-row-preview">
                            {person.faculty ?? person.student_code ?? "Thành viên"}
                          </span>
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
            <div>
              <h2>Danh bạ & Nhóm cộng đồng SDU</h2>
              <p className="cm-dir-sub">Kết nối trực tiếp với giảng viên, cố vấn học tập và các nhóm học phần</p>
            </div>
            <button className="button button-primary button-small" type="button" onClick={onCreate}>
              <Icon name="plus" /> Tạo nhóm mới
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
              <h3 id="cm-dir-channels">Nhóm & Cộng đồng ({groups.length})</h3>
            </header>

            {groups.length > 0 ? (
              <ul className="cm-dir-list">
                {groups.map((room, index) => {
                  const slug = topicSlug[room.topic] ?? "study";
                  return (
                    <li key={room.id} style={{ "--stagger-i": Math.min(index, 12) } as CSSProperties}>
                      <button
                        type="button"
                        className="cm-dir-row"
                        data-topic={slug}
                        onClick={() => onOpen(room.id)}
                      >
                        <RoomAvatar room={room} size="md" memberProfiles={directoryPeople} />
                        <span className="cm-dir-row-main">
                          <span className="cm-dir-row-top">
                            <strong>{room.name}</strong>
                            {room.is_owner && <span className="cm-role-tag">Trưởng nhóm</span>}
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
                          <span className="cm-dir-state">{room.joined ? "Nhắn tin" : "Tham gia"}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="cm-rail-empty">Không có nhóm nào thuộc phân loại này</p>
            )}
          </section>

          <section className="cm-dir-card" aria-labelledby="cm-dir-people">
            <header className="cm-dir-card-head">
              <h3 id="cm-dir-people">Danh bạ ({directoryPeople.length})</h3>
            </header>
            <ul className="cm-dir-people">
              {directoryPeople.map((person, index) => (
                <li key={person.user_id} style={{ "--stagger-i": Math.min(index, 12) } as CSSProperties}>
                  <button
                    type="button"
                    className="cm-person-main"
                    onClick={() => onProfile(person.user_id)}
                  >
                    <Avatar profile={person} size="md" online={index < 5} />
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
  const fileInput = useRef<HTMLInputElement>(null);
  const blank = {
    name: "",
    about: "",
    topic: "Học tập" as Topic,
    icon: "message" as RoomIcon,
    avatar_url: ROOM_PHOTO_PRESETS[0]!.url as string | null,
    accent: "crimson" as RoomAccent,
  };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onUploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await cropAvatarFile(file, 256);
      setForm((prev) => ({ ...prev, avatar_url: dataUrl }));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được ảnh nhóm");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim().replace(/\s+/g, " ");
    if (name.length < 3) return setError("Tên nhóm cần ít nhất 3 ký tự");
    setBusy(true);
    try {
      const id = await community.createRoom(name, form.about.trim(), form.topic, form.icon, {
        avatar_url: form.avatar_url,
        accent: form.accent,
      });
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
          <h3 id="cm-new-title">Tạo nhóm cộng đồng mới</h3>
          <button
            className="cm-btn-icon"
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Đóng"
          >
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
                ref={fileInput}
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onUploadAvatar}
              />
              <button
                type="button"
                className="button button-outline button-xs"
                onClick={() => fileInput.current?.click()}
              >
                <Icon name="image" /> Tải ảnh nhóm
              </button>
              {form.avatar_url && (
                <button
                  type="button"
                  className="button button-quiet button-xs"
                  onClick={() => setForm({ ...form, avatar_url: null })}
                >
                  Ghép 4 avatar kiểu Zalo
                </button>
              )}
            </div>
          </div>

          <div className="cm-preset-strip">
            <span className="cm-field-label">Chọn ảnh đại diện mẫu:</span>
            <div className="cm-photo-grid">
              {ROOM_PHOTO_PRESETS.slice(0, 6).map((preset) => (
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
            Phân loại
            <select value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value as Topic })}>
              {topics.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

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

        <div className="cm-form-grid-2">
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
                </label>
              ))}
          </fieldset>
          <fieldset className="cm-icons">
            <legend>Màu chủ đạo</legend>
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

const PORTRAIT_PRESET_SEEDS = [
  "student-default",
  "user-lan-anh",
  "user-tuan-kiet",
  "user-hoang-nam",
  "user-thu-ha",
  "user-quoc-bao",
];

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
      await onSaved();
      setStatus("Đã lưu ảnh đại diện");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Không đổi được ảnh đại diện");
    }
  }

  async function pickPresetPortrait(seedId: string) {
    if (!self) return;
    const svgUrl = getDefaultUserAvatar(seedId, me.display_name);
    await persistAvatar(me.user_id, svgUrl);
    await onSaved();
    setStatus("Đã đổi avatar");
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
              <Avatar profile={profile} size="lg" online />
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
                      <Icon name="image" /> Tải ảnh từ máy
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

          {self && (
            <div className="cm-portrait-picker">
              <span className="cm-field-label">Hoặc chọn nhanh avatar minh hoạ:</span>
              <div className="cm-portrait-row">
                {PORTRAIT_PRESET_SEEDS.map((seed) => {
                  const url = getDefaultUserAvatar(seed, me.display_name);
                  return (
                    <button
                      key={seed}
                      type="button"
                      className="cm-portrait-option"
                      onClick={() => void pickPresetPortrait(seed)}
                      title="Chọn avatar này"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- SVG portrait preset */}
                      <img src={url} alt="" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                <dt>Nhóm tham gia</dt>
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
                <button
                  className="button button-primary button-small"
                  type="submit"
                  disabled={bio.trim() === profile.bio}
                >
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
