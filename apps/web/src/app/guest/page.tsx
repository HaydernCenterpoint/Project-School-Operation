import type { Metadata, Route } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AppShell, type NavGroup } from "@/components/AppShell";
import { Dashboard } from "@/components/Dashboard";
import { Icon } from "@/components/Icon";
import { Markdown } from "@/components/Markdown";
import { demoData } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Chế độ khách" };

const nav: NavGroup[] = [
  { label: "Tổng quan", items: [{ href: "/guest", label: "Bảng điều khiển", short: "Tổng quan", icon: "home", exact: true }] },
  { label: "Công cụ", items: [{ href: "/guest#ai-demo" as Route, label: "Trợ lý AI", icon: "sparkle", exact: true }] },
  { label: "Tài khoản", items: [{ href: "/login", label: "Đăng nhập", icon: "user" }] },
];

const demoConversation = [
  { role: "user", text: "Giải thích giúp mình tính đa hình trong lập trình hướng đối tượng?" },
  {
    role: "assistant",
    text: "### Đa hình là gì?\nĐa hình cho phép **cùng một lời gọi** hoạt động khác nhau tùy đối tượng thực tế.\n\n- Lớp `DongVat` có phương thức `keu()`.\n- `Meo` và `Cho` kế thừa và ghi đè `keu()`.\n- Gọi `dongVat.keu()` sẽ ra \"meo\" hoặc \"gâu\" tùy đối tượng.\n\n**Tự kiểm tra:** theo bạn, ghi đè (override) khác nạp chồng (overload) ở điểm nào?",
  },
] as const;

// Demo deadlines are relative to the visit, not to the build.
const requestTime = () => Date.now();

export default async function GuestPage() {
  await connection();
  const now = requestTime();
  const demo = demoData(now);
  const toLogin = "/login" as Route;

  return (
    <AppShell
      nav={nav}
      user={{ name: "Khách", role: "Chế độ khách", initial: "K" }}
      searchAction="/login"
      notifications={[
        { id: "demo-note", title: "Phản hồi: Truy vấn SQL cơ bản", text: "Nội dung minh họa", href: "/login" },
      ]}
      profileHref="/login"
      sideCard={
        <div className="side-foot">
          <div className="plan-card">
            <div className="plan-head">
              <Icon name="user" />
              <strong>Chế độ khách</strong>
            </div>
            <p>Đăng nhập để xem lớp học và bài tập thật của bạn.</p>
            <Link className="button button-dark button-block" href="/login">Đăng nhập</Link>
          </div>
        </div>
      }
    >
      <div className="guest-banner" role="note">
        <span className="chip demo">Chế độ khách</span>
        <p>
          <strong>Nội dung minh họa.</strong> Lớp học, bài tập và phản hồi dưới đây là dữ liệu giả lập để
          giới thiệu giao diện, không phải dữ liệu thật của nhà trường.
        </p>
        <Link className="button button-dark button-sm" href="/login">Đăng nhập</Link>
      </div>

      <Dashboard
        name="bạn"
        classes={demo.classes}
        assignments={demo.assignments}
        submissions={demo.submissions}
        now={now}
        aiUsage={null}
        actions={
          <Link className="button button-dark button-sm" href="/guest#ai-demo">
            <Icon name="sparkle" /> Xem minh họa AI
          </Link>
        }
        links={{
          assignment: () => toLogin,
          assignments: toLogin,
          classes: toLogin,
          ai: "/guest#ai-demo" as Route,
        }}
      />

      <section className="card" id="ai-demo" style={{ marginTop: 16, scrollMarginTop: 88 }} aria-labelledby="ai-demo-title">
        <div className="card-head">
          <h3 id="ai-demo-title">Trợ lý học tập AI</h3>
          <span className="chip demo">Nội dung minh họa</span>
        </div>
        <div className="ai-thread" style={{ padding: 0, overflow: "visible" }}>
          {demoConversation.map((message) => (
            <div key={message.role} className={`msg ${message.role}`}>
              <div className="bubble">
                {message.role === "user" ? message.text : <Markdown text={message.text} />}
              </div>
            </div>
          ))}
        </div>
        <div className="notice" style={{ marginTop: 20 }}>
          <Icon name="info" />
          <div>
            <strong>Khách không thể gửi câu hỏi cho AI</strong>
            <p>Đây là đoạn hội thoại ghi sẵn. Đăng nhập bằng tài khoản sinh viên để dùng trợ lý thật.</p>
          </div>
          <Link className="button button-primary button-small" href="/login">Đăng nhập</Link>
        </div>
      </section>
    </AppShell>
  );
}
