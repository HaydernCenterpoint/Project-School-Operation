"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { countdown, daysUntil, DemoBanner, PageTitle, Section } from "@/components/portal/Parts";
import { bank, clock, courses, invoices, longDay, money, payments, useDemoState } from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

const perCredit = 450_000;
const qrSize = 21;

/** Deterministic 21x21 QR-like matrix seeded from the transfer payload. */
function buildQrMatrix(payload: string): boolean[][] {
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const grid: boolean[][] = Array.from({ length: qrSize }, () => Array<boolean>(qrSize).fill(false));

  const placeFinder = (row0: number, col0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[row0 + r]![col0 + c] = border || inner;
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, qrSize - 7);
  placeFinder(qrSize - 7, 0);

  for (let i = 8; i < qrSize - 8; i++) {
    grid[6]![i] = i % 2 === 0;
    grid[i]![6] = i % 2 === 0;
  }

  for (let r = 0; r < qrSize; r++) {
    for (let c = 0; c < qrSize; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= qrSize - 8;
      const inBottomLeft = r >= qrSize - 8 && c < 8;
      const inCenterSeal = r >= 8 && r <= 12 && c >= 8 && c <= 12;
      if (inTopLeft || inTopRight || inBottomLeft || inCenterSeal || r === 6 || c === 6) continue;
      const bit = ((hash >>> ((r * qrSize + c) % 24)) ^ (r * 31 + c * 17)) & 3;
      grid[r]![c] = bit !== 0;
    }
  }
  return grid;
}

export default function TuitionPage() {
  const { data, account } = useStudent();
  const [now] = useState(Date.now);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [settledExtra, setSettledExtra] = useDemoState<number>("tuition-settled", () => 0);

  if (!data) return null;

  const [current, ...previous] = invoices(now);
  const due = current!.items.reduce((sum, item) => sum + item.amount, 0);
  const paidTotal = Math.min(due, current!.paid + settledExtra);
  const owed = Math.max(0, due - paidTotal);
  const paidPct = due > 0 ? Math.min(100, Math.round((paidTotal / due) * 100)) : 100;
  const studentCode = account.code || (data.session.user.email?.split("@")[0]?.toUpperCase() ?? "2200286");
  const transferNote = `SDU ${studentCode} ${current!.term.replace(/\s+/g, " ")}`;
  const rawAccount = bank.account.replace(/\s+/g, "");
  const days = daysUntil(current!.due, now);
  const qrGrid = buildQrMatrix(`${bank.bin}|${rawAccount}|${owed}|${transferNote}`);

  const allPayments = [
    ...(settledExtra > 0
      ? [
          {
            at: new Date(now).toISOString(),
            amount: settledExtra,
            method: "Chuyển khoản VietQR",
            reference: `SDU${studentCode}-1026`,
          },
        ]
      : []),
    ...payments(now),
  ];

  function copyValue(key: string, value: string, label: string) {
    void navigator.clipboard?.writeText(value).then(
      () => {
        setCopiedKey(key);
        setStatus(`Đã sao chép ${label}`);
        window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
      },
      () => setStatus(`Không thể sao chép ${label}`),
    );
  }

  return (
    <div className="tui">
      <DemoBanner />
      <PageTitle
        title="Học phí & Công nợ"
        lead={`Học kỳ hiện tại: ${current!.term} · Đơn vị tính: Đồng Việt Nam (₫)`}
      >
        <div className={`reg-window${owed === 0 ? " is-open" : ""}`} role="status">
          <span className="reg-window-dot" aria-hidden="true" />
          <span>
            <strong>{owed === 0 ? "Đã hoàn thành học phí" : "Đang mở thu học phí"}</strong>
            {" · "}
            {owed > 0
              ? `Hạn ${new Date(current!.due).toLocaleDateString("vi-VN")} (${countdown(current!.due, now)})`
              : "Không còn công nợ kỳ này"}
          </span>
        </div>
      </PageTitle>

      {/* Top settlement progress & summary ledger */}
      <div className="tui-overview">
        <section className="reg-quota-card" aria-label="Tiến độ hoàn thành học phí">
          <div className="reg-quota-head">
            <div>
              <span className="reg-label">Còn phải nộp · {current!.term}</span>
              <p className="reg-figure">
                <strong>{money(owed)}</strong>
                <span>/ {money(due)}</span>
              </p>
            </div>
            <span className={`reg-standing ${owed === 0 ? "good" : days <= 7 ? "danger" : "warn"}`}>
              {owed === 0 ? "Đã gạch nợ 100%" : `Đã nộp ${paidPct}% · ${countdown(current!.due, now)}`}
            </span>
          </div>

          <div className="reg-meter" role="progressbar" aria-label="Tỷ lệ học phí đã nộp" aria-valuemin={0} aria-valuemax={100} aria-valuenow={paidPct}>
            <span className="tui-meter-paid" style={{ width: `${paidPct}%` }} />
          </div>

          <div className="reg-quota-foot">
            <span>
              <i className="tui-dot-paid" aria-hidden="true" />
              Đã đối soát: <strong>{money(paidTotal)}</strong>
            </span>
            <span>
              <i className="tui-dot-owed" aria-hidden="true" />
              Còn lại: <strong>{money(owed)}</strong>
            </span>
            <span className="reg-quota-min">Đơn giá: {money(perCredit)} / tín chỉ</span>
          </div>
        </section>

        <section className="tui-stat-card" aria-label="Tổng hợp khoản thu học kỳ">
          <div className="tui-stat-head">
            <span className="reg-label">Tổng hợp học kỳ</span>
            <code>{courses.reduce((sum, c) => sum + c.credits, 0)} tín chỉ</code>
          </div>
          <dl className="tui-stat-list">
            <div>
              <dt>Học phí tín chỉ</dt>
              <dd>{money(courses.reduce((sum, c) => sum + c.credits, 0) * perCredit)}</dd>
            </div>
            <div>
              <dt>Bảo hiểm y tế bắt buộc</dt>
              <dd>{money(680_400)}</dd>
            </div>
            <div>
              <dt>Miễn giảm chính sách</dt>
              <dd className="is-discount">{money(-1_000_000)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Asymmetric split: Left itemized ledger + history, Right VietQR payment voucher */}
      <div className="tui-workspace">
        <div className="tui-main">
          <Section
            title={`Bảng kê chi tiết · ${current!.term}`}
            action={<span className="reg-table-meta">{courses.length} học phần đăng ký</span>}
          >
            <div className="tui-table-wrap">
              <table className="tui-ledger-table">
                <thead>
                  <tr>
                    <th scope="col">Mã HP</th>
                    <th scope="col">Nội dung khoản thu</th>
                    <th scope="col" className="is-num">Tín chỉ</th>
                    <th scope="col" className="is-num">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.code}>
                      <td className="is-code">{course.code}</td>
                      <td>
                        <strong>{course.name}</strong>
                        <small>{course.lecturer}</small>
                      </td>
                      <td className="is-num is-mono">{course.credits}</td>
                      <td className="is-num is-mono">{money(course.credits * perCredit)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="is-code">BHYT</td>
                    <td>
                      <strong>Bảo hiểm y tế sinh viên</strong>
                      <small>Thu theo năm học (12 tháng)</small>
                    </td>
                    <td className="is-num is-mono">—</td>
                    <td className="is-num is-mono">{money(680_400)}</td>
                  </tr>
                  <tr className="is-discount-row">
                    <td className="is-code">MG01</td>
                    <td>
                      <strong>Miễn giảm theo chính sách</strong>
                      <small>Hỗ trợ học phí theo quy định hiện hành</small>
                    </td>
                    <td className="is-num is-mono">—</td>
                    <td className="is-num is-mono is-discount">{money(-1_000_000)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={3}>Tổng phải nộp học kỳ</th>
                    <td className="is-num is-mono">{money(due)}</td>
                  </tr>
                  <tr>
                    <th scope="row" colSpan={3}>Đã nộp và gạch nợ</th>
                    <td className="is-num is-mono">{money(-paidTotal)}</td>
                  </tr>
                  <tr className="is-balance-row">
                    <th scope="row" colSpan={3}>Số tiền còn phải nộp</th>
                    <td className="is-num is-mono">{money(owed)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          <Section
            title="Lịch sử giao dịch & Biên lai"
            action={<span className="reg-table-meta">{allPayments.length} giao dịch</span>}
          >
            <ul className="tui-receipt-list">
              {allPayments.map((item) => (
                <li key={item.reference} className="tui-receipt-row">
                  <div className="tui-receipt-code">
                    <code>{item.reference}</code>
                    <span>{clock(item.at)} · {longDay(item.at)}</span>
                  </div>
                  <div className="tui-receipt-method">
                    <strong>{item.method}</strong>
                    <span className="tui-verified">
                      <i aria-hidden="true" /> Đã đối soát tự động
                    </span>
                  </div>
                  <div className="tui-receipt-amount">
                    <strong>{money(item.amount)}</strong>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Các học kỳ trước"
            action={<span className="reg-table-meta">{previous.length} học kỳ</span>}
          >
            <ul className="tui-receipt-list">
              {previous.map((invoice) => {
                const totalTerm = invoice.items.reduce((sum, item) => sum + item.amount, 0);
                return (
                  <li key={invoice.term} className="tui-receipt-row">
                    <div className="tui-receipt-code">
                      <strong>{invoice.term}</strong>
                      <span>Hạn {new Date(invoice.due).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <div className="tui-receipt-method">
                      <span>{invoice.items.map((item) => item.label).join(" · ")}</span>
                      <span className="tui-verified">
                        <i aria-hidden="true" /> Đã hoàn thành
                      </span>
                    </div>
                    <div className="tui-receipt-amount">
                      <strong>{money(totalTerm)}</strong>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>

        {/* Right column: VietQR Payment Voucher (The Moment) */}
        <aside className="tui-side">
          <section className="tui-voucher" aria-label="Phiếu chuyển khoản học phí VietQR">
            <header className="tui-voucher-head">
              <div>
                <span className="tui-voucher-kicker">
                  <i aria-hidden="true" /> Phiếu thanh toán học phí
                </span>
                <h3>Chuyển khoản VietQR 24/7</h3>
              </div>
              <code className="tui-bank-badge">{bank.shortName}</code>
            </header>

            <div className="tui-qr-frame">
              <div className="tui-qr-box" role="img" aria-label={`Mã QR chuyển khoản ${money(owed)} tới ${bank.name}`}>
                <svg viewBox={`0 0 ${qrSize} ${qrSize}`} className="tui-qr-svg" shapeRendering="crispEdges">
                  {qrGrid.map((row, r) =>
                    row.map((cell, c) =>
                      cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} /> : null,
                    ),
                  )}
                </svg>
                <span className="tui-qr-seal">SDU</span>
              </div>
              <div className="tui-qr-caption">
                <strong>{owed > 0 ? money(owed) : "Đã hoàn thành"}</strong>
                <span>Quét bằng ứng dụng ngân hàng để tự điền số tiền và cú pháp</span>
              </div>
            </div>

            <dl className="tui-voucher-fields">
              <div className="tui-field-row">
                <div>
                  <dt>Ngân hàng thụ hưởng</dt>
                  <dd>{bank.name}</dd>
                </div>
              </div>

              <div className="tui-field-row">
                <div>
                  <dt>Chủ tài khoản</dt>
                  <dd className="is-mono">{bank.holder}</dd>
                </div>
              </div>

              <div className="tui-field-row">
                <div>
                  <dt>Số tài khoản</dt>
                  <dd className="is-mono">{bank.account}</dd>
                </div>
                <button
                  type="button"
                  className={`tui-copy-btn${copiedKey === "account" ? " is-copied" : ""}`}
                  onClick={() => copyValue("account", rawAccount, "số tài khoản")}
                >
                  <Icon name={copiedKey === "account" ? "check" : "copy"} />
                  <span>{copiedKey === "account" ? "Đã chép" : "Sao chép"}</span>
                </button>
              </div>

              <div className="tui-field-row">
                <div>
                  <dt>Số tiền cần chuyển</dt>
                  <dd className="is-mono is-accent">{money(owed)}</dd>
                </div>
                <button
                  type="button"
                  className={`tui-copy-btn${copiedKey === "amount" ? " is-copied" : ""}`}
                  disabled={owed === 0}
                  onClick={() => copyValue("amount", String(owed), "số tiền")}
                >
                  <Icon name={copiedKey === "amount" ? "check" : "copy"} />
                  <span>{copiedKey === "amount" ? "Đã chép" : "Sao chép"}</span>
                </button>
              </div>

              <div className="tui-field-row">
                <div>
                  <dt>Nội dung chuyển khoản (tự đối soát)</dt>
                  <dd className="is-mono">{transferNote}</dd>
                </div>
                <button
                  type="button"
                  className={`tui-copy-btn${copiedKey === "note" ? " is-copied" : ""}`}
                  onClick={() => copyValue("note", transferNote, "nội dung chuyển khoản")}
                >
                  <Icon name={copiedKey === "note" ? "check" : "copy"} />
                  <span>{copiedKey === "note" ? "Đã chép" : "Sao chép"}</span>
                </button>
              </div>
            </dl>

            <div className="tui-voucher-actions">
              {owed > 0 ? (
                <button
                  type="button"
                  className="tui-pay-btn"
                  onClick={() => {
                    setSettledExtra(owed);
                    setStatus("Đã ghi nhận giao dịch chuyển khoản minh họa");
                  }}
                >
                  <Icon name="checkCircle" />
                  <span>Xác nhận đã chuyển {money(owed)}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="tui-reset-btn"
                  onClick={() => {
                    setSettledExtra(0);
                    setStatus("Đã khôi phục trạng thái công nợ minh họa");
                  }}
                >
                  <Icon name="retry" />
                  <span>Đặt lại trạng thái minh họa</span>
                </button>
              )}
              <p className="tui-voucher-note">
                Hệ thống tự động gạch nợ trong 1–3 phút khi nhập đúng cú pháp <code>{transferNote}</code>
              </p>
            </div>
          </section>
        </aside>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
