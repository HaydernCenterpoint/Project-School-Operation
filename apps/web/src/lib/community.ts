import type { IconName } from "@/components/Icon";
import { getSupabaseBrowserClient } from "./supabase-browser";

// Community chat talks to Supabase directly; row level security decides what each student
// may read or write (supabase/migrations/202609290001_community_chat.sql).

export const topics = ["Học tập", "Câu lạc bộ", "Việc làm", "Thể thao", "Tự do"] as const;
export type Topic = (typeof topics)[number];

/** Room icons are names from the portal icon set; the database accepts exactly this list. */
export const roomIcons = {
  message: "Trò chuyện", book: "Học tập", code: "Lập trình", sparkle: "Sáng tạo", briefcase: "Công việc", home: "Ký túc xá",
  language: "Ngoại ngữ", ball: "Thể thao", music: "Âm nhạc", pen: "Viết lách", calendar: "Sự kiện", users: "Cộng đồng",
} as const satisfies Partial<Record<IconName, string>>;
export type RoomIcon = keyof typeof roomIcons;

export type Profile = {
  user_id: string;
  display_name: string;
  student_code: string | null;
  class_name: string | null;
  faculty: string | null;
  bio: string;
};

export type RoomSummary = {
  id: string;
  kind: "group" | "dm";
  name: string | null;
  about: string;
  topic: Topic;
  icon: RoomIcon;
  created_at: string;
  member_count: number;
  joined: boolean;
  unread: number;
  pings: number;
  last_body: string | null;
  last_author: string | null;
  last_at: string | null;
  dm_user: string | null;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  author_id: string;
  body: string;
  reply_to: string | null;
  mentions: string[];
  created_at: string;
};

const db = () => getSupabaseBrowserClient();

/** Untyped client (no generated Database types), so callers name the row shape. */
async function run<T>(query: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) {
    if (error.code === "23505") throw new Error("Đã có nhóm trùng tên.");
    if (error.code === "42501") throw new Error("Bạn không có quyền thực hiện thao tác này.");
    throw new Error("Không kết nối được máy chủ chat. Vui lòng thử lại.");
  }
  return data as T;
}

export const community = {
  enter: () => run<Profile>(db().rpc("community_enter").single()),
  overview: () => run<RoomSummary[]>(db().rpc("community_overview")),
  profiles: () => run<Profile[]>(db().from("community_profiles").select("user_id, display_name, student_code, class_name, faculty, bio")),
  members: (room: string) =>
    run<{ user_id: string }[]>(db().from("community_members").select("user_id").eq("room_id", room)).then((rows) => rows.map((row) => row.user_id)),
  // ponytail: refetches the newest 100 on every poll (also picks up deletions); switch to
  // Supabase Realtime postgres_changes once the realtime service runs locally.
  messages: (room: string) =>
    run<ChatMessage[]>(
      db().from("community_messages").select("id, room_id, author_id, body, reply_to, mentions, created_at")
        .eq("room_id", room).order("created_at", { ascending: false }).limit(100),
    ).then((rows) => rows.reverse()),
  send: (message: Pick<ChatMessage, "room_id" | "author_id" | "body" | "reply_to" | "mentions">) =>
    run(db().from("community_messages").insert(message)),
  remove: (id: string) => run(db().from("community_messages").delete().eq("id", id)),
  join: (room: string, me: string) => run(db().from("community_members").insert({ room_id: room, user_id: me })),
  leave: (room: string, me: string) => run(db().from("community_members").delete().eq("room_id", room).eq("user_id", me)),
  /** Uses the newest message time, not the browser clock, so skew never hides unread messages. */
  markRead: (room: string, me: string, at: string) =>
    run(db().from("community_members").update({ last_read_at: at }).eq("room_id", room).eq("user_id", me).lt("last_read_at", at)),
  createRoom: (name: string, about: string, topic: Topic, icon: RoomIcon) =>
    run<string>(db().rpc("community_create_room", { room_name: name, room_about: about, room_topic: topic, room_icon: icon })),
  openDm: (other: string) => run<string>(db().rpc("community_open_dm", { other_user: other })),
  saveBio: (me: string, bio: string) => run(db().from("community_profiles").update({ bio }).eq("user_id", me)),
};

/** Stable colour per person, from the portal's six tones. */
export function toneOf(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 6;
}
