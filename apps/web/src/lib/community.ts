import { useCallback, useEffect, useState } from "react";
import type { IconName } from "@/components/Icon";
import { getAccountById, PORTAL_ACCOUNTS, readSharedPortalState } from "./accounts";
import { getDefaultUserAvatar, readStoredAvatar } from "./avatar";
import { getSupabaseBrowserClient, hasSupabaseEnvironment } from "./supabase-browser";

// Community chat talks to Supabase when a live database session exists, and falls back to
// a persistent local campus store synced with the active PortalAccount in demo/multi-role mode.

export const topics = ["Học tập", "Câu lạc bộ", "Việc làm", "Thể thao", "Tự do"] as const;
export type Topic = (typeof topics)[number];

/** Room icons are names from the portal icon set; the database accepts this list. */
export const roomIcons = {
  message: "Trò chuyện",
  book: "Học tập",
  code: "Lập trình",
  users: "Cộng đồng",
  briefcase: "Công việc",
  home: "Ký túc xá",
  language: "Ngoại ngữ",
  ball: "Thể thao",
  music: "Âm nhạc",
  pen: "Viết lách",
  calendar: "Sự kiện",
  sparkle: "Sáng tạo",
} as const satisfies Partial<Record<IconName, string>>;
export type RoomIcon = keyof typeof roomIcons;

export type RoomAccent = "ocean" | "crimson" | "emerald" | "indigo" | "amber" | "graphite";

export const ROOM_ACCENTS: { id: RoomAccent; label: string; color: string; soft: string }[] = [
  { id: "ocean", label: "Xanh Zalo", color: "#0068ff", soft: "rgba(0, 104, 255, 0.12)" },
  { id: "crimson", label: "Đỏ Sao Đỏ", color: "#b81d2a", soft: "rgba(184, 29, 42, 0.12)" },
  { id: "emerald", label: "Xanh Ngọc", color: "#0d9488", soft: "rgba(13, 148, 136, 0.12)" },
  { id: "indigo", label: "Tím Indigo", color: "#4f46e5", soft: "rgba(79, 70, 229, 0.12)" },
  { id: "amber", label: "Vàng Hổ phách", color: "#d97706", soft: "rgba(217, 119, 6, 0.12)" },
  { id: "graphite", label: "Than chì", color: "#334155", soft: "rgba(51, 65, 85, 0.12)" },
];

export const ROOM_PHOTO_PRESETS: { id: string; label: string; url: string }[] = [
  { id: "lab-cntt", label: "Phòng thực hành CNTT", url: "/truong/thuc-hanh-01.jpg" },
  { id: "nha-b1", label: "Tòa nhà B1", url: "/truong/nha-b1.jpg" },
  { id: "thu-vien", label: "Thư viện trường", url: "/truong/thu-vien-1.jpg" },
  { id: "khoa-cntt", label: "Khoa Công nghệ thông tin", url: "/truong/khoa-cntt.jpg" },
  { id: "ngoai-ngu", label: "Khoa Du lịch & Ngoại ngữ", url: "/truong/khoa-du-lich-ngoai-ngu.jpg" },
  { id: "doanh-nghiep", label: "Hợp tác doanh nghiệp", url: "/truong/su-kien-doanh-nghiep.jpg" },
  { id: "sinh-vien", label: "Hoạt động sinh viên", url: "/truong/khai-giang-sinh-vien.jpg" },
  { id: "the-thao", label: "Phong trào & Thể thao", url: "/truong/su-kien-trao-thuong.jpg" },
];

export const QUICK_REACTIONS = ["👍", "❤️", "😆", "😮", "😢", "🔥"] as const;

export type Profile = {
  user_id: string;
  display_name: string;
  student_code: string | null;
  class_name: string | null;
  faculty: string | null;
  bio: string;
  avatar_url?: string | null;
  role_title?: string | null;
};

export type RoomSummary = {
  id: string;
  kind: "group" | "dm";
  name: string | null;
  about: string;
  topic: Topic;
  icon: RoomIcon;
  avatar_url: string | null;
  banner_url: string | null;
  accent: RoomAccent;
  owner_id: string | null;
  co_owners: string[];
  is_owner: boolean;
  pinned_note: string | null;
  pinned_message_id: string | null;
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

export type RoomPatch = {
  name?: string | null;
  about?: string;
  topic?: Topic;
  icon?: RoomIcon;
  avatar_url?: string | null;
  banner_url?: string | null;
  accent?: RoomAccent;
  pinned_note?: string | null;
  pinned_message_id?: string | null;
  owner_id?: string | null;
  co_owners?: string[];
};

export type ChatMessage = {
  id: string;
  room_id: string;
  author_id: string;
  body: string;
  reply_to: string | null;
  mentions: string[];
  /** Storage paths in the community-media bucket or local data URLs in demo mode. */
  media: string[];
  created_at: string;
  edited_at?: string | null;
  reactions?: Record<string, string[]>;
};

export type ChatPreferences = {
  accent: "auto" | RoomAccent;
  wallpaper: "zalo" | "clean" | "grid" | "dots" | "warm" | "campus" | "custom";
  customWallpaperUrl: string | null;
  bubbleStyle: "zalo" | "modern" | "compact" | "minimal";
  density: "compact" | "cozy" | "comfortable";
  fontSize: "sm" | "md" | "lg";
  avatarShape: "circle" | "squircle";
  showMyAvatar: boolean;
  showCohortBadge: boolean;
  showQuickPrompts: boolean;
};

const PREFS_KEY = "sao-do:community-prefs:v3";
const PREFS_EVENT = "sao-do:community-prefs-change";

export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  accent: "ocean",
  wallpaper: "zalo",
  customWallpaperUrl: null,
  bubbleStyle: "zalo",
  density: "cozy",
  fontSize: "md",
  avatarShape: "circle",
  showMyAvatar: true,
  showCohortBadge: true,
  showQuickPrompts: true,
};

export function readChatPreferences(): ChatPreferences {
  if (typeof window === "undefined") return DEFAULT_CHAT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_CHAT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<ChatPreferences>;
    return { ...DEFAULT_CHAT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_CHAT_PREFERENCES;
  }
}

export function writeChatPreferences(patch: Partial<ChatPreferences>): ChatPreferences {
  const next = { ...readChatPreferences(), ...patch };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: next }));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}

export function useChatPreferences() {
  const [prefs, setPrefs] = useState<ChatPreferences>(DEFAULT_CHAT_PREFERENCES);

  useEffect(() => {
    const sync = () => setPrefs(readChatPreferences());
    sync();
    window.addEventListener(PREFS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PREFS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const updatePrefs = useCallback((patch: Partial<ChatPreferences>) => {
    setPrefs(writeChatPreferences(patch));
  }, []);

  const resetPrefs = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PREFS_KEY);
      window.dispatchEvent(new CustomEvent(PREFS_EVENT));
    }
    setPrefs(DEFAULT_CHAT_PREFERENCES);
  }, []);

  return { prefs, updatePrefs, resetPrefs };
}

const db = () => getSupabaseBrowserClient();
const bucket = "community-media";

export const mediaLimits = { maxFiles: 4, maxBytes: 25 * 1024 * 1024 } as const;
const mediaTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
export const mediaAccept = Object.keys(mediaTypes).join(",");
export const isVideo = (path: string) => /\.(mp4|webm|mov)$/i.test(path) || path.startsWith("data:video/");

export function mediaProblem(file: File) {
  if (!mediaTypes[file.type]) return `${file.name}: chỉ hỗ trợ ảnh (PNG, JPG, GIF, WebP) hoặc video (MP4, WebM, MOV)`;
  if (file.size > mediaLimits.maxBytes) return `${file.name}: tối đa 25 MB mỗi tệp`;
  return null;
}

const signed = new Map<string, { url: string; until: number }>();
async function signMedia(paths: string[]) {
  const result = new Map<string, string>();
  const remotePaths: string[] = [];
  for (const path of paths) {
    if (path.startsWith("data:") || path.startsWith("blob:") || path.startsWith("/")) {
      result.set(path, path);
    } else {
      remotePaths.push(path);
    }
  }
  if (!remotePaths.length || !(await hasLiveSession())) return result;
  const now = Date.now();
  const missing = remotePaths.filter((path) => (signed.get(path)?.until ?? 0) < now + 5 * 60_000);
  if (missing.length) {
    const { data } = await db().storage.from(bucket).createSignedUrls(missing, 3600);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) signed.set(item.path, { url: item.signedUrl, until: now + 3600_000 });
    }
  }
  for (const path of remotePaths) {
    if (signed.has(path)) result.set(path, signed.get(path)!.url);
  }
  return result;
}

const abuseMessages: Record<string, string> = {
  rate_limited: "Bạn thao tác quá nhanh, vui lòng chờ một lát rồi thử lại",
  duplicate_message: "Bạn vừa gửi nội dung này rồi",
  too_many_links: "Mỗi tin nhắn chỉ chứa tối đa 3 liên kết",
  spam_pattern: "Tin nhắn có dấu hiệu lặp ký tự bất thường",
};

async function run<T>(query: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) {
    const abuse = abuseMessages[error.message];
    if (abuse) throw new Error(abuse);
    if (error.code === "23505") throw new Error("Đã có nhóm trùng tên");
    if (error.code === "42501") throw new Error("Bạn không có quyền thực hiện thao tác này");
    throw new Error("Không kết nối được máy chủ trò chuyện");
  }
  return data as T;
}

async function hasLiveSession(): Promise<boolean> {
  if (!hasSupabaseEnvironment) return false;
  try {
    const { data } = await db().auth.getSession();
    return Boolean(data.session?.access_token);
  } catch {
    return false;
  }
}

// ---------- Local multi-role & demo campus store + Room Customization Overlay ----------

const LOCAL_KEY = "sao-do:community-state:v3";
const ROOM_META_KEY = "sao-do:community-room-meta:v2";
const KV_ROOM_META_KEY = "portal_community_room_meta";
const MSG_META_KEY = "sao-do:community-msg-meta:v1";

const uid = (n: number) => `10000000-0000-0000-0000-00000${2200000 + n}`;
const rid = (n: number) => `e0000000-0000-0000-0000-00000000000${n}`;
const mid = (n: number) => `e1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

type LocalRoom = {
  id: string;
  kind: "group" | "dm";
  name: string | null;
  about: string;
  topic: Topic;
  icon: RoomIcon;
  avatar_url?: string | null;
  banner_url?: string | null;
  accent?: RoomAccent;
  owner_id?: string | null;
  co_owners?: string[];
  pinned_note?: string | null;
  pinned_message_id?: string | null;
  created_at: string;
  dm_key?: string;
};

type LocalMember = {
  room_id: string;
  user_id: string;
  last_read_at: string;
};

type LocalState = {
  profiles: Profile[];
  rooms: LocalRoom[];
  members: LocalMember[];
  messages: ChatMessage[];
};

type RoomMetaMap = Record<string, RoomPatch>;
type MessageMetaMap = Record<
  string,
  {
    body?: string;
    edited_at?: string;
    reactions?: Record<string, string[]>;
  }
>;

function readRoomMetaMap(): RoomMetaMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ROOM_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as RoomMetaMap) : {};
  } catch {
    return {};
  }
}

function writeRoomMetaMap(next: RoomMetaMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ROOM_META_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors
  }
  if (hasSupabaseEnvironment) {
    void getSupabaseBrowserClient()
      .from("portal_kv_store")
      .upsert(
        {
          key: KV_ROOM_META_KEY,
          value: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .then(() => undefined, () => undefined);
  }
}

let roomMetaPulled = false;
async function pullRemoteRoomMetaOnce(): Promise<void> {
  if (roomMetaPulled || typeof window === "undefined" || !hasSupabaseEnvironment) return;
  roomMetaPulled = true;
  try {
    const { data, error } = await getSupabaseBrowserClient()
      .from("portal_kv_store")
      .select("value")
      .eq("key", KV_ROOM_META_KEY)
      .maybeSingle();
    if (error || !data?.value || typeof data.value !== "object" || Array.isArray(data.value)) return;
    const merged: RoomMetaMap = { ...(data.value as RoomMetaMap), ...readRoomMetaMap() };
    window.localStorage.setItem(ROOM_META_KEY, JSON.stringify(merged));
  } catch {
    // Ignore offline errors
  }
}

function readMessageMetaMap(): MessageMetaMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MSG_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as MessageMetaMap) : {};
  } catch {
    return {};
  }
}

function writeMessageMetaMap(updater: (prev: MessageMetaMap) => MessageMetaMap): MessageMetaMap {
  const next = updater(readMessageMetaMap());
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(MSG_META_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  }
  return next;
}

function currentLocalUserId(): string {
  const state = readSharedPortalState();
  const account = getAccountById(state.activeAccountId);
  if (account.code === "2200286") return uid(286);
  if (account.code === "2200287") return uid(287);
  if (account.code === "2200288") return uid(288);
  return account.id;
}

function decorateProfile(profile: Profile): Profile {
  const stored = readStoredAvatar(profile.user_id);
  return {
    ...profile,
    avatar_url: stored ?? profile.avatar_url ?? getDefaultUserAvatar(profile.user_id, profile.display_name),
  };
}

const DEFAULT_ROOM_VISUALS: Record<
  string,
  {
    avatar_url: string;
    banner_url: string;
    accent: RoomAccent;
    owner_id: string;
    co_owners: string[];
    pinned_note: string;
  }
> = {
  [rid(1)]: {
    avatar_url: "/truong/thuc-hanh-01.jpg",
    banner_url: "/truong/khoa-cntt.jpg",
    accent: "ocean",
    owner_id: uid(286),
    co_owners: ["acc-teacher-duc", uid(287), uid(288)],
    pinned_note: "Lịch bảo vệ bài thực hành số 1 (Kế thừa & Đa hình) thứ Tư tại phòng B1-Lab 3.",
  },
  [rid(2)]: {
    avatar_url: "/truong/nha-b1.jpg",
    banner_url: "/truong/thuc-hanh-02.jpg",
    accent: "crimson",
    owner_id: uid(286),
    co_owners: [uid(287), uid(288), uid(308), "acc-teacher-duc"],
    pinned_note: "Sinh hoạt chuyên môn CLB Tin học 14:00 thứ Bảy hàng tuần tại phòng B1-Lab 3.",
  },
  [rid(5)]: {
    avatar_url: "/truong/khoa-du-lich-ngoai-ngu.jpg",
    banner_url: "/truong/thu-vien-1.jpg",
    accent: "indigo",
    owner_id: uid(286),
    co_owners: [uid(305), uid(287), uid(288), "acc-teacher-duc"],
    pinned_note: "Thứ Năm 15:00 luyện phỏng vấn thực tập bằng tiếng Anh & sửa Technical Cover Letter tại sảnh thư viện.",
  },
  [rid(7)]: {
    avatar_url: "/truong/thu-vien-1.jpg",
    banner_url: "/truong/thu-vien-2.jpg",
    accent: "emerald",
    owner_id: uid(287),
    co_owners: [uid(286), uid(309), "acc-teacher-duc"],
    pinned_note: "Kho lưu trữ đề cương, slide bài giảng và bài tập mẫu các học phần đại cương & chuyên ngành.",
  },
  [rid(3)]: {
    avatar_url: "/truong/su-kien-doanh-nghiep.jpg",
    banner_url: "/truong/khai-giang-hoi-truong.jpg",
    accent: "amber",
    owner_id: uid(306),
    co_owners: [uid(286), uid(287), "acc-teacher-duc"],
    pinned_note: "Tổng hợp thông tin thực tập doanh nghiệp đối tác tại Hải Dương, Hà Nội và Bắc Ninh.",
  },
  [rid(4)]: {
    avatar_url: "/truong/khai-giang-sinh-vien.jpg",
    banner_url: "/truong/nha-b1.jpg",
    accent: "emerald",
    owner_id: uid(307),
    co_owners: [uid(286), uid(287)],
    pinned_note: "Trực ban tự quản Ký túc xá khu B tại phòng B204 (mở cửa 06:00 – 22:30).",
  },
  [rid(6)]: {
    avatar_url: "/truong/su-kien-trao-thuong.jpg",
    banner_url: "/truong/khai-giang-sinh-vien.jpg",
    accent: "crimson",
    owner_id: uid(304),
    co_owners: [uid(286), uid(302), uid(310)],
    pinned_note: "Đăng ký lịch đá tập giao hữu liên khoa chiều thứ Sáu lúc 17:00 tại sân cỏ nhân tạo.",
  },
};

function buildSeedState(): LocalState {
  const now = Date.parse("2026-11-01T08:00:00+07:00");
  const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

  const profiles: Profile[] = [
    {
      user_id: uid(286),
      display_name: "Nguyễn Văn Minh",
      student_code: "2200286",
      class_name: "DK13-CNTT1",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Chủ nhiệm CLB Tin học Sao Đỏ, phụ trách nhóm thực hành OOP và dự án Web tại phòng B1-Lab 3",
      role_title: "Chủ nhiệm CLB Tin học",
    },
    {
      user_id: uid(287),
      display_name: "Phạm Khánh Linh",
      student_code: "2200287",
      class_name: "DK13-CNTT1",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Lớp trưởng DK13-CNTT1, tổng hợp học liệu môn Cơ sở dữ liệu và Lập trình hướng đối tượng",
      role_title: "Lớp trưởng DK13-CNTT1",
    },
    {
      user_id: uid(288),
      display_name: "Lê Việt Hoàng",
      student_code: "2200288",
      class_name: "DK13-CNTT1",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Sinh viên lớp DK13-CNTT1, quan tâm thuật toán C++ và thiết kế giao diện web",
      role_title: "Sinh viên DK13-CNTT1",
    },
    {
      user_id: "acc-teacher-duc",
      display_name: "ThS. Trần Minh Đức",
      student_code: "GV.CNTT.018",
      class_name: "DK13-CNTT1",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Giảng viên phụ trách học phần IT3040 (OOP) và cố vấn học tập lớp niên chế DK13-CNTT1",
      role_title: "Giảng viên · Cố vấn học tập",
    },
    {
      user_id: uid(301),
      display_name: "Nguyễn Minh Anh",
      student_code: "2200301",
      class_name: "DC.CNTT17.10",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Lớp trưởng DC.CNTT17.10, đang làm đồ án React và TypeScript",
      role_title: "Lớp trưởng DC.CNTT17.10",
    },
    {
      user_id: uid(302),
      display_name: "Trần Đức Huy",
      student_code: "2200302",
      class_name: "DC.CNTT17.10",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Phụ trách nhóm học thuật Backend và truy vấn SQL tại CLB Tin học",
      role_title: "Trưởng ban Học thuật CLB",
    },
    {
      user_id: uid(303),
      display_name: "Lê Thu Trang",
      student_code: "2200303",
      class_name: "DC.KT17.02",
      faculty: "Khoa Kinh tế",
      bio: "Sinh viên năm 3 ngành Kế toán doanh nghiệp, đang tìm kỳ thực tập học kỳ tới",
      role_title: "Sinh viên Khoa Kinh tế",
    },
    {
      user_id: uid(304),
      display_name: "Phạm Quốc Bảo",
      student_code: "2200304",
      class_name: "DC.CK17.05",
      faculty: "Khoa Cơ khí",
      bio: "Đội trưởng đội bóng đá sinh viên Khoa Cơ khí",
      role_title: "Đội trưởng bóng đá Cơ khí",
    },
    {
      user_id: uid(305),
      display_name: "Hoàng Ngọc Linh",
      student_code: "2200305",
      class_name: "DC.NNA17.01",
      faculty: "Khoa Du lịch & Ngoại ngữ",
      bio: "IELTS 7.5, điều phối lịch luyện nói tiếng Anh chuyên ngành chiều thứ Năm",
      role_title: "Điều phối CLB Tiếng Anh",
    },
    {
      user_id: uid(306),
      display_name: "Vũ Thành Đạt",
      student_code: "2200306",
      class_name: "DC.CNTT16.08",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Sinh viên năm cuối, thực tập sinh kỹ sư Frontend tại Hải Dương",
      role_title: "Thực tập sinh Frontend",
    },
    {
      user_id: uid(307),
      display_name: "Đặng Khánh Vy",
      student_code: "2200307",
      class_name: "DC.KT18.03",
      faculty: "Khoa Kinh tế",
      bio: "Sinh viên khóa 18, ban tự quản Ký túc xá khu B",
      role_title: "Ban tự quản KTX khu B",
    },
    {
      user_id: uid(308),
      display_name: "Bùi Gia Khánh",
      student_code: "2200308",
      class_name: "DC.DT17.04",
      faculty: "Khoa Điện",
      bio: "Nghiên cứu vi điều khiển STM32 và hệ thống nhúng, Phó chủ nhiệm CLB Tin học",
      role_title: "Phó chủ nhiệm CLB Tin học",
    },
    {
      user_id: uid(309),
      display_name: "Đỗ Phương Thảo",
      student_code: "2200309",
      class_name: "DC.CNTT18.02",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Tổng hợp đề cương Cấu trúc dữ liệu, Giải thuật và Toán rời rạc",
      role_title: "Ban học liệu CNTT",
    },
    {
      user_id: uid(310),
      display_name: "Ngô Hải Nam",
      student_code: "2200310",
      class_name: "DC.OTO17.01",
      faculty: "Khoa Ô tô",
      bio: "Thành viên nhóm thực hành chẩn đoán điện tử ô tô và giải bóng đá trường",
      role_title: "Sinh viên Khoa Ô tô",
    },
  ];

  const rooms: LocalRoom[] = [
    {
      id: rid(1),
      kind: "group",
      name: "Ôn thi Lập trình & OOP (IT3040)",
      about: "Thảo luận bài thực hành C++/Java, cấu trúc lớp trừu tượng và đề cương học phần IT3040",
      topic: "Học tập",
      icon: "code",
      ...DEFAULT_ROOM_VISUALS[rid(1)],
      pinned_message_id: mid(2),
      created_at: minsAgo(43200),
    },
    {
      id: rid(2),
      kind: "group",
      name: "CLB Tin học Sao Đỏ",
      about: "Lịch sinh hoạt chuyên môn tại B1-Lab 2, ôn luyện Olympic Tin học và dự án phần mềm",
      topic: "Câu lạc bộ",
      icon: "users",
      ...DEFAULT_ROOM_VISUALS[rid(2)],
      pinned_message_id: mid(6),
      created_at: minsAgo(43000),
    },
    {
      id: rid(5),
      kind: "group",
      name: "Tiếng Anh chuyên ngành (EN2130)",
      about: "Luyện phỏng vấn kỹ thuật, rà soát Cover Letter và chia sẻ tài liệu TOEIC/IELTS",
      topic: "Học tập",
      icon: "language",
      ...DEFAULT_ROOM_VISUALS[rid(5)],
      pinned_message_id: mid(12),
      created_at: minsAgo(41000),
    },
    {
      id: rid(7),
      kind: "group",
      name: "Kho học liệu & Đề cương các khoa",
      about: "Slide bài giảng, đề thi các kỳ trước và tài liệu tham khảo cho môn đại cương, chuyên ngành",
      topic: "Học tập",
      icon: "book",
      ...DEFAULT_ROOM_VISUALS[rid(7)],
      created_at: minsAgo(40000),
    },
    {
      id: rid(3),
      kind: "group",
      name: "Thực tập & Tuyển dụng kỹ thuật",
      about: "Thông tin thực tập doanh nghiệp đối tác tại Hải Dương, Hà Nội và góp ý hồ sơ ứng tuyển",
      topic: "Việc làm",
      icon: "briefcase",
      ...DEFAULT_ROOM_VISUALS[rid(3)],
      created_at: minsAgo(39000),
    },
    {
      id: rid(4),
      kind: "group",
      name: "Nội trú Ký túc xá khu B",
      about: "Thông báo ban tự quản, tìm thẻ sinh viên thất lạc và lịch trực vệ sinh khu nội trú",
      topic: "Tự do",
      icon: "home",
      ...DEFAULT_ROOM_VISUALS[rid(4)],
      created_at: minsAgo(38000),
    },
    {
      id: rid(6),
      kind: "group",
      name: "Giải bóng đá sinh viên Sao Đỏ",
      about: "Lịch thi đấu giao hữu giữa các khoa và đăng ký sân cỏ nhân tạo chiều hàng tuần",
      topic: "Thể thao",
      icon: "ball",
      ...DEFAULT_ROOM_VISUALS[rid(6)],
      created_at: minsAgo(37000),
    },
    {
      id: rid(8),
      kind: "dm",
      name: null,
      about: "",
      topic: "Tự do",
      icon: "message",
      created_at: minsAgo(2880),
      dm_key: `${uid(286)}:${uid(301)}`,
    },
  ];

  const memberPairs: [string, string[], number][] = [
    [rid(1), [uid(286), uid(287), uid(288), "acc-teacher-duc", uid(301), uid(302), uid(306), uid(309)], 60],
    [rid(2), [uid(286), uid(287), uid(288), uid(301), uid(302), uid(308), uid(309)], 400],
    [rid(3), [uid(286), uid(301), uid(303), uid(306), uid(307)], 1200],
    [rid(4), [uid(286), uid(303), uid(307), uid(310)], 1200],
    [rid(5), [uid(286), uid(287), uid(303), uid(305), uid(307)], 240],
    [rid(6), [uid(286), uid(302), uid(304), uid(310)], 1200],
    [rid(7), [uid(286), uid(287), uid(301), uid(305), uid(309)], 1200],
    [rid(8), [uid(286), uid(301)], 180],
  ];

  const members: LocalMember[] = [];
  for (const [roomId, userIds, readAgo] of memberPairs) {
    for (const userId of userIds) {
      members.push({ room_id: roomId, user_id: userId, last_read_at: minsAgo(readAgo) });
    }
  }

  const messages: ChatMessage[] = [
    {
      id: mid(1),
      room_id: rid(1),
      author_id: uid(302),
      body: "Đề kiểm tra giữa kỳ năm ngoái gồm một bài thiết kế lớp trừu tượng và một bài quản lý danh sách bằng con trỏ thông minh, mọi người lưu ý ôn kỹ phần hàm hủy ảo.",
      reply_to: null,
      mentions: [],
      media: [],
      created_at: minsAgo(1440),
      reactions: { "👍": [uid(286), uid(287)], "🎯": [uid(309)] },
    },
    {
      id: mid(2),
      room_id: rid(1),
      author_id: uid(309),
      body: "Trong bài thực hành số 1 môn IT3040, phương thức tinhPhiQuaHan nên khai báo pure virtual ở lớp cơ sở TaiLieu đúng không mọi người?",
      reply_to: null,
      mentions: [],
      media: [],
      created_at: minsAgo(95),
    },
    {
      id: mid(3),
      room_id: rid(1),
      author_id: uid(302),
      body: "Đúng rồi, khai báo virtual double tinhPhiQuaHan(int soNgay) const = 0 để các lớp SachGiaoTrinh, LuanVan, TapChi ghi đè theo định mức riêng.",
      reply_to: mid(2),
      mentions: [],
      media: [],
      created_at: minsAgo(88),
      reactions: { "✅": [uid(286), uid(309)] },
    },
    {
      id: mid(4),
      room_id: rid(1),
      author_id: uid(306),
      body: "@Nguyễn Văn Minh hôm trước bạn hỏi về mẫu kiểm thử đa hình với std::unique_ptr, mình đã cập nhật ví dụ mẫu trong kênh Kho học liệu.",
      reply_to: null,
      mentions: [uid(286)],
      media: [],
      created_at: minsAgo(38),
      reactions: { "❤️": [uid(286)] },
    },
    {
      id: mid(5),
      room_id: rid(1),
      author_id: uid(287),
      body: "Tối nay 20:00 nhóm lớp DK13-CNTT1 mở phòng thảo luận rà soát lược đồ 3NF môn Cơ sở dữ liệu trước khi nộp bài nhé.",
      reply_to: null,
      mentions: [],
      media: [],
      created_at: minsAgo(14),
      reactions: { "🔥": [uid(286), uid(288)] },
    },
    {
      id: mid(6),
      room_id: rid(2),
      author_id: uid(308),
      body: "Lịch sinh hoạt CLB Tin học tuần này diễn ra lúc 14:00 thứ Bảy tại phòng B1-Lab 3, chuyên đề quy trình làm việc nhóm với Git và kiểm thử tự động.",
      reply_to: null,
      mentions: [],
      media: [],
      created_at: minsAgo(310),
      reactions: { "👏": [uid(286), uid(301), uid(302)] },
    },
    {
      id: mid(7),
      room_id: rid(2),
      author_id: uid(301),
      body: "Buổi thực hành có cần cài đặt trước bộ công cụ nào trên máy cá nhân không anh?",
      reply_to: mid(6),
      mentions: [],
      media: [],
      created_at: minsAgo(285),
    },
    {
      id: mid(8),
      room_id: rid(2),
      author_id: uid(308),
      body: "@Nguyễn Minh Anh chỉ cần chuẩn bị sẵn Git, VS Code và tài khoản GitHub sinh viên là đủ.",
      reply_to: mid(7),
      mentions: [uid(301)],
      media: [],
      created_at: minsAgo(270),
      reactions: { "👍": [uid(301)] },
    },
    {
      id: mid(9),
      room_id: rid(3),
      author_id: uid(306),
      body: "Doanh nghiệp phần mềm đối tác tại Hải Dương đang mở đợt nhận 5 thực tập sinh Frontend và QA học kỳ tới, hạn nhận hồ sơ vào ngày 15 tháng sau.",
      reply_to: null,
      mentions: [],
      media: [],
      created_at: minsAgo(620),
    },
    {
      id: mid(10),
      room_id: rid(3),
      author_id: uid(303),
      body: "Trong nhóm mình có anh chị nào đã thực tập vị trí kế toán tổng hợp tại khu công nghiệp Đại An cho em xin kinh nghiệm chuẩn bị hồ sơ với ạ.",
      reply_to: null,
      mentions: [],
      media: [],
      created_at: minsAgo(210),
    },
    {
      id: mid(11),
      room_id: rid(4),
      author_id: uid(307),
      body: "Bạn nào để quên thẻ sinh viên khóa K17 ở căng tin nhà B1 chiều nay thì liên hệ phòng trực B204 để nhận lại.",
      reply_to: null,
      mentions: [],
      media: [],
      created_at: minsAgo(45),
    },
    {
      id: mid(12),
      room_id: rid(5),
      author_id: uid(305),
      body: "Chiều thứ Năm tuần này nhóm luyện nói chủ đề phỏng vấn thực tập kỹ thuật và sửa bài Technical Cover Letter môn EN2130 tại sảnh thư viện.",
      reply_to: null,
      mentions: [],
      media: [],
      created_at: minsAgo(180),
      reactions: { "❤️": [uid(286), uid(307)], "🎯": [uid(287)] },
    },
    {
      id: mid(13),
      room_id: rid(5),
      author_id: uid(307),
      body: "Em đăng ký tham gia cùng nhóm. @Hoàng Ngọc Linh cho em hỏi có cần gửi bản nháp Cover Letter trước buổi học không chị?",
      reply_to: mid(12),
      mentions: [uid(305)],
      media: [],
      created_at: minsAgo(150),
      reactions: { "👍": [uid(305)] },
    },
    {
      id: mid(14),
      room_id: rid(6),
      author_id: uid(304),
      body: "Chiều thứ Sáu 17:00 đội Khoa Cơ khí đá tập tại sân vận động trường, hiện còn thiếu 2 vị trí hậu vệ.",
      reply_to: null,
      mentions: [],
      media: [],
      created_at: minsAgo(65),
    },
    {
      id: mid(15),
      room_id: rid(6),
      author_id: uid(310),
      body: "Mình đăng ký tham gia cùng @Trần Đức Huy chiều thứ Sáu này.",
      reply_to: mid(14),
      mentions: [uid(302)],
      media: [],
      created_at: minsAgo(55),
    },
    {
      id: mid(16),
      room_id: rid(7),
      author_id: uid(309),
      body: "Đã cập nhật trọn bộ slide Cấu trúc dữ liệu & Giải thuật chương 1–5 kèm bài tập mẫu cây nhị phân tìm kiếm.",
      reply_to: null,
      mentions: [],
      media: [],
      created_at: minsAgo(720),
    },
    {
      id: mid(17),
      room_id: rid(8),
      author_id: uid(301),
      body: "Chào Minh, sáng mai trước giờ thực hành ở phòng B1-Lab 3 mình trao đổi nhanh phần phân tách header C++ của nhóm nhé.",
      reply_to: null,
      mentions: [],
      media: [],
      created_at: minsAgo(25),
    },
  ];

  return { profiles, rooms, members, messages };
}

function readLocal(): LocalState {
  if (typeof window === "undefined") return buildSeedState();
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) {
      const seeded = buildSeedState();
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<LocalState>;
    if (!Array.isArray(parsed.rooms) || !Array.isArray(parsed.messages) || !Array.isArray(parsed.profiles)) {
      const seeded = buildSeedState();
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return parsed as LocalState;
  } catch {
    return buildSeedState();
  }
}

function writeLocal(updater: (prev: LocalState) => LocalState): LocalState {
  const next = updater(readLocal());
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors in private mode.
    }
  }
  return next;
}

function ensureLocalMe(): Profile {
  const meId = currentLocalUserId();
  const state = readSharedPortalState();
  const activeAcc = PORTAL_ACCOUNTS.find((a) => a.id === state.activeAccountId) ?? PORTAL_ACCOUNTS[1]!;
  const local = readLocal();
  const existing = local.profiles.find((p) => p.user_id === meId);
  if (existing) return decorateProfile(existing);
  const created: Profile = {
    user_id: meId,
    display_name: activeAcc.displayName,
    student_code: activeAcc.code,
    class_name: activeAcc.cohortClass,
    faculty: activeAcc.department,
    bio: activeAcc.bio,
    role_title: activeAcc.roleTitle,
  };
  writeLocal((prev) => ({
    ...prev,
    profiles: [...prev.profiles, created],
  }));
  return decorateProfile(created);
}

function enrichRoomSummary(base: Omit<RoomSummary, "avatar_url" | "banner_url" | "accent" | "owner_id" | "co_owners" | "is_owner" | "pinned_note" | "pinned_message_id"> & Partial<RoomPatch>, meId: string): RoomSummary {
  const metaMap = readRoomMetaMap();
  const custom = metaMap[base.id] ?? {};
  const defaults = DEFAULT_ROOM_VISUALS[base.id];

  const name = custom.name !== undefined ? custom.name : base.name;
  const about = custom.about !== undefined ? custom.about : base.about;
  const topic = custom.topic !== undefined ? custom.topic : base.topic;
  const icon = custom.icon !== undefined ? custom.icon : base.icon;
  const avatar_url =
    custom.avatar_url !== undefined
      ? custom.avatar_url
      : base.avatar_url !== undefined
        ? base.avatar_url
        : (defaults?.avatar_url ?? null);
  const banner_url =
    custom.banner_url !== undefined
      ? custom.banner_url
      : base.banner_url !== undefined
        ? base.banner_url
        : (defaults?.banner_url ?? null);
  const accent: RoomAccent =
    custom.accent ??
    base.accent ??
    defaults?.accent ??
    (topic === "Câu lạc bộ"
      ? "crimson"
      : topic === "Việc làm"
        ? "amber"
        : topic === "Thể thao"
          ? "emerald"
          : topic === "Tự do"
            ? "indigo"
            : "ocean");

  const owner_id =
    base.kind === "group"
      ? (custom.owner_id ?? base.owner_id ?? defaults?.owner_id ?? meId)
      : null;
  const co_owners =
    base.kind === "group"
      ? Array.from(new Set([...(custom.co_owners ?? base.co_owners ?? defaults?.co_owners ?? []), meId]))
      : [];
  const is_owner =
    base.kind === "group" &&
    (owner_id === meId || co_owners.includes(meId));

  const pinned_note =
    custom.pinned_note !== undefined
      ? custom.pinned_note
      : base.pinned_note !== undefined
        ? base.pinned_note
        : (defaults?.pinned_note ?? null);
  const pinned_message_id =
    custom.pinned_message_id !== undefined
      ? custom.pinned_message_id
      : (base.pinned_message_id ?? null);

  return {
    ...base,
    name,
    about,
    topic,
    icon,
    avatar_url,
    banner_url,
    accent,
    owner_id,
    co_owners,
    is_owner,
    pinned_note,
    pinned_message_id,
  };
}

function enrichMessages(list: ChatMessage[]): ChatMessage[] {
  const meta = readMessageMetaMap();
  return list.map((msg) => {
    const patch = meta[msg.id];
    if (!patch) return msg;
    return {
      ...msg,
      body: patch.body !== undefined ? patch.body : msg.body,
      edited_at: patch.edited_at ?? msg.edited_at ?? null,
      reactions: patch.reactions ?? msg.reactions,
    };
  });
}

function computeLocalOverview(): RoomSummary[] {
  const me = ensureLocalMe();
  const local = readLocal();
  const profilesById = new Map(local.profiles.map((p) => [p.user_id, p]));

  return local.rooms
    .filter((room) => {
      if (room.kind === "group") return true;
      return local.members.some((m) => m.room_id === room.id && m.user_id === me.user_id);
    })
    .map((room) => {
      const roomMembers = local.members.filter((m) => m.room_id === room.id);
      const myMembership = roomMembers.find((m) => m.user_id === me.user_id);
      const roomMessages = enrichMessages(
        local.messages
          .filter((msg) => msg.room_id === room.id)
          .sort((a, b) => a.created_at.localeCompare(b.created_at)),
      );
      const last = roomMessages.at(-1);
      const unreadMessages = myMembership
        ? roomMessages.filter(
            (msg) => msg.created_at > myMembership.last_read_at && msg.author_id !== me.user_id,
          )
        : [];
      const pings = unreadMessages.filter((msg) => msg.mentions.includes(me.user_id)).length;
      const otherMember =
        room.kind === "dm" ? roomMembers.find((m) => m.user_id !== me.user_id)?.user_id ?? null : null;

      return enrichRoomSummary(
        {
          id: room.id,
          kind: room.kind,
          name: room.name,
          about: room.about,
          topic: room.topic,
          icon: room.icon,
          avatar_url: room.avatar_url,
          banner_url: room.banner_url,
          accent: room.accent,
          owner_id: room.owner_id,
          co_owners: room.co_owners,
          pinned_note: room.pinned_note,
          pinned_message_id: room.pinned_message_id,
          created_at: room.created_at,
          member_count: roomMembers.length,
          joined: Boolean(myMembership),
          unread: unreadMessages.length,
          pings,
          last_body: last ? (last.body || (last.media.some(isVideo) ? "[Video]" : "[Hình ảnh]")) : null,
          last_author: last ? (profilesById.get(last.author_id)?.display_name ?? "Thành viên") : null,
          last_at: last?.created_at ?? null,
          dm_user: otherMember,
        },
        me.user_id,
      );
    });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Không đọc được tệp đính kèm"));
    reader.readAsDataURL(file);
  });
}

export const community = {
  enter: async (): Promise<Profile> => {
    await pullRemoteRoomMetaOnce();
    if (await hasLiveSession()) {
      try {
        const remote = await run<Profile>(db().rpc("community_enter").single());
        return decorateProfile(remote);
      } catch {
        // Fall through to local multi-role campus profile.
      }
    }
    return ensureLocalMe();
  },

  overview: async (): Promise<RoomSummary[]> => {
    await pullRemoteRoomMetaOnce();
    const me = ensureLocalMe();
    if (await hasLiveSession()) {
      try {
        const rows = await run<RoomSummary[]>(db().rpc("community_overview"));
        return rows.map((row) => enrichRoomSummary(row, me.user_id));
      } catch {
        // Fall through to local overview.
      }
    }
    return computeLocalOverview();
  },

  profiles: async (): Promise<Profile[]> => {
    if (await hasLiveSession()) {
      try {
        const rows = await run<Profile[]>(
          db().from("community_profiles").select("user_id, display_name, student_code, class_name, faculty, bio"),
        );
        return rows.map(decorateProfile);
      } catch {
        // Fall through to local profiles.
      }
    }
    ensureLocalMe();
    return readLocal().profiles.map(decorateProfile);
  },

  members: async (room: string): Promise<string[]> => {
    if (await hasLiveSession()) {
      try {
        const rows = await run<{ user_id: string }[]>(
          db().from("community_members").select("user_id").eq("room_id", room),
        );
        return rows.map((row) => row.user_id);
      } catch {
        // Fall through to local members.
      }
    }
    return readLocal()
      .members.filter((m) => m.room_id === room)
      .map((m) => m.user_id);
  },

  messages: async (room: string): Promise<ChatMessage[]> => {
    if (await hasLiveSession()) {
      try {
        const rows = await run<ChatMessage[]>(
          db()
            .from("community_messages")
            .select("id, room_id, author_id, body, reply_to, mentions, media, created_at")
            .eq("room_id", room)
            .order("created_at", { ascending: false })
            .limit(100),
        );
        return enrichMessages(rows.reverse());
      } catch {
        // Fall through to local messages.
      }
    }
    return enrichMessages(
      readLocal()
        .messages.filter((m) => m.room_id === room)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(-100),
    );
  },

  mediaUrls: (messages: ChatMessage[]) => signMedia(messages.flatMap((message) => message.media)),

  upload: async (room: string, me: string, files: File[]) => {
    if (!files.length) return [];
    if (await hasLiveSession()) {
      const paths: string[] = [];
      try {
        for (const file of files) {
          const path = `${room}/${me}/${crypto.randomUUID()}.${mediaTypes[file.type]}`;
          const { error } = await db().storage.from(bucket).upload(path, file, { contentType: file.type });
          if (error) {
            throw new Error(
              /exceed|too large|413/i.test(error.message)
                ? "Tệp quá lớn (tối đa 25 MB)"
                : "Không tải được tệp lên, vui lòng thử lại",
            );
          }
          paths.push(path);
        }
        return paths;
      } catch (uploadError) {
        if (paths.length) await db().storage.from(bucket).remove(paths);
        throw uploadError;
      }
    }
    return Promise.all(files.map(fileToDataUrl));
  },

  removeMedia: async (paths: string[]) => {
    const remote = paths.filter((p) => !p.startsWith("data:") && !p.startsWith("blob:"));
    if (!remote.length || !(await hasLiveSession())) return;
    await db().storage.from(bucket).remove(remote);
  },

  send: async (message: Pick<ChatMessage, "room_id" | "author_id" | "body" | "reply_to" | "mentions" | "media">) => {
    if (await hasLiveSession()) {
      try {
        await run(db().from("community_messages").insert(message));
        return;
      } catch {
        // Fall through to local store if not authenticated in Supabase.
      }
    }
    const now = new Date().toISOString();
    const created: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      room_id: message.room_id,
      author_id: message.author_id,
      body: message.body,
      reply_to: message.reply_to,
      mentions: message.mentions,
      media: message.media,
      created_at: now,
      reactions: {},
    };
    writeLocal((prev) => ({
      ...prev,
      messages: [...prev.messages, created],
      members: prev.members.map((m) =>
        m.room_id === message.room_id && m.user_id === message.author_id ? { ...m, last_read_at: now } : m,
      ),
    }));
  },

  editMessage: async (messageId: string, body: string) => {
    const clean = body.trim();
    if (!clean) return;
    const now = new Date().toISOString();
    writeMessageMetaMap((prev) => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        body: clean,
        edited_at: now,
      },
    }));
    writeLocal((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === messageId ? { ...m, body: clean, edited_at: now } : m)),
    }));
  },

  toggleReaction: async (messageId: string, userId: string, emoji: string) => {
    const local = readLocal();
    const target = local.messages.find((m) => m.id === messageId);
    const meta = readMessageMetaMap()[messageId];
    const currentReactions = { ...(target?.reactions ?? {}), ...(meta?.reactions ?? {}) };
    const existingUsers = new Set(currentReactions[emoji] ?? []);
    if (existingUsers.has(userId)) {
      existingUsers.delete(userId);
    } else {
      existingUsers.add(userId);
    }
    const nextReactions: Record<string, string[]> = { ...currentReactions };
    if (existingUsers.size > 0) {
      nextReactions[emoji] = [...existingUsers];
    } else {
      delete nextReactions[emoji];
    }

    writeMessageMetaMap((prev) => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        reactions: nextReactions,
      },
    }));
    writeLocal((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === messageId ? { ...m, reactions: nextReactions } : m)),
    }));
  },

  remove: async (message: Pick<ChatMessage, "id" | "media">) => {
    if (await hasLiveSession()) {
      try {
        await run(db().from("community_messages").delete().eq("id", message.id));
        await community.removeMedia(message.media);
        return;
      } catch {
        // Fall through to local store.
      }
    }
    writeLocal((prev) => ({
      ...prev,
      messages: prev.messages.filter((m) => m.id !== message.id),
    }));
  },

  join: async (room: string, me: string) => {
    if (await hasLiveSession()) {
      try {
        await run(db().from("community_members").insert({ room_id: room, user_id: me }));
        return;
      } catch {
        // Fall through to local store.
      }
    }
    const now = new Date().toISOString();
    writeLocal((prev) => {
      if (prev.members.some((m) => m.room_id === room && m.user_id === me)) return prev;
      return {
        ...prev,
        members: [...prev.members, { room_id: room, user_id: me, last_read_at: now }],
      };
    });
  },

  leave: async (room: string, me: string) => {
    if (await hasLiveSession()) {
      try {
        await run(db().from("community_members").delete().eq("room_id", room).eq("user_id", me));
        return;
      } catch {
        // Fall through to local store.
      }
    }
    writeLocal((prev) => ({
      ...prev,
      members: prev.members.filter((m) => !(m.room_id === room && m.user_id === me)),
    }));
  },

  addMember: async (room: string, userId: string) => {
    const now = new Date().toISOString();
    writeLocal((prev) => {
      if (prev.members.some((m) => m.room_id === room && m.user_id === userId)) return prev;
      return {
        ...prev,
        members: [...prev.members, { room_id: room, user_id: userId, last_read_at: now }],
      };
    });
  },

  removeMember: async (room: string, userId: string) => {
    writeLocal((prev) => ({
      ...prev,
      members: prev.members.filter((m) => !(m.room_id === room && m.user_id === userId)),
    }));
  },

  markRead: async (room: string, me: string, at: string) => {
    if (await hasLiveSession()) {
      try {
        await run(
          db()
            .from("community_members")
            .update({ last_read_at: at })
            .eq("room_id", room)
            .eq("user_id", me)
            .lt("last_read_at", at),
        );
        return;
      } catch {
        // Fall through to local store.
      }
    }
    writeLocal((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.room_id === room && m.user_id === me && m.last_read_at < at ? { ...m, last_read_at: at } : m,
      ),
    }));
  },

  createRoom: async (
    name: string,
    about: string,
    topic: Topic,
    icon: RoomIcon,
    options?: { avatar_url?: string | null; banner_url?: string | null; accent?: RoomAccent; pinned_note?: string | null },
  ): Promise<string> => {
    const me = ensureLocalMe();
    const now = new Date().toISOString();
    let createdId = `room-${Date.now()}`;

    if (await hasLiveSession()) {
      try {
        createdId = await run<string>(
          db().rpc("community_create_room", {
            room_name: name,
            room_about: about,
            room_topic: topic,
            room_icon: icon,
          }),
        );
      } catch {
        // Fall through to local store.
      }
    }

    const patch: RoomPatch = {
      name,
      about,
      topic,
      icon,
      avatar_url: options?.avatar_url ?? null,
      banner_url: options?.banner_url ?? null,
      accent: options?.accent ?? "crimson",
      pinned_note: options?.pinned_note ?? null,
      owner_id: me.user_id,
      co_owners: [me.user_id],
    };

    const metaMap = readRoomMetaMap();
    writeRoomMetaMap({ ...metaMap, [createdId]: patch });

    writeLocal((prev) => {
      if (prev.rooms.some((r) => r.id === createdId)) return prev;
      if (prev.rooms.some((r) => r.kind === "group" && r.name?.toLowerCase() === name.toLowerCase())) {
        throw new Error("Đã có nhóm trùng tên");
      }
      return {
        ...prev,
        rooms: [
          {
            id: createdId,
            kind: "group",
            name,
            about,
            topic,
            icon,
            avatar_url: patch.avatar_url,
            banner_url: patch.banner_url,
            accent: patch.accent,
            owner_id: me.user_id,
            co_owners: [me.user_id],
            pinned_note: patch.pinned_note,
            created_at: now,
          },
          ...prev.rooms,
        ],
        members: [...prev.members, { room_id: createdId, user_id: me.user_id, last_read_at: now }],
      };
    });
    return createdId;
  },

  updateRoom: async (roomId: string, patch: RoomPatch): Promise<void> => {
    const metaMap = readRoomMetaMap();
    const merged: RoomPatch = { ...(metaMap[roomId] ?? {}), ...patch };
    writeRoomMetaMap({ ...metaMap, [roomId]: merged });

    writeLocal((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              name: patch.name !== undefined ? patch.name : r.name,
              about: patch.about !== undefined ? patch.about : r.about,
              topic: patch.topic !== undefined ? patch.topic : r.topic,
              icon: patch.icon !== undefined ? patch.icon : r.icon,
              avatar_url: patch.avatar_url !== undefined ? patch.avatar_url : r.avatar_url,
              banner_url: patch.banner_url !== undefined ? patch.banner_url : r.banner_url,
              accent: patch.accent !== undefined ? patch.accent : r.accent,
              pinned_note: patch.pinned_note !== undefined ? patch.pinned_note : r.pinned_note,
              pinned_message_id:
                patch.pinned_message_id !== undefined ? patch.pinned_message_id : r.pinned_message_id,
              owner_id: patch.owner_id !== undefined ? patch.owner_id : r.owner_id,
              co_owners: patch.co_owners !== undefined ? patch.co_owners : r.co_owners,
            }
          : r,
      ),
    }));

    if (await hasLiveSession()) {
      try {
        const dbPatch: Record<string, unknown> = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.about !== undefined) dbPatch.about = patch.about;
        if (patch.topic !== undefined) dbPatch.topic = patch.topic;
        if (patch.icon !== undefined) dbPatch.icon = patch.icon;
        if (Object.keys(dbPatch).length > 0) {
          await db().from("community_rooms").update(dbPatch).eq("id", roomId);
        }
      } catch {
        // Metadata overlay remains persisted in localStorage + portal_kv_store
      }
    }
  },

  openDm: async (other: string): Promise<string> => {
    if (await hasLiveSession()) {
      try {
        return await run<string>(db().rpc("community_open_dm", { other_user: other }));
      } catch {
        // Fall through to local store.
      }
    }
    const me = ensureLocalMe();
    const key = [me.user_id, other].sort().join(":");
    const now = new Date().toISOString();
    let dmId = "";
    writeLocal((prev) => {
      const found = prev.rooms.find((r) => r.kind === "dm" && r.dm_key === key);
      if (found) {
        dmId = found.id;
        const nextMembers = [...prev.members];
        for (const u of [me.user_id, other]) {
          if (!nextMembers.some((m) => m.room_id === dmId && m.user_id === u)) {
            nextMembers.push({ room_id: dmId, user_id: u, last_read_at: now });
          }
        }
        return { ...prev, members: nextMembers };
      }
      dmId = `dm-${Date.now()}`;
      return {
        ...prev,
        rooms: [
          ...prev.rooms,
          {
            id: dmId,
            kind: "dm",
            name: null,
            about: "",
            topic: "Tự do",
            icon: "message",
            created_at: now,
            dm_key: key,
          },
        ],
        members: [
          ...prev.members,
          { room_id: dmId, user_id: me.user_id, last_read_at: now },
          { room_id: dmId, user_id: other, last_read_at: now },
        ],
      };
    });
    return dmId;
  },

  saveBio: async (me: string, bio: string, displayName?: string) => {
    if (await hasLiveSession()) {
      try {
        const patch: Record<string, string> = { bio };
        if (displayName?.trim()) patch.display_name = displayName.trim();
        await run(db().from("community_profiles").update(patch).eq("user_id", me));
      } catch {
        // Fall through to local store.
      }
    }
    writeLocal((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.user_id === me
          ? {
              ...p,
              bio,
              display_name: displayName?.trim() ? displayName.trim() : p.display_name,
            }
          : p,
      ),
    }));
  },
};

/** Stable index for deterministic fallback ordering when needed. */
export function toneOf(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 6;
}
