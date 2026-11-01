import type { IconName } from "@/components/Icon";
import { getAccountById, PORTAL_ACCOUNTS, readSharedPortalState } from "./accounts";
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
  /** Storage paths in the community-media bucket or local data URLs in demo mode. */
  media: string[];
  created_at: string;
};

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

// ---------- Local multi-role & demo campus store ----------

const LOCAL_KEY = "sao-do:community-state:v2";
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

function currentLocalUserId(): string {
  const state = readSharedPortalState();
  const account = getAccountById(state.activeAccountId);
  if (account.code === "2200286") return uid(286);
  if (account.code === "2200287") return uid(287);
  if (account.code === "2200288") return uid(288);
  return account.id;
}

function buildSeedState(): LocalState {
  const now = Date.now();
  const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

  const profiles: Profile[] = [
    {
      user_id: uid(286),
      display_name: "Nguyễn Văn Minh",
      student_code: "2200286",
      class_name: "DK13-CNTT1",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Chủ nhiệm CLB Tin học Sao Đỏ, phụ trách nhóm thực hành OOP và dự án Web tại phòng B1-Lab 3",
    },
    {
      user_id: uid(287),
      display_name: "Phạm Khánh Linh",
      student_code: "2200287",
      class_name: "DK13-CNTT1",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Lớp trưởng DK13-CNTT1, tổng hợp học liệu môn Cơ sở dữ liệu và Lập trình hướng đối tượng",
    },
    {
      user_id: uid(288),
      display_name: "Lê Việt Hoàng",
      student_code: "2200288",
      class_name: "DK13-CNTT1",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Sinh viên lớp DK13-CNTT1, quan tâm thuật toán C++ và thiết kế giao diện web",
    },
    {
      user_id: "acc-teacher-duc",
      display_name: "ThS. Trần Minh Đức",
      student_code: "GV.CNTT.018",
      class_name: "DK13-CNTT1",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Giảng viên phụ trách học phần IT3040 (OOP) và cố vấn học tập lớp niên chế DK13-CNTT1",
    },
    {
      user_id: uid(301),
      display_name: "Nguyễn Minh Anh",
      student_code: "2200301",
      class_name: "DC.CNTT17.10",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Lớp trưởng DC.CNTT17.10, đang làm đồ án React và TypeScript",
    },
    {
      user_id: uid(302),
      display_name: "Trần Đức Huy",
      student_code: "2200302",
      class_name: "DC.CNTT17.10",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Phụ trách nhóm học thuật Backend và truy vấn SQL tại CLB Tin học",
    },
    {
      user_id: uid(303),
      display_name: "Lê Thu Trang",
      student_code: "2200303",
      class_name: "DC.KT17.02",
      faculty: "Khoa Kinh tế",
      bio: "Sinh viên năm 3 ngành Kế toán doanh nghiệp, đang tìm kỳ thực tập học kỳ tới",
    },
    {
      user_id: uid(304),
      display_name: "Phạm Quốc Bảo",
      student_code: "2200304",
      class_name: "DC.CK17.05",
      faculty: "Khoa Cơ khí",
      bio: "Đội trưởng đội bóng đá sinh viên Khoa Cơ khí",
    },
    {
      user_id: uid(305),
      display_name: "Hoàng Ngọc Linh",
      student_code: "2200305",
      class_name: "DC.NNA17.01",
      faculty: "Khoa Du lịch & Ngoại ngữ",
      bio: "IELTS 7.5, điều phối lịch luyện nói tiếng Anh chuyên ngành chiều thứ Năm",
    },
    {
      user_id: uid(306),
      display_name: "Vũ Thành Đạt",
      student_code: "2200306",
      class_name: "DC.CNTT16.08",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Sinh viên năm cuối, thực tập sinh kỹ sư Frontend tại Hải Dương",
    },
    {
      user_id: uid(307),
      display_name: "Đặng Khánh Vy",
      student_code: "2200307",
      class_name: "DC.KT18.03",
      faculty: "Khoa Kinh tế",
      bio: "Sinh viên khóa 18, ban tự quản Ký túc xá khu B",
    },
    {
      user_id: uid(308),
      display_name: "Bùi Gia Khánh",
      student_code: "2200308",
      class_name: "DC.DT17.04",
      faculty: "Khoa Điện",
      bio: "Nghiên cứu vi điều khiển STM32 và hệ thống nhúng, Phó chủ nhiệm CLB Tin học",
    },
    {
      user_id: uid(309),
      display_name: "Đỗ Phương Thảo",
      student_code: "2200309",
      class_name: "DC.CNTT18.02",
      faculty: "Khoa Công nghệ thông tin",
      bio: "Tổng hợp đề cương Cấu trúc dữ liệu, Giải thuật và Toán rời rạc",
    },
    {
      user_id: uid(310),
      display_name: "Ngô Hải Nam",
      student_code: "2200310",
      class_name: "DC.OTO17.01",
      faculty: "Khoa Ô tô",
      bio: "Thành viên nhóm thực hành chẩn đoán điện tử ô tô và giải bóng đá trường",
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
      created_at: minsAgo(43200),
    },
    {
      id: rid(2),
      kind: "group",
      name: "CLB Tin học Sao Đỏ",
      about: "Lịch sinh hoạt chuyên môn tại B1-Lab 2, ôn luyện Olympic Tin học và dự án phần mềm",
      topic: "Câu lạc bộ",
      icon: "users",
      created_at: minsAgo(43000),
    },
    {
      id: rid(5),
      kind: "group",
      name: "Tiếng Anh chuyên ngành (EN2130)",
      about: "Luyện phỏng vấn kỹ thuật, rà soát Cover Letter và chia sẻ tài liệu TOEIC/IELTS",
      topic: "Học tập",
      icon: "language",
      created_at: minsAgo(41000),
    },
    {
      id: rid(7),
      kind: "group",
      name: "Kho học liệu & Đề cương các khoa",
      about: "Slide bài giảng, đề thi các kỳ trước và tài liệu tham khảo cho môn đại cương, chuyên ngành",
      topic: "Học tập",
      icon: "book",
      created_at: minsAgo(40000),
    },
    {
      id: rid(3),
      kind: "group",
      name: "Thực tập & Tuyển dụng kỹ thuật",
      about: "Thông tin thực tập doanh nghiệp đối tác tại Hải Dương, Hà Nội và góp ý hồ sơ ứng tuyển",
      topic: "Việc làm",
      icon: "briefcase",
      created_at: minsAgo(39000),
    },
    {
      id: rid(4),
      kind: "group",
      name: "Nội trú Ký túc xá khu B",
      about: "Thông báo ban tự quản, tìm thẻ sinh viên thất lạc và lịch trực vệ sinh khu nội trú",
      topic: "Tự do",
      icon: "home",
      created_at: minsAgo(38000),
    },
    {
      id: rid(6),
      kind: "group",
      name: "Giải bóng đá sinh viên Sao Đỏ",
      about: "Lịch thi đấu giao hữu giữa các khoa và đăng ký sân cỏ nhân tạo chiều hàng tuần",
      topic: "Thể thao",
      icon: "ball",
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
    [rid(3), [uid(301), uid(303), uid(306), uid(307)], 1200],
    [rid(4), [uid(303), uid(307), uid(310)], 1200],
    [rid(5), [uid(286), uid(287), uid(303), uid(305), uid(307)], 240],
    [rid(6), [uid(302), uid(304), uid(310)], 1200],
    [rid(7), [uid(287), uid(301), uid(305), uid(309)], 1200],
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
  if (existing) return existing;
  const created: Profile = {
    user_id: meId,
    display_name: activeAcc.displayName,
    student_code: activeAcc.code,
    class_name: activeAcc.cohortClass,
    faculty: activeAcc.department,
    bio: activeAcc.bio,
  };
  writeLocal((prev) => ({
    ...prev,
    profiles: [...prev.profiles, created],
  }));
  return created;
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
      const roomMessages = local.messages
        .filter((msg) => msg.room_id === room.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const last = roomMessages.at(-1);
      const unreadMessages = myMembership
        ? roomMessages.filter(
            (msg) => msg.created_at > myMembership.last_read_at && msg.author_id !== me.user_id,
          )
        : [];
      const pings = unreadMessages.filter((msg) => msg.mentions.includes(me.user_id)).length;
      const otherMember =
        room.kind === "dm" ? roomMembers.find((m) => m.user_id !== me.user_id)?.user_id ?? null : null;

      return {
        id: room.id,
        kind: room.kind,
        name: room.name,
        about: room.about,
        topic: room.topic,
        icon: room.icon,
        created_at: room.created_at,
        member_count: roomMembers.length,
        joined: Boolean(myMembership),
        unread: unreadMessages.length,
        pings,
        last_body: last ? (last.body || (last.media.some(isVideo) ? "[Video]" : "[Hình ảnh]")) : null,
        last_author: last ? (profilesById.get(last.author_id)?.display_name ?? "Thành viên") : null,
        last_at: last?.created_at ?? null,
        dm_user: otherMember,
      };
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
    if (await hasLiveSession()) {
      try {
        return await run<Profile>(db().rpc("community_enter").single());
      } catch {
        // Fall through to local multi-role campus profile.
      }
    }
    return ensureLocalMe();
  },

  overview: async (): Promise<RoomSummary[]> => {
    if (await hasLiveSession()) {
      try {
        return await run<RoomSummary[]>(db().rpc("community_overview"));
      } catch {
        // Fall through to local overview.
      }
    }
    return computeLocalOverview();
  },

  profiles: async (): Promise<Profile[]> => {
    if (await hasLiveSession()) {
      try {
        return await run<Profile[]>(
          db().from("community_profiles").select("user_id, display_name, student_code, class_name, faculty, bio"),
        );
      } catch {
        // Fall through to local profiles.
      }
    }
    ensureLocalMe();
    return readLocal().profiles;
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
        return rows.reverse();
      } catch {
        // Fall through to local messages.
      }
    }
    return readLocal()
      .messages.filter((m) => m.room_id === room)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(-100);
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
    };
    writeLocal((prev) => ({
      ...prev,
      messages: [...prev.messages, created],
      members: prev.members.map((m) =>
        m.room_id === message.room_id && m.user_id === message.author_id ? { ...m, last_read_at: now } : m,
      ),
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

  createRoom: async (name: string, about: string, topic: Topic, icon: RoomIcon): Promise<string> => {
    if (await hasLiveSession()) {
      try {
        return await run<string>(
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
    const me = ensureLocalMe();
    const now = new Date().toISOString();
    const id = `room-${Date.now()}`;
    writeLocal((prev) => {
      if (prev.rooms.some((r) => r.kind === "group" && r.name?.toLowerCase() === name.toLowerCase())) {
        throw new Error("Đã có nhóm trùng tên");
      }
      return {
        ...prev,
        rooms: [
          {
            id,
            kind: "group",
            name,
            about,
            topic,
            icon,
            created_at: now,
          },
          ...prev.rooms,
        ],
        members: [...prev.members, { room_id: id, user_id: me.user_id, last_read_at: now }],
      };
    });
    return id;
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

  saveBio: async (me: string, bio: string) => {
    if (await hasLiveSession()) {
      try {
        await run(db().from("community_profiles").update({ bio }).eq("user_id", me));
        return;
      } catch {
        // Fall through to local store.
      }
    }
    writeLocal((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => (p.user_id === me ? { ...p, bio } : p)),
    }));
  },
};

/** Stable index for deterministic fallback ordering when needed. */
export function toneOf(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 6;
}
