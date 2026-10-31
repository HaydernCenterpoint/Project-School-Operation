"use client";

/* eslint-disable @next/next/no-img-element -- small static logo and attachment thumbnails */
import type {
  AiConversation,
  AiMessage,
  AiMode,
  AiReasoningEffort,
  AiStreamEvent,
  AiUsage,
} from "@sao-do/contracts";
import type { Route } from "next";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import "@/components/app-phuong.css";
import "@/components/ai-workspace.css";
import { Icon, type IconName } from "@/components/Icon";
import { phuongFonts } from "@/components/landing/fonts";
import { Markdown } from "@/components/Markdown";
import { aiErrorMessage, aiRequest, AiRequestError, streamChat } from "@/lib/ai-client";
import { addFiles, filesFromDrop, formatSize, type Attachment } from "@/lib/ai-files";
import { initials } from "@/lib/format";
import { courses, program, semester } from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";
import { usePhuongTheme } from "@/lib/theme";

type CourseWorkbenchSpec = {
  code: string;
  name: string;
  credits: number;
  lecturer: string;
  currentTopic: string;
  labFocus: string;
  rubricItems: { code: string; criterion: string; weight: string }[];
  promptsByMode: Record<AiMode, { tag: string; title: string; prompt: string }[]>;
};

const courseWorkbenches: CourseWorkbenchSpec[] = [
  {
    code: "IT3040",
    name: "Lập trình hướng đối tượng",
    credits: 3,
    lecturer: "ThS. Nguyễn Văn Cảnh",
    currentTopic: "Đa hình động, bảng phương thức ảo (vtable) & quản lý vùng nhớ RAII",
    labFocus: "Bài thực hành số 2 · Thiết kế cây kế thừa C++17 & nạp chồng toán tử",
    rubricItems: [
      { code: "R1", criterion: "Đóng gói dữ liệu & bất biến lớp (class invariants)", weight: "30%" },
      { code: "R2", criterion: "Đa hình qua hàm ảo & hàm huỷ ảo (virtual destructor)", weight: "40%" },
      { code: "R3", criterion: "An toàn ngoại lệ & không rò rỉ bộ nhớ (Valgrind / ASan)", weight: "30%" },
    ],
    promptsByMode: {
      explain: [
        {
          tag: "IT3040 · Cơ chế C++",
          title: "Phân tích bố cục bộ nhớ của vptr và vtable trong đa kế thừa",
          prompt:
            "Giải thích chi tiết bố cục bộ nhớ của con trỏ vptr và bảng phương thức ảo (vtable) trong C++ khi một lớp dẫn xuất kế thừa từ hai lớp cơ sở có hàm ảo, kèm sơ đồ bộ nhớ và ví dụ minh họa",
        },
        {
          tag: "IT3040 · Quản lý tài nguyên",
          title: "Quy tắc Rule of Five và ngữ nghĩa di chuyển (move semantics)",
          prompt:
            "Phân tích khi nào cần cài đặt đủ 5 hàm đặc biệt (Rule of Five) trong C++ và so sánh chi phí sao chép sâu với hàm tạo di chuyển kèm đoạn mã mẫu",
        },
      ],
      summarize: [
        {
          tag: "IT3040 · Đề cương chương 4",
          title: "Bảng đối chiếu kế thừa public, protected, private và đa hình",
          prompt:
            "Tóm tắt toàn bộ quy tắc phạm vi truy cập khi kế thừa public, protected, private và cơ chế liên kết động (dynamic binding) thành bảng tra cứu ngắn gọn để ôn thi giữa kỳ",
        },
        {
          tag: "IT3040 · Kiểm tra mã nguồn",
          title: "Rà soát lỗi thiết kế hướng đối tượng trong tệp đính kèm",
          prompt:
            "Phân tích cấu trúc lớp trong đoạn mã hoặc tệp đính kèm theo 3 tiêu chí chấm điểm của học phần IT3040: đóng gói, đa hình và quản lý bộ nhớ",
        },
      ],
      practice: [
        {
          tag: "IT3040 · Đề tự luyện",
          title: "3 bài toán thiết kế lớp, nạp chồng toán tử và con trỏ thông minh",
          prompt:
            "Ra 3 bài tập tự luận môn Lập trình hướng đối tượng (IT3040) từ mức chuẩn đến vận dụng cao, kèm tiêu chí chấm điểm và gợi ý từng bước mà chưa mở toàn bộ lời giải",
        },
        {
          tag: "IT3040 · Tìm lỗi",
          title: "Bài tập phát hiện rò rỉ bộ nhớ và cắt lát đối tượng (object slicing)",
          prompt:
            "Đưa ra 3 đoạn mã C++ có lỗi tiềm ẩn về object slicing, thiếu virtual destructor hoặc shallow copy để mình tự tìm lỗi trước khi xem giải thích",
        },
      ],
      plan: [
        {
          tag: "IT3040 · Lộ trình 7 ngày",
          title: "Kế hoạch hoàn thiện Bài thực hành số 2 và kiểm thử đơn vị",
          prompt:
            "Chia lộ trình 7 ngày hoàn thành Bài thực hành số 2 môn IT3040 gồm thiết kế sơ đồ lớp UML, cài đặt các lớp dẫn xuất, viết bộ test biên và chuẩn bị báo cáo",
        },
        {
          tag: "IT3040 · Ôn thi học kỳ",
          title: "Phân bổ 10 buổi tối ôn tập C++ hướng đối tượng theo trọng số đề thi",
          prompt:
            "Lập kế hoạch 10 buổi tối (mỗi buổi 120 phút) ôn tập môn Lập trình hướng đối tượng bám sát trọng số: đóng gói 30%, kế thừa & đa hình 40%, ngoại lệ & tệp 30%",
        },
      ],
    },
  },
  {
    code: "IT3090",
    name: "Cơ sở dữ liệu",
    credits: 4,
    lecturer: "TS. Trần Thị Phương",
    currentTopic: "Phụ thuộc hàm, bao đóng thuộc tính & chuẩn hóa lược đồ 3NF / BCNF",
    labFocus: "Bài tập lớn · Thiết kế CSDL quản lý đào tạo tín chỉ & tối ưu chỉ mục",
    rubricItems: [
      { code: "R1", criterion: "Mô hình ER / EER & ánh xạ sang lược đồ quan hệ chuẩn", weight: "30%" },
      { code: "R2", criterion: "Chứng minh phân rã bảo toàn thông tin & phụ thuộc hàm", weight: "35%" },
      { code: "R3", criterion: "Truy vấn SQL phức hợp, khung nhìn & kế hoạch thực thi", weight: "35%" },
    ],
    promptsByMode: {
      explain: [
        {
          tag: "IT3090 · Lý thuyết thiết kế",
          title: "Phân rã bảo toàn thông tin và so sánh chuẩn 3NF với BCNF",
          prompt:
            "Phân tích sự khác biệt giữa dạng chuẩn 3NF và BCNF, cho ví dụ một lược đồ quan hệ thỏa 3NF nhưng vi phạm BCNF và trình bày thuật toán kiểm tra phân rã không mất thông tin",
        },
        {
          tag: "IT3090 · Tối ưu truy vấn",
          title: "Cách B+Tree index tăng tốc truy vấn khoảng và điều kiện kết nối",
          prompt:
            "Giải thích cách chỉ mục B+Tree hoạt động trong hệ quản trị CSDL quan hệ và khi nào bộ tối ưu hóa bỏ qua index để quét tuần tự (Sequential Scan)",
        },
      ],
      summarize: [
        {
          tag: "IT3090 · Tổng hợp thuật toán",
          title: "Quy trình tìm khóa tối tiểu, phủ tối tiểu và chuẩn hóa 1NF–BCNF",
          prompt:
            "Cô đọng từng bước thuật toán tìm bao đóng thuộc tính X+, tìm tất cả khóa dự tuyển và kiểm tra 1NF, 2NF, 3NF, BCNF thành bảng quy trình một trang",
        },
        {
          tag: "IT3090 · Hệ thống hóa SQL",
          title: "Bảng tổng hợp thứ tự thực thi mệnh đề SELECT và hàm cửa sổ",
          prompt:
            "Tóm tắt thứ tự thực thi logic của câu lệnh SELECT (FROM, JOIN, WHERE, GROUP BY, HAVING, SELECT, ORDER BY) kèm quy tắc dùng hàm tổng hợp và khung nhìn",
        },
      ],
      practice: [
        {
          tag: "IT3090 · Bài tập chuẩn hóa",
          title: "Bài toán cho tập phụ thuộc hàm F, tìm khóa và tách về 3NF",
          prompt:
            "Cho lược đồ R(A,B,C,D,E,G) cùng một tập phụ thuộc hàm F có độ khó tương đương đề thi học kỳ IT3090 để mình tự tìm khóa dự tuyển và phân rã về 3NF",
        },
        {
          tag: "IT3090 · Luyện viết SQL",
          title: "5 câu hỏi truy vấn GROUP BY, HAVING, EXISTS và phép chia quan hệ",
          prompt:
            "Đưa ra lược đồ CSDL quản lý học vụ gồm 4 bảng (SinhVien, HocPhan, LopHocPhan,KetQua) và 5 câu truy vấn SQL tăng dần độ khó có câu dùng phép chia quan hệ",
        },
      ],
      plan: [
        {
          tag: "IT3090 · Tiến độ Bài tập lớn",
          title: "Kế hoạch 3 tuần hoàn thiện CSDL quản lý đào tạo từ ER đến SQL",
          prompt:
            "Chia lộ trình 3 tuần thực hiện Bài tập lớn môn Cơ sở dữ liệu (IT3090): khảo sát nghiệp vụ, vẽ sơ đồ ER, chuẩn hóa 3NF, nạp dữ liệu mẫu và viết 15 truy vấn báo cáo",
        },
        {
          tag: "IT3090 · Ôn thi cuối kỳ",
          title: "Lộ trình 8 ngày nắm chắc cả đại số quan hệ, SQL và chuẩn hóa",
          prompt:
            "Thiết kế lịch ôn tập 8 ngày cho môn Cơ sở dữ liệu (4 tín chỉ) chia đều cho 3 mảng: đại số quan hệ & SQL, phụ thuộc hàm & chuẩn hóa, giao dịch & khóa đồng thời",
        },
      ],
    },
  },
  {
    code: "IT3080",
    name: "Mạng máy tính",
    credits: 3,
    lecturer: "ThS. Lê Hoàng Nam",
    currentTopic: "Tầng giao vận TCP/UDP, kiểm soát tắc nghẽn & chia mạng con VLSM/CIDR",
    labFocus: "Báo cáo Wireshark · Phân tích bắt tay 3 bước TCP & định tuyến OSPF",
    rubricItems: [
      { code: "R1", criterion: "Quy hoạch địa chỉ IPv4 VLSM / CIDR không chồng lấn", weight: "30%" },
      { code: "R2", criterion: "Phân tích biểu đồ tuần tự gói tin TCP (Seq, Ack, cwnd)", weight: "40%" },
      { code: "R3", criterion: "Bảng định tuyến tĩnh & hội tụ khoảng cách vector / link-state", weight: "30%" },
    ],
    promptsByMode: {
      explain: [
        {
          tag: "IT3080 · Tầng giao vận",
          title: "Biến thiên cửa sổ tắc nghẽn cwnd trong TCP Reno và TCP Cubic",
          prompt:
            "Giải thích cơ chế Slow Start, Congestion Avoidance và Fast Recovery của TCP; minh họa cách cwnd và ssthresh thay đổi qua từng RTT khi nhận 3 ACK trùng lặp so với khi hết thời gian chờ timeout",
        },
        {
          tag: "IT3080 · Tầng mạng",
          title: "So sánh thuật toán định tuyến Distance Vector (Bellman-Ford) và Link State",
          prompt:
            "Phân tích nguyên lý cập nhật bảng định tuyến của Distance Vector và Link State, giải thích hiện tượng đếm tới vô cùng (count-to-infinity) và kỹ thuật Poisoned Reverse",
        },
      ],
      summarize: [
        {
          tag: "IT3080 · Bảng công thức",
          title: "Tổng hợp công thức tính độ trễ truyền dẫn, thông lượng và chia VLSM",
          prompt:
            "Hệ thống hóa các công thức tính độ trễ xử lý, hàng đợi, truyền dẫn (L/R), lan truyền (d/s), tích băng thông-độ trễ và bảng tra nhanh CIDR /24 đến /30",
        },
        {
          tag: "IT3080 · Phân tích gói tin",
          title: "Tóm tắt các trường đầu mục IPv4, TCP và cờ điều khiển SYN/ACK/FIN",
          prompt:
            "Tóm tắt ý nghĩa từng trường trong header TCP 20 byte và IPv4 20 byte phục vụ bài thực hành đọc vết gói tin Wireshark",
        },
      ],
      practice: [
        {
          tag: "IT3080 · Bài toán VLSM",
          title: "Bài tập chia mạng con VLSM cho 4 phòng ban từ khối /20",
          prompt:
            "Ra một bài toán quy hoạch địa chỉ IPv4 bằng VLSM cho 4 phân mạng có số lượng máy trạm khác nhau và 3 liên kết điểm-điểm WAN để mình tự tính địa chỉ mạng, broadcast và dải host",
        },
        {
          tag: "IT3080 · Tính toán TCP",
          title: "Bài tập xác định số thứ tự Sequence, Acknowledgment và kích thước cwnd",
          prompt:
            "Cho kịch bản trao đổi 4 phân đoạn TCP giữa máy khách và máy chủ kèm kích thước dữ liệu và sự kiện mất gói, yêu cầu xác định Seq, Ack và giá trị cwnd ở từng bước",
        },
      ],
      plan: [
        {
          tag: "IT3080 · Thực hành Wireshark",
          title: "Quy trình 4 bước hoàn thành báo cáo bắt gói tin HTTP, DNS và TCP",
          prompt:
            "Lập danh sách kiểm tra từng bước để thực hiện và viết báo cáo thực hành Wireshark môn IT3080: bộ lọc hiển thị, ảnh chụp gói tin, biểu đồ luồng và nhận xét kết quả",
        },
        {
          tag: "IT3080 · Ôn tập 5 tầng",
          title: "Lộ trình 6 ngày ôn tập từ tầng Ứng dụng xuống tầng Liên kết dữ liệu",
          prompt:
            "Chia kế hoạch 6 ngày ôn thi môn Mạng máy tính theo mô hình 5 tầng TCP/IP kèm danh sách dạng bài tập tính toán trọng tâm ở mỗi tầng",
        },
      ],
    },
  },
  {
    code: "MI1140",
    name: "Toán rời rạc",
    credits: 3,
    lecturer: "PGS.TS. Đỗ Minh Tuấn",
    currentTopic: "Lý thuyết đồ thị, cây khung nhỏ nhất & thuật toán đường đi ngắn nhất",
    labFocus: "Bài tập chương 5 · Chứng minh quy nạp, hệ thức truy hồi & đồ thị Euler/Hamilton",
    rubricItems: [
      { code: "R1", criterion: "Chặt chẽ trong biến đổi tương đương logic & quy nạp toán học", weight: "30%" },
      { code: "R2", criterion: "Giải hệ thức truy hồi tuyến tính & nguyên lý bù trừ", weight: "35%" },
      { code: "R3", criterion: "Bảng vết từng bước thuật toán Dijkstra, Bellman-Ford, Prim, Kruskal", weight: "35%" },
    ],
    promptsByMode: {
      explain: [
        {
          tag: "MI1140 · Lý thuyết đồ thị",
          title: "Thuật toán Dijkstra, bất biến vòng lặp và vì sao thất bại với cạnh âm",
          prompt:
            "Trình bày thuật toán Dijkstra tìm đường đi ngắn nhất từ một đỉnh nguồn, chứng minh tính đúng đắn bằng bất biến vòng lặp và chỉ ra phản ví dụ có trọng số âm làm thuật toán chọn sai",
        },
        {
          tag: "MI1140 · Bài toán đếm",
          title: "Phương pháp phương trình đặc trưng giải hệ thức truy hồi không thuần nhất",
          prompt:
            "Giải thích phương pháp tìm nghiệm tổng quát của hệ thức truy hồi tuyến tính hệ số hằng không thuần nhất qua cả hai trường hợp nghiệm đơn và nghiệm bội",
        },
      ],
      summarize: [
        {
          tag: "MI1140 · Đồ thị & Cây",
          title: "Bảng điều kiện cần và đủ của đồ thị Euler, Hamilton, đồ thị phẳng",
          prompt:
            "Tổng hợp các định lý Euler, Dirac, Ore, Kuratowski và công thức Euler V - E + F = 2 kèm điều kiện áp dụng để ôn thi tự luận",
        },
        {
          tag: "MI1140 · Tổ hợp & Logic",
          title: "Tóm tắt các luật tương đương logic, nguyên lý Dirichlet và bù trừ",
          prompt:
            "Hệ thống hóa các luật tương đương mệnh đề, quy tắc suy diễn và công thức nguyên lý bù trừ cho 3 và 4 tập hợp",
        },
      ],
      practice: [
        {
          tag: "MI1140 · Chạy tay thuật toán",
          title: "Bài tập lập bảng vết Dijkstra và Kruskal trên đồ thị 7 đỉnh",
          prompt:
            "Cho ma trận trọng số của một đồ thị vô hướng liên thông 7 đỉnh, yêu cầu mình lập bảng chạy từng bước thuật toán Dijkstra và tìm cây khung nhỏ nhất bằng Kruskal",
        },
        {
          tag: "MI1140 · Đếm & Truy hồi",
          title: "3 bài toán nguyên lý bù trừ, Dirichlet và hệ thức truy hồi",
          prompt:
            "Ra 3 bài toán tự luận chương Đếm và Hệ thức truy hồi có phân câu a, b, c kèm gợi ý thiết lập công thức",
        },
      ],
      plan: [
        {
          tag: "MI1140 · Kế hoạch 5 ngày",
          title: "Lộ trình luyện giải 4 dạng toán trọng tâm trong đề thi cuối kỳ",
          prompt:
            "Lập kế hoạch 5 ngày luyện đề môn Toán rời rạc (MI1140) tập trung vào 4 câu trong cấu trúc đề thi: rút gọn hàm đại số Boole, bài toán đếm, giải hệ thức truy hồi và thuật toán trên đồ thị",
        },
        {
          tag: "MI1140 · Ôn tập theo chương",
          title: "Danh sách kiểm tra các dạng chứng minh và bảng vết thuật toán cần thuộc",
          prompt:
            "Xây dựng bảng kiểm tra kiến thức tự đánh giá cho môn Toán rời rạc gồm các định lý cần nhớ và các mẫu bảng trình bày thuật toán đồ thị đạt điểm tối đa",
        },
      ],
    },
  },
];

const modes: {
  key: AiMode;
  label: string;
  desc: string;
  icon: IconName;
  hint: string;
}[] = [
  {
    key: "explain",
    label: "Giải thích",
    desc: "Phân tích bản chất thuật toán, công thức và cơ chế hoạt động từng bước",
    icon: "book",
    hint: "Nhập khái niệm, định lý hoặc dán đoạn mã cần phân tích",
  },
  {
    key: "summarize",
    label: "Tóm tắt",
    desc: "Cô đọng giáo trình, tài liệu PDF hoặc ghi chép thành hệ thống luận điểm",
    icon: "list",
    hint: "Dán nội dung bài giảng hoặc đính kèm tệp PDF và mã nguồn cần tóm tắt",
  },
  {
    key: "practice",
    label: "Luyện tập",
    desc: "Tạo bộ câu hỏi tự kiểm tra có phân bậc độ khó và gợi ý suy luận",
    icon: "question",
    hint: "Nhập học phần hoặc chủ đề muốn tạo đề tự kiểm tra",
  },
  {
    key: "plan",
    label: "Lập kế hoạch",
    desc: "Chia lộ trình ôn thi học kỳ và tiến độ thực hiện bài tập lớn theo tuần",
    icon: "calendar",
    hint: "Nêu học phần, hạn nộp bài tập lớn và quỹ thời gian mỗi ngày",
  },
];

const sideKey = "sao-do:ai-side-collapsed";
const threadsStorageKey = "sao-do:ai-threads:v2";

type StoredThread = {
  conversation: AiConversation;
  messages: Message[];
};

type Message = AiMessage & {
  error?: string;
  retryContent?: string;
  files?: Pick<Attachment, "id" | "name" | "kind" | "preview">[];
};

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Preference only.
  }
}

function readStoredThreads(): StoredThread[] {
  try {
    const raw = localStorage.getItem(threadsStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredThread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredThreads(threads: StoredThread[]) {
  try {
    localStorage.setItem(threadsStorageKey, JSON.stringify(threads.slice(0, 40)));
  } catch {
    // Ignore storage quota errors.
  }
}

function groupByRecency(items: AiConversation[], now: number) {
  const day = 24 * 3600 * 1000;
  const groups: { label: string; items: AiConversation[] }[] = [
    { label: "Hôm nay", items: [] },
    { label: "7 ngày qua", items: [] },
    { label: "Trước đó", items: [] },
  ];
  for (const item of items) {
    const age = Math.max(0, now - Date.parse(item.updatedAt));
    groups[age < day ? 0 : age < 7 * day ? 1 : 2]!.items.push(item);
  }
  return groups.filter((group) => group.items.length);
}

/** Extracts the latest bold headline from a streaming reasoning trace (e.g. `**Computing integral**`). */
function extractLatestThoughtHeadline(reasoning?: string, steps?: string[]) {
  if (reasoning) {
    const matches = [...reasoning.matchAll(/\*\*([^*]+)\*\*/g)];
    if (matches.length > 0) {
      return matches.at(-1)![1]!.trim();
    }
  }
  if (steps && steps.length > 0) {
    return steps.at(-1)!;
  }
  return "Đang phân tích ngữ cảnh học phần và đối chiếu tiêu chí";
}

function ReasoningBlock({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming: boolean;
}) {
  const isThinkingNow = isStreaming && message.status === "pending" && !message.content;
  const [open, setOpen] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(400);

  useEffect(() => {
    if (!isThinkingNow) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - started);
    }, 100);
    return () => window.clearInterval(timer);
  }, [isThinkingNow]);

  const hasTrace = Boolean(
    (message.reasoning && message.reasoning.trim().length > 0) ||
      (message.steps && message.steps.length > 0),
  );
  if (!hasTrace && !isThinkingNow) return null;

  const durationSec = ((message.reasoningMs ?? elapsedMs) / 1000).toFixed(1);
  const liveHeadline = extractLatestThoughtHeadline(message.reasoning, message.steps);
  const cleanedReasoning = (message.reasoning ?? "")
    .replace(/\*\*([^*]+)\*\*/g, "\n• $1\n")
    .trim();

  return (
    <div className={`aw-thought${isThinkingNow ? " is-active" : ""}${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="aw-thought-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="aw-thought-dot" aria-hidden="true" />
        <span className="aw-thought-summary">
          {isThinkingNow ? (
            <>
              <strong>Đang suy luận</strong>
              <span className="aw-thought-step">{liveHeadline}</span>
            </>
          ) : (
            <strong>Đã suy luận trong {durationSec} giây</strong>
          )}
        </span>
        <span className="aw-thought-time">{durationSec}s</span>
        <span className="aw-thought-chev" aria-hidden="true">
          <Icon name="chevron" />
        </span>
      </button>

      {(open || isThinkingNow) && (
        <div className="aw-thought-body">
          {message.steps && message.steps.length > 0 && (
            <ul className="aw-thought-steps" aria-label="Các bước xử lý">
              {message.steps.map((step, idx) => (
                <li key={`${idx}-${step}`}>
                  <Icon name="check" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          )}
          {cleanedReasoning && (
            <div className="aw-thought-trace">{cleanedReasoning}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AiWorkspace() {
  const { data, account, error: loadError, avatarUrl, refresh } = useStudent();
  const { theme } = usePhuongTheme();
  const token = data?.token ?? "local-multi-role-session";
  const [now, setNow] = useState(Date.now);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [usage, setUsage] = useState<AiUsage | null>({
    enabled: true,
    used: 14,
    limit: 100,
    resetsAt: null,
    model: "gpt-6-luna",
  });
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<AiMode>("explain");
  const [activeCourseCode, setActiveCourseCode] = useState<string>(courseWorkbenches[0]!.code);
  const [reasoningEffort, setReasoningEffort] = useState<AiReasoningEffort>("high");
  const [draft, setDraft] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  const controller = useRef<AbortController | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const imagePicker = useRef<HTMLInputElement>(null);
  const filePicker = useRef<HTMLInputElement>(null);
  const folderPicker = useRef<HTMLInputElement>(null);

  const syncConversationsList = useCallback((remoteList: AiConversation[]) => {
    const localThreads = readStoredThreads();
    const byId = new Map<string, AiConversation>();
    for (const item of localThreads) byId.set(item.conversation.id, item.conversation);
    for (const item of remoteList) byId.set(item.id, item);
    const merged = [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setConversations(merged);
  }, []);

  const loadMeta = useCallback(async () => {
    syncConversationsList([]);
    if (!token || token === "local-multi-role-session") return;
    try {
      const [nextUsage, list] = await Promise.all([
        aiRequest<AiUsage>("/api/ai/usage", token),
        aiRequest<{ conversations: AiConversation[] }>("/api/ai/conversations", token),
      ]);
      setUsage(nextUsage);
      syncConversationsList(list.conversations);
    } catch {
      // Keep local threads when offline or using local multi-role session.
    }
  }, [syncConversationsList, token]);

  useEffect(() => {
    queueMicrotask(() => {
      setSideCollapsed(readFlag(sideKey));
      const preset = new URLSearchParams(location.search).get("assignment");
      if (preset) setAssignmentId(preset);
      void loadMeta();
    });
  }, [loadMeta]);

  useEffect(() => () => controller.current?.abort(), []);

  useEffect(() => {
    const element = thread.current;
    if (element && element.scrollHeight - element.scrollTop - element.clientHeight < 180) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  const title =
    conversations.find((item) => item.id === activeId)?.title ??
    (messages.length ? "Phiên suy luận" : "Bàn làm việc học thuật");

  useEffect(() => {
    document.title = `${title} | Sao Đỏ AI`;
  }, [title]);

  const saveThreadToLocal = useCallback(
    (convId: string, convTitle: string, convMode: AiMode, nextMessages: Message[]) => {
      const cleanMessages = nextMessages.map(({ files: _files, ...rest }) => rest);
      const updated: StoredThread = {
        conversation: {
          id: convId,
          title: convTitle,
          mode: convMode,
          updatedAt: new Date().toISOString(),
        },
        messages: cleanMessages,
      };
      const existing = readStoredThreads().filter((t) => t.conversation.id !== convId);
      const nextAll = [updated, ...existing];
      writeStoredThreads(nextAll);
      setConversations(nextAll.map((t) => t.conversation));
      setNow(Date.now());
    },
    [],
  );

  const newConversation = useCallback(() => {
    if (streaming) return;
    setActiveId(null);
    setMessages([]);
    setNotice("");
    setSideOpen(false);
    requestAnimationFrame(() => composer.current?.focus());
  }, [streaming]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        newConversation();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newConversation]);

  async function openConversation(id: string) {
    if (streaming) return;
    setActiveId(id);
    setNotice("");
    setSideOpen(false);

    const localMatch = readStoredThreads().find((t) => t.conversation.id === id);
    if (localMatch) {
      setMessages(localMatch.messages);
      setMode(localMatch.conversation.mode);
      requestAnimationFrame(() => {
        if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
      });
      return;
    }

    setLoadingThread(true);
    try {
      const result = await aiRequest<{ conversation: AiConversation; messages: AiMessage[] }>(
        `/api/ai/conversations/${id}`,
        token,
      );
      setMessages(result.messages);
      setMode(result.conversation.mode);
      requestAnimationFrame(() => {
        if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : aiErrorMessage("unknown"));
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }

  async function deleteConversation(id: string) {
    const nextLocal = readStoredThreads().filter((t) => t.conversation.id !== id);
    writeStoredThreads(nextLocal);
    setConversations((items) => items.filter((item) => item.id !== id));
    if (activeId === id) newConversation();
    setStatus("Đã xoá phiên làm việc");
    try {
      await aiRequest(`/api/ai/conversations/${id}`, token, { method: "DELETE" });
    } catch {
      // Already removed locally.
    }
  }

  const activeWorkbench =
    courseWorkbenches.find((item) => item.code === activeCourseCode) ?? courseWorkbenches[0]!;

  async function send(content: string) {
    const files = attachments;
    const text = content.trim() || (files.length ? "Phân tích giúp mình các tệp đính kèm này" : "");
    if (!text || streaming || !data) return;

    setAttachments([]);
    const requestId = crypto.randomUUID();
    const convId = activeId ?? crypto.randomUUID();
    const convTitle =
      conversations.find((c) => c.id === convId)?.title ?? text.replace(/\s+/g, " ").slice(0, 56);
    const assistantId = `pending-${requestId}`;
    const abort = new AbortController();
    controller.current = abort;

    setStreaming(true);
    setNotice("");
    setDraft("");
    if (composer.current) composer.current.style.height = "auto";
    setStatus("Đang suy luận và tổng hợp câu trả lời");

    const userTurn: Message = {
      id: `user-${requestId}`,
      role: "user",
      content: text,
      status: "complete",
      createdAt: new Date().toISOString(),
      files: files.map(({ id, name, kind, preview }) => ({ id, name, kind, preview })),
    };
    const initialAssistant: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      reasoning: "",
      steps: [],
      model: usage?.model ?? "gpt-6-luna",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const priorHistory = messages
      .filter((m) => m.status === "complete" && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    const nextThread = [...messages, userTurn, initialAssistant];
    setActiveId(convId);
    setMessages(nextThread);

    const studentContextStr = [
      `Họ tên: ${account.displayName} (Mã: ${account.code}, Vai trò: ${account.roleTitle})`,
      `Lớp niên chế: ${account.cohortClass} · Khoa: ${account.department} · Ngành: ${program.name}`,
      `Học kỳ hiện tại: ${semester.name}`,
      `Học phần đang ghim tại bàn làm việc: ${activeWorkbench.code} — ${activeWorkbench.name} (${activeWorkbench.credits} TC, GV: ${activeWorkbench.lecturer})`,
      `Chuyên đề hiện tại của học phần ${activeWorkbench.code}: ${activeWorkbench.currentTopic}`,
      `Tiêu chí đánh giá học phần ${activeWorkbench.code}: ${activeWorkbench.rubricItems.map((r) => `${r.code} ${r.criterion} (${r.weight})`).join("; ")}`,
      `Tất cả học phần trong kỳ: ${courses.map((c) => `${c.code} (${c.name}, ${c.credits} TC, GV: ${c.lecturer})`).join("; ")}`,
    ].join("\n");

    let latestMessages = nextThread;
    const patch = (update: (message: Message) => Message) => {
      latestMessages = latestMessages.map((item) => (item.id === assistantId ? update(item) : item));
      setMessages(latestMessages);
    };

    try {
      await streamChat(
        token,
        {
          conversationId: convId,
          mode,
          content: text,
          assignmentId: assignmentId || null,
          reasoningEffort,
          history: priorHistory,
          studentContext: studentContextStr,
        },
        requestId,
        (event: AiStreamEvent) => {
          if (event.type === "start") {
            setActiveId(event.conversationId);
            if (event.model) {
              patch((item) => ({ ...item, model: event.model }));
            }
          } else if (event.type === "step") {
            patch((item) => ({
              ...item,
              steps: item.steps?.includes(event.label)
                ? item.steps
                : [...(item.steps ?? []), event.label],
            }));
          } else if (event.type === "reasoning") {
            patch((item) => ({
              ...item,
              reasoning: (item.reasoning ?? "") + event.text,
            }));
          } else if (event.type === "delta") {
            patch((item) => ({ ...item, content: item.content + event.text }));
          } else if (event.type === "complete") {
            patch((item) => ({
              ...item,
              status: "complete",
              reasoningMs: event.reasoningMs ?? item.reasoningMs,
            }));
          } else {
            patch((item) => ({
              ...item,
              status: event.code === "cancelled" || item.content ? "interrupted" : "failed",
              error: aiErrorMessage(event.code),
              retryContent: text,
            }));
          }
        },
        abort.signal,
        files.map((file) => ({ blob: file.blob, name: file.name })),
      );
      saveThreadToLocal(convId, convTitle, mode, latestMessages);
      setStatus("Đã hoàn tất câu trả lời");
    } catch (error) {
      setMessages((items) => items.filter((item) => item.id !== assistantId && item.id !== `user-${requestId}`));
      setDraft(content);
      setAttachments(files);
      setNotice(error instanceof AiRequestError ? error.message : aiErrorMessage("unknown"));
      setStatus("");
    } finally {
      controller.current = null;
      setStreaming(false);
    }
  }

  async function attach(files: File[], pathOf?: (file: File) => string) {
    if (!files.length || streaming) return;
    setAttaching(true);
    const result = await addFiles(files, attachments, pathOf);
    setAttaching(false);
    setAttachments((items) => [...items, ...result.added]);
    const skipped = result.skipped.length
      ? `Bỏ qua ${result.skipped.length} tệp chưa hỗ trợ (${result.skipped[0]})`
      : "";
    setNotice([result.error, skipped].filter(Boolean).join(" "));
    if (result.added.length) setStatus(`Đã đính kèm ${result.added.length} tệp`);
    composer.current?.focus();
  }

  function detach(id: string) {
    setAttachments((items) => {
      const gone = items.find((item) => item.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return items.filter((item) => item.id !== id);
    });
  }

  const pick = (input: HTMLInputElement | null) => {
    document.getElementById("aw-attach-menu")?.hidePopover();
    input?.click();
  };

  const onPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    void attach([...(event.target.files ?? [])]);
    event.target.value = "";
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  function toggleSide() {
    if (window.matchMedia("(max-width: 860px)").matches) {
      setSideOpen((value) => !value);
      return;
    }
    setSideCollapsed((value) => {
      writeFlag(sideKey, !value);
      return !value;
    });
  }

  if (loadError) {
    return (
      <div className={`aw ${phuongFonts}`} data-theme={theme}>
        <div className="aw-center">
          <div className="notice error" role="alert">
            <Icon name="alert" />
            <div>
              <strong>Không thể mở bàn làm việc AI</strong>
              <p>{loadError}</p>
            </div>
            <button className="button button-outline button-xs" type="button" onClick={() => void refresh()}>
              <Icon name="retry" /> Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`aw ${phuongFonts}`} data-theme={theme}>
        <div className="aw-center" aria-busy="true">
          <p className="aw-loading-text">Đang mở bàn làm việc suy luận học thuật</p>
        </div>
      </div>
    );
  }

  const currentMode = modes.find((item) => item.key === mode)!;
  const currentPrompts = activeWorkbench.promptsByMode[mode];
  const enabled = usage?.enabled ?? true;
  const exhausted = usage ? usage.used >= usage.limit : false;
  const name = account.displayName || data.session.user.displayName;
  const filtered = query.trim()
    ? conversations.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()))
    : conversations;
  const empty = !messages.length && !loadingThread;
  const selectedAssignment = data.assignments.find((item) => item.id === assignmentId);
  const activeModelName = usage?.model ?? "gpt-6-luna";

  const composerForm = (
    <form className="aw-composer" onSubmit={submit}>
      {notice && (
        <div className="aw-alert" role="alert">
          <Icon name="alert" />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo">
            <Icon name="close" />
          </button>
        </div>
      )}

      <div className="aw-box">
        {(attachments.length > 0 || attaching) && (
          <ul className="aw-tray" aria-label="Tệp đính kèm">
            {attachments.map((item) => (
              <li key={item.id} className={`aw-file k-${item.kind}`}>
                {item.preview ? (
                  <img src={item.preview} alt="" />
                ) : (
                  <span className="aw-file-icon" aria-hidden="true">
                    <Icon name={item.kind === "pdf" ? "file" : "list"} />
                  </span>
                )}
                <span className="aw-file-text">
                  <strong title={item.name}>{item.name.split("/").at(-1)}</strong>
                  <small>{formatSize(item.size)}</small>
                </span>
                <button
                  type="button"
                  className="aw-file-remove"
                  aria-label={`Bỏ ${item.name}`}
                  onClick={() => detach(item.id)}
                  disabled={streaming}
                >
                  <Icon name="close" />
                </button>
              </li>
            ))}
            {attaching && <li className="aw-file is-loading">Đang đọc tệp đính kèm</li>}
          </ul>
        )}

        <label className="sr-only" htmlFor="ai-input">
          Nội dung câu hỏi cho AI
        </label>
        <textarea
          id="ai-input"
          ref={composer}
          rows={empty ? 2 : 1}
          value={draft}
          maxLength={8000}
          placeholder={`${currentMode.hint} (${activeWorkbench.code} · ${activeWorkbench.name})`}
          disabled={!enabled || exhausted}
          autoFocus
          onChange={(event) => {
            setDraft(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 220)}px`;
          }}
          onKeyDown={onKeyDown}
          onPaste={(event) => {
            const pasted = [...event.clipboardData.files];
            if (!pasted.length) return;
            event.preventDefault();
            void attach(pasted, (file) => (file.name === "image.png" ? `anh-dan-${Date.now()}.png` : file.name));
          }}
        />

        <div className="aw-box-bar">
          <div className="aw-tools">
            <button
              type="button"
              className="aw-tool-btn is-icon"
              popoverTarget="aw-attach-menu"
              aria-label="Đính kèm tệp hoặc ảnh"
              title="Đính kèm ảnh, PDF, mã nguồn"
              disabled={!enabled || exhausted || streaming}
            >
              <Icon name="plus" />
            </button>
            <div id="aw-attach-menu" popover="auto" className="aw-attach-menu">
              <button type="button" onClick={() => pick(imagePicker.current)}>
                <Icon name="image" />
                <span>
                  <strong>Hình ảnh & bài giải viết tay</strong>
                  <small>PNG, JPEG, WebP</small>
                </span>
              </button>
              <button type="button" onClick={() => pick(filePicker.current)}>
                <Icon name="file" />
                <span>
                  <strong>Giáo trình PDF & mã nguồn</strong>
                  <small>PDF, C++, Java, Python, SQL</small>
                </span>
              </button>
              <button type="button" onClick={() => pick(folderPicker.current)}>
                <Icon name="class" />
                <span>
                  <strong>Thư mục đồ án</strong>
                  <small>Tải toàn bộ cây thư mục mã nguồn</small>
                </span>
              </button>
            </div>
            <input ref={imagePicker} type="file" hidden multiple accept="image/png,image/jpeg,image/gif,image/webp" onChange={onPicked} />
            <input ref={filePicker} type="file" hidden multiple onChange={onPicked} />
            <input
              ref={folderPicker}
              type="file"
              hidden
              multiple
              {...({ webkitdirectory: "" } as Record<string, string>)}
              onChange={onPicked}
            />

            <label className="aw-tool-select is-active" title="Học phần đang ghim vào ngữ cảnh">
              <Icon name="book" />
              <select
                aria-label="Học phần đang ghim"
                value={activeCourseCode}
                onChange={(event) => setActiveCourseCode(event.target.value)}
                disabled={streaming}
              >
                {courseWorkbenches.map((courseItem) => (
                  <option key={courseItem.code} value={courseItem.code}>
                    {courseItem.code}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className={`aw-tool-btn${reasoningEffort === "high" ? " is-active" : ""}`}
              aria-pressed={reasoningEffort === "high"}
              onClick={() => setReasoningEffort((prev) => (prev === "high" ? "medium" : "high"))}
              disabled={streaming}
              title="Bật Suy luận sâu để kiểm chứng từng bước trước khi trả lời"
            >
              <Icon name="clock" />
              <span>{reasoningEffort === "high" ? "Suy luận sâu" : "Suy luận chuẩn"}</span>
            </button>

            <label className="aw-tool-select" title="Chế độ làm việc">
              <Icon name={currentMode.icon} />
              <select
                aria-label="Chế độ làm việc"
                value={mode}
                onChange={(event) => setMode(event.target.value as AiMode)}
                disabled={streaming}
              >
                {modes.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={`aw-tool-select${assignmentId ? " is-active" : ""}`} title="Gắn bài tập học phần vào ngữ cảnh">
              <Icon name="assignment" />
              <select
                aria-label="Gắn bài tập học phần"
                value={assignmentId}
                onChange={(event) => setAssignmentId(event.target.value)}
                disabled={streaming}
              >
                <option value="">Không gắn bài tập</option>
                {data.assignments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {streaming ? (
            <button
              className="aw-send is-stop"
              type="button"
              aria-label="Dừng suy luận"
              onClick={() => controller.current?.abort()}
            >
              <Icon name="stop" />
            </button>
          ) : (
            <button
              className="aw-send"
              type="submit"
              aria-label="Gửi yêu cầu"
              disabled={!enabled || exhausted || attaching || (!draft.trim() && !attachments.length)}
            >
              <Icon name="arrow" />
            </button>
          )}
        </div>
      </div>

      <div className="aw-composer-foot">
        <span>
          Ngữ cảnh học vụ: <code>{activeWorkbench.code}</code> · Lớp <code>{account.cohortClass}</code>
        </span>
        <span>
          Nhấn <kbd className="aw-kbd">Enter</kbd> để gửi · <kbd className="aw-kbd">Shift + Enter</kbd> xuống dòng
        </span>
      </div>
    </form>
  );

  return (
    <div
      className={`aw ${phuongFonts}${sideCollapsed ? " is-collapsed" : ""}${sideOpen ? " is-open" : ""}`}
      data-theme={theme}
    >
      <aside className="aw-side" aria-label="Lịch sử phiên làm việc" id="aw-side">
        <div className="aw-side-head">
          <div className="aw-side-brand">
            <span className="aw-seal" aria-hidden="true">SDU</span>
            <div className="aw-side-brand-text">
              <strong>Sao Đỏ AI</strong>
              <span>{semester.short}</span>
            </div>
          </div>
          <button
            className="aw-icon-btn"
            type="button"
            onClick={toggleSide}
            aria-label="Thu gọn thanh bên"
            aria-controls="aw-side"
            title="Thu gọn thanh bên"
          >
            <Icon name="panel" />
          </button>
        </div>

        <button className="aw-new-row" type="button" onClick={newConversation} disabled={streaming}>
          <Icon name="plus" />
          <span>Phiên suy luận mới</span>
          <kbd className="aw-kbd">Ctrl ⇧ O</kbd>
        </button>

        <label className="aw-search">
          <Icon name="search" />
          <span className="sr-only">Tìm phiên làm việc</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm phiên làm việc"
          />
        </label>

        <nav className="aw-history" aria-label="Lịch sử phiên làm việc">
          {filtered.length ? (
            groupByRecency(filtered, now).map((group) => (
              <div key={group.label} className="aw-group-block">
                <p className="aw-group">{group.label}</p>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.id} aria-current={item.id === activeId ? "true" : undefined}>
                      <button
                        type="button"
                        title={item.title}
                        onClick={() => void openConversation(item.id)}
                        disabled={streaming}
                      >
                        <span className="aw-title">{item.title}</span>
                      </button>
                      <button
                        className="aw-delete"
                        type="button"
                        aria-label={`Xoá ${item.title}`}
                        onClick={() => void deleteConversation(item.id)}
                        disabled={streaming}
                      >
                        <Icon name="trash" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <div className="aw-history-empty">
              <p className="aw-muted">
                {query ? "Không có phiên khớp từ khóa" : "Chưa có phiên lưu trong trình duyệt"}
              </p>
              <span>Mỗi phiên tự động gắn ngữ cảnh học phần và lưu cục bộ để tra cứu lại</span>
            </div>
          )}
        </nav>

        <div className="aw-side-foot">
          <div className="aw-user">
            <span className="aw-user-avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(name)}
            </span>
            <span className="aw-user-meta">
              <strong>{name}</strong>
              <small>
                {account.code} · {account.roleBadge}
              </small>
            </span>
            <Link
              href={"/student/settings" as Route}
              className="aw-icon-btn"
              aria-label="Mở cài đặt giao diện"
              title="Cài đặt giao diện & hiển thị"
            >
              <Icon name="user" />
            </Link>
          </div>
          <Link href="/student" className="aw-back">
            <Icon name="back" />
            <span>Về cổng học tập</span>
          </Link>
        </div>
      </aside>

      {sideOpen && (
        <button
          className="aw-scrim"
          type="button"
          aria-label="Đóng thanh bên"
          onClick={() => setSideOpen(false)}
        />
      )}

      <main
        className={`aw-main${dragging ? " is-dragging" : ""}`}
        id="noi-dung"
        onDragEnter={(event) => {
          if (enabled && event.dataTransfer.types.includes("Files")) setDragging(true);
        }}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) event.preventDefault();
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!enabled || exhausted) return;
          void filesFromDrop(event.dataTransfer.items).then((dropped) => {
            const paths = new Map(dropped.map(({ file, path }) => [file, path]));
            return attach(
              dropped.map(({ file }) => file),
              (file) => paths.get(file) ?? file.name,
            );
          });
        }}
      >
        {dragging && (
          <div className="aw-drop" aria-hidden="true">
            <Icon name="paperclip" />
            <strong>Thả tệp, ảnh hoặc thư mục mã nguồn vào bàn làm việc</strong>
            <span>Hỗ trợ tối đa 30 MB mỗi phiên</span>
          </div>
        )}

        <header className="aw-top">
          <div className="aw-top-left">
            <button
              className="aw-icon-btn aw-open-side"
              type="button"
              onClick={toggleSide}
              aria-label="Mở thanh bên"
              aria-controls="aw-side"
            >
              <Icon name="panel" />
            </button>
            <div className="aw-model-pill">
              <span className="aw-live-dot" aria-hidden="true" />
              <strong>Sao Đỏ AI</strong>
              <code>{activeModelName}</code>
            </div>
            <span className="aw-context-tag">
              <Icon name="book" />
              <span>
                {activeWorkbench.code} · {activeWorkbench.name}
              </span>
            </span>
          </div>

          <div className="aw-top-right">
            {selectedAssignment && (
              <span className="aw-context-tag" title={selectedAssignment.title}>
                <Icon name="assignment" />
                <span>{selectedAssignment.title}</span>
              </span>
            )}
            {usage && (
              <span className="aw-quota-meta" title="Hạn mức lượt suy luận trong kỳ">
                Hạn mức <code>{usage.used}/{usage.limit}</code>
              </span>
            )}
            <button
              className="aw-icon-btn"
              type="button"
              onClick={newConversation}
              disabled={streaming}
              aria-label="Phiên suy luận mới"
              title="Phiên suy luận mới (Ctrl+Shift+O)"
            >
              <Icon name="plus" />
            </button>
          </div>
        </header>

        {empty ? (
          <div className="aw-empty-stage">
            <div className="aw-empty-inner">
              <header className="aw-empty-head">
                <div className="aw-empty-eyebrow">
                  <span className="aw-eyebrow-code">{account.cohortClass}</span>
                  <span>{account.department} · {semester.name}</span>
                </div>
                <h1>Bàn làm việc học thuật & phân tích học phần</h1>
                <p>
                  Chọn học phần bên dưới để nạp đề cương, trọng số chấm bài và tiêu chí đánh giá của giảng viên vào phiên suy luận
                </p>
              </header>

              {/* Product Moment: Interactive SDU Academic Context & Rubric Workbench */}
              <section className="aw-workbench" aria-label="Hồ sơ ngữ cảnh học phần đang nạp">
                <div className="aw-course-tabs" role="tablist" aria-label="Chọn học phần kỳ này">
                  {courseWorkbenches.map((courseItem) => {
                    const isSelected = courseItem.code === activeWorkbench.code;
                    return (
                      <button
                        key={courseItem.code}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        className={`aw-course-tab${isSelected ? " is-active" : ""}`}
                        onClick={() => setActiveCourseCode(courseItem.code)}
                      >
                        <code>{courseItem.code}</code>
                        <span>{courseItem.name}</span>
                        <small>{courseItem.credits} TC</small>
                      </button>
                    );
                  })}
                </div>

                <div className="aw-workbench-body">
                  <div className="aw-workbench-Primary">
                    <div className="aw-workbench-meta">
                      <span className="aw-workbench-badge">Đang nạp vào hệ thống</span>
                      <code>GV: {activeWorkbench.lecturer}</code>
                    </div>
                    <h2>
                      <span>{activeWorkbench.code}</span> · {activeWorkbench.name}
                    </h2>
                    <p className="aw-workbench-topic">{activeWorkbench.currentTopic}</p>
                    <div className="aw-workbench-lab">
                      <Icon name="assignment" />
                      <span>{activeWorkbench.labFocus}</span>
                    </div>
                  </div>

                  <div className="aw-workbench-rubric" aria-label="Tiêu chí kiểm chứng của học phần">
                    <div className="aw-rubric-head">
                      <span>Tiêu chí đối chiếu đầu ra</span>
                      <code>3 mốc kiểm chứng</code>
                    </div>
                    <dl className="aw-rubric-list">
                      {activeWorkbench.rubricItems.map((item) => (
                        <div key={item.code}>
                          <dt>
                            <code>{item.code}</code>
                            <span>{item.criterion}</span>
                          </dt>
                          <dd>{item.weight}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </section>

              {composerForm}

              <div className="aw-bottom-grid">
                <div className="aw-modes-bar">
                  <span className="aw-section-label">Chế độ suy luận</span>
                  <div className="aw-modes-strip" role="group" aria-label="Chế độ làm việc">
                    {modes.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        aria-pressed={item.key === mode}
                        onClick={() => setMode(item.key)}
                      >
                        <Icon name={item.icon} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="aw-starters" aria-label="Đề xuất bài toán theo học phần">
                  {currentPrompts.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      className="aw-starter-card"
                      onClick={() => {
                        setDraft(item.prompt);
                        composer.current?.focus();
                      }}
                    >
                      <div className="aw-starter-top">
                        <code>{item.tag}</code>
                        <Icon name="arrow" />
                      </div>
                      <strong>{item.title}</strong>
                      <p>{item.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="aw-thread" ref={thread}>
              <div className="aw-column">
                <div className="aw-thread-banner">
                  <div>
                    <code>{activeWorkbench.code}</code>
                    <strong>{activeWorkbench.name}</strong>
                    <span>· {activeWorkbench.currentTopic}</span>
                  </div>
                  <code>{ currentMode.label }</code>
                </div>

                {loadingThread ? (
                  <div className="aw-skeleton-stack" aria-label="Đang tải phiên làm việc">
                    <div className="aw-skel is-user" />
                    <div className="aw-skel is-assistant" />
                  </div>
                ) : (
                  messages.map((message, index) =>
                    message.role === "user" ? (
                      <article key={message.id} className="aw-turn is-user">
                        <div className="aw-user-stack">
                          {message.files?.length ? (
                            <ul className="aw-sent-files" aria-label="Tệp đã đính kèm">
                              {message.files.map((file) => (
                                <li key={file.id}>
                                  {file.preview ? (
                                    <img src={file.preview} alt={file.name} />
                                  ) : (
                                    <span>
                                      <Icon name={file.kind === "pdf" ? "file" : "list"} />{" "}
                                      {file.name.split("/").at(-1)}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <div className="aw-user-bubble">{message.content}</div>
                        </div>
                      </article>
                    ) : (
                      <article key={message.id} className="aw-turn is-assistant">
                        <div className="aw-assistant-head">
                          <span className="aw-assistant-mark" aria-hidden="true">
                            <img src="/sao-do-logo.png" alt="" width={18} height={18} />
                          </span>
                          <strong>Sao Đỏ AI</strong>
                          <code>{message.model ?? activeModelName}</code>
                          <span className="aw-assistant-course">{activeWorkbench.code}</span>
                        </div>

                        <div className="aw-assistant-body">
                          <ReasoningBlock
                            message={message}
                            isStreaming={streaming && index === messages.length - 1}
                          />

                          {message.content ? (
                            <div className="aw-prose bubble">
                              <Markdown text={message.content} />
                            </div>
                          ) : message.status === "pending" ? null : (
                            <p className="aw-error-inline">
                              {message.error ?? "Không nhận được phản hồi từ mô hình"}
                            </p>
                          )}

                          {message.status !== "pending" && (
                            <footer className="aw-turn-foot">
                              {message.content && (
                                <button
                                  className="aw-foot-btn"
                                  type="button"
                                  onClick={() => {
                                    void navigator.clipboard?.writeText(message.content).then(() => {
                                      setCopiedId(message.id);
                                      window.setTimeout(() => setCopiedId(null), 1800);
                                    });
                                  }}
                                >
                                  <Icon name={copiedId === message.id ? "check" : "copy"} />
                                  <span>{copiedId === message.id ? "Đã chép" : "Sao chép"}</span>
                                </button>
                              )}
                              {message.retryContent && !streaming && (
                                <button
                                  className="aw-foot-btn"
                                  type="button"
                                  onClick={() => void send(message.retryContent!)}
                                >
                                  <Icon name="retry" />
                                  <span>Thử lại</span>
                                </button>
                              )}
                              {message.reasoningMs && (
                                <span className="aw-foot-meta">
                                  {(message.reasoningMs / 1000).toFixed(1)}s suy luận
                                </span>
                              )}
                            </footer>
                          )}
                        </div>
                      </article>
                    ),
                  )
                )}
              </div>
            </div>
            <div className="aw-dock">{composerForm}</div>
          </>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>
      </main>
    </div>
  );
}
