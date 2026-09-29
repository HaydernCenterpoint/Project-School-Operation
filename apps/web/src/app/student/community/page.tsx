"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { DemoBanner, Empty, PageTitle } from "@/components/portal/Parts";
import { initials } from "@/lib/format";
import { clock, shortDay, useDemoState } from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

const topics = ["Học tập", "Câu lạc bộ", "Việc làm", "Tự do"] as const;
type Topic = (typeof topics)[number];
type Room = { id: string; name: string; about: string; topic: Topic; createdBy: string; members: string[] };
type Message = { id: string; room: string; authorId: string; author: string; text: string; at: string };
type Community = { rooms: Room[]; messages: Message[] };

const maxMessage = 1000;
const ago = (now: number, minutes: number) => new Date(now - minutes * 60_000).toISOString();

/** Community rooms only, no class groups. Sample rooms and people are fictional; `me` joins two so the page is not empty. */
function seed(now: number, me: string): Community {
  const people = (count: number) => Array.from({ length: count }, (_, i) => `sv-${i}`);
  return {
    rooms: [
      { id: "r-web", name: "Ôn thi Lập trình Web", about: "Hỏi đáp bài tập IT3040, chia sẻ đề cũ và mẹo ôn thi.", topic: "Học tập", createdBy: "Trần Minh Khang", members: [...people(118), me] },
      { id: "r-it-club", name: "CLB Tin học Sao Đỏ", about: "Sinh hoạt CLB, cuộc thi lập trình, workshop cuối tuần.", topic: "Câu lạc bộ", createdBy: "CLB Tin học", members: [...people(86), me] },
      { id: "r-jobs", name: "Việc làm & thực tập IT", about: "Tin tuyển thực tập, part-time, review CV cho sinh viên.", topic: "Việc làm", createdBy: "Trung tâm Hỗ trợ SV", members: people(254) },
      { id: "r-dorm", name: "Ký túc xá khu B", about: "Góc chung của các bạn ở KTX khu B: đồ thất lạc, ship đồ ăn, lịch dọn vệ sinh.", topic: "Tự do", createdBy: "Nguyễn Thu Hà", members: people(63) },
    ],
    messages: [
      { id: "m4", room: "r-web", authorId: "sv-4", author: "Trần Minh Khang", text: "Đề giữa kỳ năm ngoái có 1 câu về Flexbox và 1 câu fetch API, mọi người ôn kỹ phần này.", at: ago(now, 1500) },
      { id: "m5", room: "r-web", authorId: "sv-5", author: "Đỗ Thanh Mai", text: "useEffect chạy 2 lần trong dev mode là do StrictMode đúng không mọi người?", at: ago(now, 90) },
      { id: "m6", room: "r-web", authorId: "sv-4", author: "Trần Minh Khang", text: "Đúng rồi, chỉ ở dev thôi, build production thì chạy 1 lần.", at: ago(now, 84) },
      { id: "m7", room: "r-it-club", authorId: "sv-6", author: "CLB Tin học", text: "Workshop Git cơ bản 14h thứ 7 này tại phòng B1-Lab 3. Mang laptop nhé!", at: ago(now, 300) },
      { id: "m8", room: "r-jobs", authorId: "sv-7", author: "Trung tâm Hỗ trợ SV", text: "Công ty phần mềm tại Hải Dương tuyển 5 thực tập sinh Frontend, hạn nộp CV cuối tháng.", at: ago(now, 600) },
      { id: "m9", room: "r-dorm", authorId: "sv-8", author: "Nguyễn Thu Hà", text: "Ai đánh rơi thẻ sinh viên ở nhà ăn thì qua phòng B204 nhận nha.", at: ago(now, 30) },
    ],
  };
}

function stamp(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString() ? clock(iso) : `${shortDay(iso)} ${clock(iso)}`;
}

export default function CommunityPage() {
  const { data } = useStudent();
  const me = data!.session.user;
  const [now] = useState(Date.now);
  const [state, setState] = useDemoState<Community>("community-v2", () => seed(now, me.id));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ name: "", topic: "Học tập" as Topic, about: "" });
  const [formError, setFormError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLOListElement>(null);

  const active = state.rooms.find((room) => room.id === activeId) ?? null;
  const joined = Boolean(active?.members.includes(me.id));
  const messages = active ? state.messages.filter((message) => message.room === active.id) : [];
  const last = (id: string) => state.messages.findLast((message) => message.room === id);
  const match = (room: Room) => `${room.name} ${room.about} ${room.topic}`.toLowerCase().includes(query.trim().toLowerCase());
  const mine = state.rooms.filter((room) => room.members.includes(me.id) && match(room));
  const others = state.rooms.filter((room) => !room.members.includes(me.id) && match(room));

  // Keep the newest message in view when a room opens or a message arrives (also from other tabs).
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [activeId, messages.length]);

  function setMembership(room: Room, join: boolean) {
    if (!join && !window.confirm(`Rời phòng ${room.name}?`)) return;
    setState((value) => ({
      ...value,
      rooms: value.rooms.map((item) =>
        item.id === room.id ? { ...item, members: join ? [...item.members, me.id] : item.members.filter((id) => id !== me.id) } : item,
      ),
    }));
    setStatus(join ? `Đã tham gia ${room.name}.` : `Đã rời ${room.name}.`);
  }

  function send(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!active || !joined || !text) return;
    const message: Message = { id: `m-${crypto.randomUUID()}`, room: active.id, authorId: me.id, author: me.displayName, text: text.slice(0, maxMessage), at: new Date().toISOString() };
    setState((value) => ({ ...value, messages: [...value.messages, message] }));
    setDraft("");
  }

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter breaks the line; leave IME composition (Vietnamese Telex) alone.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  function remove(message: Message) {
    if (message.authorId !== me.id || !window.confirm("Xoá tin nhắn này?")) return;
    setState((value) => ({ ...value, messages: value.messages.filter((item) => item.id !== message.id) }));
  }

  function create(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim().replace(/\s+/g, " ");
    if (name.length < 3) return setFormError("Tên phòng cần ít nhất 3 ký tự.");
    if (state.rooms.some((room) => room.name.toLowerCase() === name.toLowerCase())) return setFormError("Đã có phòng trùng tên.");
    const room: Room = { id: `r-${crypto.randomUUID()}`, name, about: form.about.trim(), topic: form.topic, createdBy: me.displayName, members: [me.id] };
    setState((value) => ({ ...value, rooms: [room, ...value.rooms] }));
    setActiveId(room.id);
    setForm({ name: "", topic: "Học tập", about: "" });
    setFormError("");
    setStatus(`Đã tạo phòng ${name}.`);
    dialog.current?.close();
  }

  const roomButton = (room: Room) => {
    const preview = last(room.id);
    return (
      <li key={room.id}>
        <button type="button" className="cm-room" aria-current={room.id === activeId ? "true" : undefined} onClick={() => setActiveId(room.id)}>
          <span className={`cm-mark tone-${topics.indexOf(room.topic)}`} aria-hidden="true">{room.name.slice(0, 1)}</span>
          <span className="cm-room-text">
            <strong>{room.name}</strong>
            <small>{preview ? `${preview.authorId === me.id ? "Bạn" : preview.author}: ${preview.text}` : room.about || room.topic}</small>
          </span>
          {preview && <time dateTime={preview.at}>{stamp(preview.at)}</time>}
        </button>
      </li>
    );
  };

  return (
    <>
      <DemoBanner />
      <PageTitle title="Cộng đồng" lead="Phòng chat cho sinh viên: ôn thi cùng nhau, sinh hoạt câu lạc bộ, tìm việc và kết bạn.">
        <button className="button button-primary button-small" type="button" onClick={() => dialog.current?.showModal()}>
          <Icon name="plus" /> Tạo phòng
        </button>
      </PageTitle>

      <div className={`cm-shell${active ? " is-open" : ""}`}>
        <aside className="cm-list" aria-label="Danh sách phòng chat">
          <label className="cm-search">
            <Icon name="search" />
            <span className="sr-only">Tìm phòng</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm phòng…" />
          </label>
          <p className="cm-group">Phòng của tôi ({mine.length})</p>
          {mine.length ? <ul>{mine.map(roomButton)}</ul> : <p className="pt-muted cm-none">Chưa tham gia phòng nào.</p>}
          <p className="cm-group">Khám phá ({others.length})</p>
          {others.length ? <ul>{others.map(roomButton)}</ul> : <p className="pt-muted cm-none">Không còn phòng nào khác.</p>}
        </aside>

        <section className="cm-chat" aria-label={active ? `Phòng ${active.name}` : "Phòng chat"}>
          {active ? (
            <>
              <header className="cm-head">
                <button className="icon-button cm-back" type="button" onClick={() => setActiveId(null)} aria-label="Quay lại danh sách phòng">
                  <Icon name="back" />
                </button>
                <span className={`cm-mark tone-${topics.indexOf(active.topic)}`} aria-hidden="true">{active.name.slice(0, 1)}</span>
                <div className="cm-head-text">
                  <h3>{active.name}</h3>
                  <p><span className="chip">{active.topic}</span> <span><Icon name="users" /> {active.members.length} thành viên · tạo bởi {active.createdBy}</span></p>
                </div>
                {joined && (
                  <button className="button button-quiet button-small" type="button" onClick={() => setMembership(active, false)}>
                    <Icon name="logout" /> <span>Rời phòng</span>
                  </button>
                )}
              </header>
              {active.about && <p className="cm-about">{active.about}</p>}

              <ol className="cm-log" ref={log} role="log" aria-live="polite" aria-label="Tin nhắn">
                {messages.length ? (
                  messages.map((message) => {
                    const own = message.authorId === me.id;
                    return (
                      <li key={message.id} className={own ? "is-own" : undefined}>
                        {!own && <span className="cm-avatar" aria-hidden="true">{initials(message.author)}</span>}
                        <div className="cm-bubble">
                          {!own && <strong>{message.author}</strong>}
                          <p>{message.text}</p>
                          <time dateTime={message.at}>{stamp(message.at)}</time>
                        </div>
                        {own && (
                          <button className="cm-delete" type="button" onClick={() => remove(message)} aria-label="Xoá tin nhắn">
                            <Icon name="trash" />
                          </button>
                        )}
                      </li>
                    );
                  })
                ) : (
                  <li className="cm-empty"><Empty icon="message" title="Chưa có tin nhắn" text="Hãy là người mở lời đầu tiên." /></li>
                )}
              </ol>

              {joined ? (
                <form className="cm-compose" onSubmit={send}>
                  <label className="sr-only" htmlFor="cm-draft">Tin nhắn tới {active.name}</label>
                  <textarea
                    id="cm-draft"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onKey}
                    rows={1}
                    maxLength={maxMessage}
                    placeholder="Nhập tin nhắn…"
                    title="Enter để gửi, Shift+Enter để xuống dòng"
                  />
                  <button className="button button-primary cm-send" type="submit" disabled={!draft.trim()} aria-label="Gửi">
                    <Icon name="send" />
                  </button>
                </form>
              ) : (
                <div className="cm-join">
                  <p>Tham gia phòng để gửi tin nhắn.</p>
                  <button className="button button-primary button-small" type="button" onClick={() => setMembership(active, true)}>Tham gia</button>
                </div>
              )}
            </>
          ) : (
            <Empty icon="message" title="Chọn một phòng để bắt đầu" text="Hoặc tạo phòng mới cho nhóm học, câu lạc bộ hay sở thích của bạn." />
          )}
        </section>
      </div>

      <dialog ref={dialog} className="cm-dialog" aria-labelledby="cm-new-title" onClose={() => setFormError("")}>
        <form className="pt-form" onSubmit={create}>
          <h3 id="cm-new-title">Tạo phòng chat</h3>
          <label className="field">
            Tên phòng
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              minLength={3}
              maxLength={60}
              placeholder="Ví dụ: Nhóm ôn Toán cao cấp"
              aria-invalid={Boolean(formError)}
              aria-describedby={formError ? "cm-new-error" : undefined}
              autoFocus
            />
          </label>
          <label className="field">
            Chủ đề
            <select value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value as Topic })}>
              {topics.map((topic) => <option key={topic}>{topic}</option>)}
            </select>
          </label>
          <label className="field">
            Mô tả <small>(không bắt buộc)</small>
            <textarea value={form.about} onChange={(event) => setForm({ ...form, about: event.target.value })} maxLength={200} rows={3} placeholder="Phòng này dùng để làm gì?" />
          </label>
          {formError && <p className="pt-warn" id="cm-new-error" role="alert">{formError}</p>}
          <div className="pt-form-actions">
            <button className="button button-primary" type="submit">Tạo phòng</button>
            <button className="button button-quiet" type="button" onClick={() => dialog.current?.close()}>Huỷ</button>
          </div>
        </form>
      </dialog>
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </>
  );
}
