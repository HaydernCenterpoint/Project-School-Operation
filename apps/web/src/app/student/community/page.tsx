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

function Community() {
  const router = useRouter();
  const { account } = useStudent();
  const searchParams = useSearchParams();
  const paramRoomId = searchParams.get("room");
  const [overrideRoom, setOverrideRoom] = useState<{ base: string | null; id: string | null } | null>(null);
  const activeId = overrideRoom && overrideRoom.base === paramRoomId ? overrideRoom.id : paramRoomId;
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
      const nextUrl = (id ? `/student/community?room=${id}` : "/student/community") as Route;
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

  const room = activeId ? rooms.find((item) => item.id === activeId) : undefined;
  return (
    <div className={`cm-shell${room ? " has-room" : ""}`}>
      <Rail
        rooms={rooms}
        me={me}
        people={people}
        active={room?.id}
        onOpen={open}
        onProfile={setProfileOf}
        onCreate={() => dialog.current?.showModal()}
      />
      <section className="cm-pane" aria-label={room ? undefined : "Không gian thảo luận học tập"}>
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
          <Welcome
            rooms={rooms}
            me={me}
            people={people}
            missing={Boolean(activeId)}
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
  onOpen,
  onProfile,
  onCreate,
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
  const nameOf = (room: RoomSummary) =>
    room.kind === "dm" ? (people.get(room.dm_user ?? "")?.display_name ?? "Thành viên") : (room.name ?? "");
  const matching = rooms.filter((room) => !q || fold(`${nameOf(room)} ${room.about}`).includes(q));
  const shown = matching
    .filter((room) => (room.kind === "dm" ? topic === "Tất cả" : topic === "Tất cả" || room.topic === topic))
    .sort(byActivity);
  const countOf = (tag: Topic | "Tất cả") =>
    tag === "Tất cả" ? matching.length : matching.filter((room) => room.kind === "group" && room.topic === tag).length;
  const inbox = shown.filter((room) => room.kind === "dm" || room.joined);
  const explore = shown.filter((room) => room.kind === "group" && !room.joined);
  const pings = rooms.reduce((sum, room) => sum + Number(room.pings), 0);

  const row = (room: RoomSummary) => {
    const other = room.kind === "dm" ? people.get(room.dm_user ?? "") : undefined;
    const slug = room.kind === "group" ? (topicSlug[room.topic] ?? "study") : "dm";
    const preview = room.last_body
      ? `${room.kind === "group" && room.last_author ? `${room.last_author}: ` : ""}${room.last_body}`
      : room.kind === "dm"
        ? "Bắt đầu trao đổi trực tiếp"
        : room.about || `${room.member_count} thành viên`;
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
            <Avatar profile={other} online />
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
                  <span className="sr-only"> lượt nhắc đến bạn</span>
                </span>
              )}
              {room.unread > 0 && (
                <span className="cm-badge">
                  {room.unread > 99 ? "99+" : room.unread}
                  <span className="sr-only"> tin chưa đọc</span>
                </span>
              )}
              {room.kind === "group" && (
                <span className="cm-row-topic" data-topic={slug}>
                  {room.topic}
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
          {me.student_code && <code className="cm-cohort">{me.student_code}</code>}
        </div>
        <button
          className="cm-btn-icon cm-me"
          type="button"
          onClick={() => onProfile(me.user_id)}
          aria-label="Hồ sơ của tôi"
          title="Hồ sơ của tôi"
        >
          <Avatar profile={me} size="sm" />
        </button>
        <button
          className="cm-btn-icon cm-new"
          type="button"
          onClick={onCreate}
          aria-label="Tạo nhóm mới"
          title="Tạo nhóm mới"
        >
          <Icon name="plus" />
        </button>
      </header>

      <div className="cm-find">
        <label className="cm-search">
          <Icon name="search" />
          <span className="sr-only">Tìm kênh hoặc thành viên</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kênh hoặc thành viên"
          />
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
                    <span className="cm-count">
                      {count}
                      <span className="sr-only"> kênh</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="cm-rail-topics" role="group" aria-label="Chủ đề nhanh">
        {(["Tất cả", ...topics] as const).map((item) => {
          const on = topic === item;
          const slug = item === "Tất cả" ? "all" : (topicSlug[item] ?? "study");
          return (
            <button
              key={item}
              type="button"
              className={`cm-topic-pill${on ? " is-active" : ""}`}
              data-topic={slug}
              aria-pressed={on}
              onClick={() => setTopic(item)}
            >
              <Icon name={topicIcons[item]} />
              <span>{item}</span>
            </button>
          );
        })}
      </div>

      <div className="cm-rail-scroll">
        {topic !== "Tất cả" && (
          <p className="cm-filtering">
            <Icon name={topicIcons[topic]} />
            <span>
              Chủ đề: <b>{topic}</b>
            </span>
            <button type="button" onClick={() => setTopic("Tất cả")}>
              Bỏ lọc
            </button>
          </p>
        )}
        {pings > 0 && (
          <p className="cm-ping-note">
            <Icon name="at" />
            <span>{pings} lượt nhắc tên chưa đọc</span>
          </p>
        )}
        <section aria-labelledby="cm-inbox">
          <div className="cm-sec-head">
            <h3 id="cm-inbox">Kênh đang tham gia</h3>
            <span>{inbox.length}</span>
          </div>
          {inbox.length ? (
            <ul className="cm-list">{inbox.map(row)}</ul>
          ) : (
            <p className="cm-rail-empty">
              {q || topic !== "Tất cả"
                ? "Không có kênh nào khớp bộ lọc"
                : "Bạn chưa tham gia kênh nào, chọn một nhóm bên dưới để bắt đầu"}
            </p>
          )}
        </section>
        {explore.length > 0 && (
          <section aria-labelledby="cm-explore" className="cm-explore">
            <div className="cm-sec-head">
              <h3 id="cm-explore">Khám phá kênh trường</h3>
              <span>{explore.length}</span>
            </div>
            <ul className="cm-list">{explore.map(row)}</ul>
          </section>
        )}
      </div>
    </aside>
  );
}

function Welcome({
  rooms,
  me,
  people,
  missing,
  onOpen,
  onProfile,
  onMessage,
  onCreate,
}: {
  rooms: RoomSummary[];
  me: Profile;
  people: Map<string, Profile>;
  missing: boolean;
  onOpen: (id: string) => void;
  onProfile: (id: string) => void;
  onMessage: (id: string) => Promise<void>;
  onCreate: () => void;
}) {
  const [hubTopic, setHubTopic] = useState<Topic | "Tất cả">("Tất cả");
  const joinedGroups = rooms
    .filter((room) => room.kind === "group" && room.joined && (hubTopic === "Tất cả" || room.topic === hubTopic))
    .sort(byActivity);
  const picks = rooms
    .filter((room) => room.kind === "group" && !room.joined && (hubTopic === "Tất cả" || room.topic === hubTopic))
    .sort((a, b) => b.member_count - a.member_count);
  const allJoinedCount = rooms.filter((room) => room.kind === "group" && room.joined).length;
  const unreadTotal = rooms.reduce((sum, room) => sum + room.unread, 0);
  const pingTotal = rooms.reduce((sum, room) => sum + room.pings, 0);
  const directoryPeople = [...people.values()]
    .filter((person) => person.user_id !== me.user_id)
    .slice(0, 6);
  const firstRoom = joinedGroups[0] ?? rooms[0];

  return (
    <div className="cm-welcome">
      <div className="cm-welcome-inner">
        {missing && (
          <p className="notice" role="status">
            <Icon name="info" /> Kênh này không còn tồn tại hoặc bạn chưa có quyền truy cập
          </p>
        )}

        <header className="cm-dir-hero">
          <div className="cm-dir-copy">
            <div className="cm-dir-kicker">
              <span className="cm-live-dot" aria-hidden="true" />
              <span>Không gian học thuật Đại học Sao Đỏ</span>
              {cohortTag(me) && <code className="cm-cohort">{cohortTag(me)}</code>}
            </div>
            <h2>Kênh thảo luận học phần, câu lạc bộ và lớp niên chế</h2>
            <p>
              Trao đổi bài thực hành, chia sẻ đề cương ôn tập và kết nối trực tiếp với giảng viên cố vấn hoặc thành
              viên các khoa. Gõ <kbd>@</kbd> trong ô soạn thảo để nhắc tên thành viên trong phòng.
            </p>
            <div className="cm-dir-actions">
              {firstRoom && (
                <button className="button button-primary button-small" type="button" onClick={() => onOpen(firstRoom.id)}>
                  <Icon name="message" /> Mở {firstRoom.name ?? "cuộc trò chuyện"}
                </button>
              )}
              <button className="button button-outline button-small" type="button" onClick={onCreate}>
                <Icon name="plus" /> Tạo nhóm học tập mới
              </button>
            </div>
          </div>

          <dl className="cm-dir-stats" aria-label="Thống kê kênh cộng đồng">
            <div className="cm-stat-card" data-tone="study">
              <div className="cm-stat-head">
                <span className="cm-stat-icon"><Icon name="users" /></span>
                <dt>Kênh đang tham gia</dt>
              </div>
              <dd>{allJoinedCount}</dd>
              <span>Trên tổng số {rooms.filter((r) => r.kind === "group").length} kênh toàn trường</span>
            </div>
            <div className="cm-stat-card" data-tone="social">
              <div className="cm-stat-head">
                <span className="cm-stat-icon"><Icon name="bell" /></span>
                <dt>Tin nhắn chưa đọc</dt>
              </div>
              <dd>{unreadTotal}</dd>
              <span>{pingTotal > 0 ? `${pingTotal} lượt nhắc tên trực tiếp` : "Đã cập nhật toàn bộ lượt nhắc"}</span>
            </div>
          </dl>

          <div className="cm-hub-topics" role="group" aria-label="Lọc nhóm theo chủ đề">
            {(["Tất cả", ...topics] as const).map((item) => {
              const on = hubTopic === item;
              const slug = item === "Tất cả" ? "all" : (topicSlug[item] ?? "study");
              const totalInTopic =
                item === "Tất cả"
                  ? rooms.filter((r) => r.kind === "group").length
                  : rooms.filter((r) => r.kind === "group" && r.topic === item).length;
              return (
                <button
                  key={item}
                  type="button"
                  className={`cm-topic-pill${on ? " is-active" : ""}`}
                  data-topic={slug}
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
          <section className="cm-dir-card" aria-labelledby="cm-dir-joined">
            <header className="cm-dir-card-head">
              <div>
                <h3 id="cm-dir-joined">Kênh học tập & câu lạc bộ của bạn</h3>
                <p>Các phòng thảo luận bạn đang là thành viên chính thức</p>
              </div>
              <span className="cm-mono-meta">{joinedGroups.length} kênh</span>
            </header>

            {joinedGroups.length > 0 ? (
              <ul className="cm-dir-list">
                {joinedGroups.map((room) => {
                  const slug = topicSlug[room.topic] ?? "study";
                  return (
                    <li key={room.id}>
                      <button
                        type="button"
                        className={`cm-dir-row${room.unread > 0 ? " is-unread" : ""}`}
                        data-topic={slug}
                        onClick={() => onOpen(room.id)}
                      >
                        <span className="cm-glyph cm-glyph-md" data-topic={slug} aria-hidden="true">
                          <Icon name={room.icon} />
                        </span>
                        <span className="cm-dir-row-main">
                          <span className="cm-dir-row-top">
                            <strong>{room.name}</strong>
                            <span className="cm-row-topic" data-topic={slug}>
                              {room.topic}
                            </span>
                            <span className="cm-member-pill">
                              <Icon name="users" /> {room.member_count} TV
                            </span>
                          </span>
                          <span className="cm-dir-row-about">{room.about}</span>
                          {room.last_body && (
                            <span className="cm-dir-row-activity">
                              <i className="cm-activity-dot" aria-hidden="true" />
                              {room.last_author && <b>{room.last_author}: </b>}
                              <span>{room.last_body}</span>
                              {room.last_at && <time dateTime={room.last_at}>{when(room.last_at)}</time>}
                            </span>
                          )}
                        </span>
                        {room.unread > 0 ? (
                          <span className="cm-badge">{room.unread}</span>
                        ) : (
                          <span className="cm-dir-go" aria-hidden="true">
                            <Icon name="chevron" />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="cm-rail-empty">Không có kênh nào thuộc chủ đề đã chọn, chọn chủ đề khác hoặc tham gia nhóm bên cạnh</p>
            )}
          </section>

          <div className="cm-dir-side">
            {picks.length > 0 && (
              <section className="cm-dir-card" aria-labelledby="cm-dir-explore">
                <header className="cm-dir-card-head">
                  <div>
                    <h3 id="cm-dir-explore">Khám phá kênh chuyên đề</h3>
                    <p>Xem trước nội dung hoặc tham gia thảo luận</p>
                  </div>
                  <span className="cm-mono-meta">{picks.length} kênh</span>
                </header>
                <ul className="cm-dir-list">
                  {picks.map((room) => {
                    const slug = topicSlug[room.topic] ?? "study";
                    return (
                      <li key={room.id}>
                        <button type="button" className="cm-dir-row is-explore" data-topic={slug} onClick={() => onOpen(room.id)}>
                          <span className="cm-glyph" data-topic={slug} aria-hidden="true">
                            <Icon name={room.icon} />
                          </span>
                          <span className="cm-dir-row-main">
                            <span className="cm-dir-row-top">
                              <strong>{room.name}</strong>
                              <span className="cm-row-topic" data-topic={slug}>
                                {room.topic}
                              </span>
                              <span className="cm-member-pill">
                                <Icon name="users" /> {room.member_count} TV
                              </span>
                            </span>
                            <span className="cm-dir-row-sub">{room.about}</span>
                          </span>
                          <span className="cm-dir-go" aria-hidden="true">
                            <Icon name="chevron" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {directoryPeople.length > 0 && (
              <section className="cm-dir-card" aria-labelledby="cm-dir-people">
                <header className="cm-dir-card-head">
                  <div>
                    <h3 id="cm-dir-people">Danh bạ lớp & cố vấn</h3>
                    <p>Nhấn để xem hồ sơ hoặc nhắn tin riêng</p>
                  </div>
                  <span className="cm-mono-meta">{directoryPeople.length} thành viên</span>
                </header>
                <ul className="cm-dir-people">
                  {directoryPeople.map((person, index) => (
                    <li key={person.user_id}>
                      <button
                        type="button"
                        className="cm-person-main"
                        onClick={() => onProfile(person.user_id)}
                      >
                        <Avatar profile={person} size="sm" online={index < 4} />
                        <span className="cm-person-info">
                          <span className="cm-person-top">
                            <strong>{person.display_name}</strong>
                            {cohortTag(person) && <code className="cm-cohort">{cohortTag(person)}</code>}
                          </span>
                          {person.bio && <small className="cm-person-bio">{person.bio}</small>}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="cm-btn-icon cm-dm-btn"
                        onClick={() => void onMessage(person.user_id)}
                        aria-label={`Nhắn tin cho ${person.display_name}`}
                        title={`Nhắn tin cho ${person.display_name}`}
                      >
                        <Icon name="message" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
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
          <h3 id="cm-new-title">Tạo nhóm thảo luận mới</h3>
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
          <legend>Biểu tượng kênh</legend>
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
          Mô tả <small>(không bắt buộc)</small>
          <textarea
            value={form.about}
            onChange={(event) => setForm({ ...form, about: event.target.value })}
            maxLength={200}
            rows={3}
            placeholder="Mục đích học tập, học phần hoặc lịch trao đổi của nhóm"
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
      setStatus("Đã lưu ảnh đại diện mới");
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
      setStatus("Đã cập nhật giới thiệu");
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
            <div className="cm-profile-school">
              <span className="cm-profile-seal" aria-hidden="true">
                <img src="/sao-do-logo.png" alt="" width={28} height={30} />
              </span>
              <div>
                <strong>Hồ sơ thành viên</strong>
                <span>Trường Đại học Sao Đỏ</span>
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
                    <Icon name="image" /> Đổi ảnh đại diện
                  </button>
                </>
              )}
            </div>
          </div>

          <dl className="cm-profile-facts">
            {profile.student_code && (
              <div>
                <dt>Mã định danh</dt>
                <dd className="is-mono">{profile.student_code}</dd>
              </div>
            )}
            {profile.class_name && (
              <div>
                <dt>Lớp niên chế</dt>
                <dd className="is-mono">{profile.class_name}</dd>
              </div>
            )}
            {profile.faculty && (
              <div>
                <dt>Đơn vị / Khoa</dt>
                <dd>{profile.faculty}</dd>
              </div>
            )}
            {self && (
              <div>
                <dt>Kênh tham gia</dt>
                <dd className="is-mono">{joined} kênh</dd>
              </div>
            )}
          </dl>

          {self ? (
            <form className="pt-form" onSubmit={save}>
              <label className="field">
                Giới thiệu học tập
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="Hướng nghiên cứu, học phần đang theo học hoặc vai trò trong lớp"
                />
              </label>
              <div className="pt-form-actions">
                <button className="button button-primary button-small" type="submit" disabled={bio.trim() === profile.bio}>
                  Lưu thay đổi
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
              <h4>Giới thiệu</h4>
              <p className="cm-profile-bio">{profile.bio || "Chưa cập nhật giới thiệu"}</p>
              <button
                className="button button-primary button-small"
                type="button"
                onClick={() => void onMessage(profile.user_id)}
              >
                <Icon name="message" /> Nhắn tin trực tiếp
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
