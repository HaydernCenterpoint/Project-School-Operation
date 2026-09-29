"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { countdown, daysUntil, DemoBanner, PageTitle, Section, StatTile } from "@/components/portal/Parts";
import { bank, clock, invoices, longDay, money, payments } from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

export default function TuitionPage() {
  const { data } = useStudent();
  const [now] = useState(Date.now);
  const [status, setStatus] = useState("");
  if (!data) return null;
  const [current, ...previous] = invoices(now);
  const due = current!.items.reduce((sum, item) => sum + item.amount, 0);
  const owed = Math.max(0, due - current!.paid);
  const studentId = data.session.user.email?.split("@")[0] ?? "";
  const transferNote = `SDU ${studentId} ${current!.term}`;
  const days = daysUntil(current!.due, now);

  return (
    <>
      <DemoBanner />
      <PageTitle title="Học phí" lead="Công nợ và lịch sử nộp học phí. Số tiền theo đồng Việt Nam." />

      <div className="pt-stats">
        <StatTile icon="wallet" label={`Phải nộp ${current!.term}`} value={money(due)} />
        <StatTile icon="checkCircle" label="Đã nộp" value={money(current!.paid)} tone="good" />
        <StatTile
          icon="alert"
          label="Còn nợ"
          value={money(owed)}
          note={owed ? `Hạn ${new Date(current!.due).toLocaleDateString("vi-VN")} · ${countdown(current!.due, now)}` : "Đã hoàn thành"}
          tone={owed ? (days <= 7 ? "danger" : "warn") : "good"}
        />
      </div>

      <div className="pt-two">
        <Section title={`Chi tiết ${current!.term}`} icon="list">
          <dl className="meta-list pt-bill">
            {current!.items.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd className={item.amount < 0 ? "pt-minus" : ""}>{money(item.amount)}</dd>
              </div>
            ))}
            <div className="pt-bill-total">
              <dt>Tổng phải nộp</dt>
              <dd>{money(due)}</dd>
            </div>
            <div>
              <dt>Đã nộp</dt>
              <dd>- {money(current!.paid)}</dd>
            </div>
            <div className="pt-bill-total">
              <dt>Còn nợ</dt>
              <dd>{money(owed)}</dd>
            </div>
          </dl>
        </Section>

        <Section title="Nộp qua chuyển khoản" icon="wallet">
          <dl className="meta-list">
            <div><dt>Ngân hàng</dt><dd>{bank.name}</dd></div>
            <div><dt>Số tài khoản</dt><dd>{bank.account}</dd></div>
            <div><dt>Chủ tài khoản</dt><dd>{bank.holder}</dd></div>
            <div><dt>Số tiền</dt><dd>{money(owed)}</dd></div>
            <div><dt>Nội dung</dt><dd>{transferNote}</dd></div>
          </dl>
          <button
            className="button button-outline button-small pt-copy"
            type="button"
            onClick={() =>
              void navigator.clipboard?.writeText(transferNote).then(
                () => setStatus("Đã sao chép nội dung chuyển khoản."),
                () => setStatus("Không thể sao chép. Hãy chép thủ công."),
              )
            }
          >
            <Icon name="copy" /> Sao chép nội dung
          </button>
          <p className="pt-muted">Ghi đúng nội dung để hệ thống tự đối soát. Thông tin tài khoản trên là dữ liệu mẫu.</p>
        </Section>
      </div>

      <Section title="Lịch sử thanh toán" icon="clock">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Thời gian</th>
                <th scope="col">Số tiền</th>
                <th scope="col">Hình thức</th>
                <th scope="col">Mã giao dịch</th>
              </tr>
            </thead>
            <tbody>
              {payments(now).map((item) => (
                <tr key={item.reference}>
                  <td>{clock(item.at)} {longDay(item.at)}</td>
                  <td><strong>{money(item.amount)}</strong></td>
                  <td>{item.method}</td>
                  <td className="pt-code">{item.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {previous.map((invoice) => (
        <Section key={invoice.term} title={invoice.term} icon="checkCircle" action={<span className="chip reviewed">Đã hoàn thành</span>}>
          <p className="pt-muted">
            {invoice.items.map((item) => item.label).join(", ")}: {money(invoice.items.reduce((sum, item) => sum + item.amount, 0))}
          </p>
        </Section>
      ))}
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </>
  );
}
