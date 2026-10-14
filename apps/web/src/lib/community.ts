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
  /** Storage paths in the community-media bucket (supabase/migrations/202610030001_community_media.sql). */
  media: string[];
  created_at: string;
};

const db = () => getSupabaseBrowserClient();
const bucket = "community-media";

/** The bucket enforces the same list and size; these give a friendly message first. */
export const mediaLimits = { maxFiles: 4, maxBytes: 25 * 1024 * 1024 } as const;
const mediaTypes: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};
export const mediaAccept = Object.keys(mediaTypes).join(",");
export const isVideo = (path: string) => /\.(mp4|webm|mov)$/i.test(path);
/** Why a picked file cannot be sent, or null when it can. */
export function mediaProblem(file: File) {
  if (!mediaTypes[file.type]) return `${file.name}: chỉ gửi được ảnh (PNG, JPG, GIF, WebP) hoặc video (MP4, WebM, MOV).`;
  if (file.size > mediaLimits.maxBytes) return `${file.name}: tối đa 25 MB mỗi tệp.`;
  return null;
}

/** Signed URLs last an hour; cached per path so polling does not re-sign or reload media. */
const signed = new Map<string, { url: string; until: number }>();
async function signMedia(paths: string[]) {
  const now = Date.now();
  const missing = paths.filter((path) => (signed.get(path)?.until ?? 0) < now + 5 * 60_000);
  if (missing.length) {
    const { data } = await db().storage.from(bucket).createSignedUrls(missing, 3600);
    for (const item of data ?? []) if (item.path && item.signedUrl) signed.set(item.path, { url: item.signedUrl, until: now + 3600_000 });
  }
  return new Map(paths.flatMap((path) => (signed.has(path) ? [[path, signed.get(path)!.url] as const] : [])));
}

/** Anti-spam refusals from the database (supabase/migrations/202609300004_abuse_limits.sql). */
const abuseMessages: Record<string, string> = {
  rate_limited: "Bạn thao tác quá nhanh. Chờ một lát rồi thử lại.",
  duplicate_message: "Bạn vừa gửi tin nhắn này rồi.",
  too_many_links: "Mỗi tin nhắn chỉ được chứa tối đa 3 liên kết.",
  spam_pattern: "Tin nhắn có dấu hiệu spam (lặp một ký tự quá nhiều).",
};

/** Untyped client (no generated Database types), so callers name the row shape. */
async function run<T>(query: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) {
    const abuse = abuseMessages[error.message];
    if (abuse) throw new Error(abuse);
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
      db().from("community_messages").select("id, room_id, author_id, body, reply_to, mentions, media, created_at")
        .eq("room_id", room).order("created_at", { ascending: false }).limit(100),
    ).then((rows) => rows.reverse()),
  /** Viewable URLs for the media of these messages. */
  mediaUrls: (messages: ChatMessage[]) => signMedia(messages.flatMap((message) => message.media)),
  /** Uploads into the caller's folder of the room; returns the stored paths in order. */
  upload: async (room: string, me: string, files: File[]) => {
    const paths: string[] = [];
    try {
      for (const file of files) {
        const path = `${room}/${me}/${crypto.randomUUID()}.${mediaTypes[file.type]}`;
        const { error } = await db().storage.from(bucket).upload(path, file, { contentType: file.type });
        if (error) throw new Error(/exceed|too large|413/i.test(error.message) ? "Tệp quá lớn (tối đa 25 MB)." : "Không tải được tệp lên. Vui lòng thử lại.");
        paths.push(path);
      }
      return paths;
    } catch (uploadError) {
      // Don't leave half a message's files behind.
      if (paths.length) await db().storage.from(bucket).remove(paths);
      throw uploadError;
    }
  },
  removeMedia: (paths: string[]) => (paths.length ? db().storage.from(bucket).remove(paths).then(() => undefined) : Promise.resolve()),
  send: (message: Pick<ChatMessage, "room_id" | "author_id" | "body" | "reply_to" | "mentions" | "media">) =>
    run(db().from("community_messages").insert(message)),
  remove: (message: Pick<ChatMessage, "id" | "media">) =>
    run(db().from("community_messages").delete().eq("id", message.id)).then(() => community.removeMedia(message.media)),
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
