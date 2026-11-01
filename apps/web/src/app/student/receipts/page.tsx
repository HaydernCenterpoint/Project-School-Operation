"use client";

// Motion Prompt #007, #056, #057, #060, #070, #081, #085 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/
// Unslop 9-pass redesign for /student/receipts (Sao Do University Student Portal)

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { CountUpStat } from "@/components/landing/MotionPromptEffects";
import { DemoBanner, PageTitle, Section } from "@/components/portal/Parts";
import {
  bank,
  courses,
  invoices,
  money,
  receiptRecords,
  useDemoState,
  useHydratedNow,
  type ReceiptRecord,
} from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

type FilterKind = "all" | ReceiptRecord["kind"];
type VoucherTab = "voucher" | "audit";

type ToastState = {
  id: number;
  title: string;
  detail: string;
} | null;

const DIGITS_VI = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readTriple(n: number, showZeroHundred: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const parts: string[] = [];

  if (h > 0 || showZeroHundred) {
    parts.push(`${DIGITS_VI[h]} trăm`);
  }
  if (t > 1) {
    parts.push(`${DIGITS_VI[t]} mươi`);
    if (u === 1) parts.push("mốt");
    else if (u === 5) parts.push("lăm");
    else if (u > 0) parts.push(DIGITS_VI[u]!);
  } else if (t === 1) {
    parts.push("mười");
    if (u === 5) parts.push("lăm");
    else if (u > 0) parts.push(DIGITS_VI[u]!);
  } else if (t === 0 && u > 0) {
    if (parts.length > 0) parts.push("lẻ");
    parts.push(DIGITS_VI[u]!);
  }
  return parts.join(" ");
}

/** Format integer VND into standard Vietnamese accounting words. */
function vndToWords(amount: number): string {
  if (amount <= 0) return "Không đồng";
  const millions = Math.floor(amount / 1_000_000);
  const thousands = Math.floor((amount % 1_000_000) / 1_000);
  const units = amount % 1_000;
  const chunks: string[] = [];

  if (millions > 0) {
    chunks.push(`${readTriple(millions, false)} triệu`);
  }
  if (thousands > 0) {
    chunks.push(`${readTriple(thousands, millions > 0)} nghìn`);
  }
  if (units > 0) {
    chunks.push(readTriple(units, millions > 0 || thousands > 0));
  }

  const raw = `${chunks.join(" ")} đồng chẵn`.trim();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Deterministic 17x17 verification QR matrix for electronic receipt lookup. */
function buildVerifyMatrix(seed: string): boolean[][] {
  const size = 17;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const grid: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const finder = (r0: number, c0: number) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const edge = r === 0 || r === 4 || c === 0 || c === 4;
        const center = r === 2 && c === 2;
        grid[r0 + r]![c0 + c] = edge || center;
      }
    }
  };
  finder(0, 0);
  finder(0, size - 5);
  finder(size - 5, 0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((r < 6 && c < 6) || (r < 6 && c >= size - 6) || (r >= size - 6 && c < 6)) continue;
      grid[r]![c] = (((hash >>> ((r * size + c) % 24)) ^ (r * 19 + c * 29)) & 3) !== 0;
    }
  }
  return grid;
}

export default function ReceiptsPage() {
  const { account, data } = useStudent();
  const [now] = useHydratedNow();
  const [settledExtra] = useDemoState<number>("tuition-settled", () => 0);

  const [kindFilter, setKindFilter] = useState<FilterKind>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(receiptRecords[0]!.id);
  const [voucherTab, setVoucherTab] = useState<VoucherTab>("voucher");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // Motion Prompt #070 Spinner verification overlay state
  const [verifyState, setVerifyState] = useState<"idle" | "checking" | "verified">("idle");
  // Motion Prompt #056 Toast notification
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<number>(0);

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  const studentCode =
    account.code || (data?.session.user.email?.split("@")[0]?.toUpperCase() ?? "2200286");

  // Merge live settled tuition payment from /student/tuition with canonical receipts
  const allReceipts = useMemo<ReceiptRecord[]>(() => {
    if (settledExtra <= 0) return receiptRecords;
    const liveReceipt: ReceiptRecord = {
      id: "rcp-2026-live",
      receiptNo: "PT2026/004899",
      invoiceSymbol: "1C26TAA",
      term: "Đợt 1 (2026-2027)",
      kind: "Phiếu thu trực tuyến",
      collectedAt: new Date(now).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      cashier: "Cổng thanh toán tự động PMT-EMS (VietQR 24/7)",
      method: "VietQR trực tuyến",
      transactionRef: `SDU${studentCode}-1026`,
      status: "Đã gạch nợ",
      items: [
        {
          code: "010110210301",
          description: "Thanh toán học phí Mạng máy tính & Toán rời rạc",
          credits: 6,
          amount: Math.min(settledExtra, 2_700_000),
        },
        ...(settledExtra > 2_700_000
          ? [
              {
                code: "HP-BS-2026",
                description: "Tất toán học phí & Bảo hiểm y tế còn lại HK1 2026-2027",
                credits: 3,
                amount: settledExtra - 2_700_000,
              },
            ]
          : []),
      ],
    };
    return [liveReceipt, ...receiptRecords];
  }, [settledExtra, now, studentCode]);

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allReceipts.filter((item) => {
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        item.receiptNo.toLowerCase().includes(q) ||
        item.transactionRef.toLowerCase().includes(q) ||
        item.term.toLowerCase().includes(q) ||
        item.items.some(
          (line) =>
            line.code.toLowerCase().includes(q) || line.description.toLowerCase().includes(q),
        )
      );
    });
  }, [allReceipts, kindFilter, searchQuery]);

  const selected =
    visible.find((item) => item.id === selectedId) ?? visible[0] ?? allReceipts[0]!;
  const selectedTotal = selected.items.reduce((s, line) => s + line.amount, 0);

  const totalCollected = allReceipts.reduce(
    (sum, rcp) => sum + rcp.items.reduce((s, line) => s + line.amount, 0),
    0,
  );
  const onlineReceipts = allReceipts.filter((r) => r.kind === "Phiếu thu trực tuyến");
  const summaryReceipts = allReceipts.filter((r) => r.kind === "Phiếu thu tổng hợp");
  const onlineAmount = onlineReceipts.reduce(
    (sum, r) => sum + r.items.reduce((s, line) => s + line.amount, 0),
    0,
  );
  const summaryAmount = totalCollected - onlineAmount;

  const [currentInvoice] = invoices(now);
  const currentDue = currentInvoice!.items.reduce((s, i) => s + i.amount, 0);
  const currentPaid = Math.min(currentDue, currentInvoice!.paid + settledExtra);
  const currentOwed = Math.max(0, currentDue - currentPaid);

  const filterIndex =
    kindFilter === "all" ? 0 : kindFilter === "Phiếu thu trực tuyến" ? 1 : 2;

  const verifyQrGrid = buildVerifyMatrix(
    `${selected.receiptNo}|${selected.invoiceSymbol}|${selected.transactionRef}|${selectedTotal}`,
  );

  const showToast = (title: string, detail: string) => {
    window.clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), title, detail });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  function copyText(key: string, value: string, label: string) {
    void navigator.clipboard?.writeText(value).then(
      () => {
        setCopiedKey(key);
        showToast(`Đã chép ${label}`, value);
        window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
      },
      () => showToast(`Không thể sao chép ${label}`, "Vui lòng chọn và chép thủ công"),
    );
  }

  // Motion Prompt #070 Spinner -> Check verification animation
  function triggerSignatureVerify() {
    if (verifyState === "checking") return;
    setVerifyState("checking");
    window.setTimeout(() => {
      setVerifyState("verified");
      showToast(
        "Chữ ký số hợp lệ",
        `Biên lai ${selected.receiptNo} (${selected.invoiceSymbol}) khớp sổ cái Phòng Tài chính - Kế toán`,
      );
      window.setTimeout(() => setVerifyState("idle"), 2400);
    }, 850);
  }

  return (
    <div className="rcp-page">
      <DemoBanner />
      <PageTitle
        title="Phiếu thu trực tuyến & Phiếu thu tổng hợp"
        lead={`Lưu trữ biên lai điện tử toàn khóa · Mã SV ${studentCode} · Chuẩn hóa đơn điện tử Nghị định 123/2020/NĐ-CP`}
      >
        <div className="rcp-title-controls">
          {/* Motion Prompt #060 Segmented control with 3 segments */}
          <div className="rcp-seg" role="tablist" aria-label="Loại phiếu thu">
            <span
              className="rcp-seg-indicator"
              style={{ transform: `translate3d(${filterIndex * 100}%, 0, 0)` }}
              aria-hidden="true"
            />
            <button
              type="button"
              role="tab"
              aria-selected={kindFilter === "all"}
              className={kindFilter === "all" ? "is-active" : ""}
              onClick={() => setKindFilter("all")}
            >
              <span>Tất cả</span>
              <code>{allReceipts.length}</code>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={kindFilter === "Phiếu thu trực tuyến"}
              className={kindFilter === "Phiếu thu trực tuyến" ? "is-active" : ""}
              onClick={() => setKindFilter("Phiếu thu trực tuyến")}
            >
              <span>Trực tuyến</span>
              <code>{onlineReceipts.length}</code>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={kindFilter === "Phiếu thu tổng hợp"}
              className={kindFilter === "Phiếu thu tổng hợp" ? "is-active" : ""}
              onClick={() => setKindFilter("Phiếu thu tổng hợp")}
            >
              <span>Tổng hợp</span>
              <code>{summaryReceipts.length}</code>
            </button>
          </div>

          <Link href="/student/tuition" className="button button-outline button-small">
            <Icon name="wallet" /> {currentOwed > 0 ? `Còn nợ ${money(currentOwed)}` : "Công nợ 0 đ"}
          </Link>
        </div>
      </PageTitle>

      {/* Top overview: Asymmetric 2-card rhythm (Total settled + channel breakdown vs Term bar chart) */}
      <div className="rcp-overview">
        <section className="reg-quota-card rcp-summary-card" aria-label="Tổng hợp biên lai đã thu">
          <div className="reg-quota-head">
            <div>
              <span className="reg-label">Tổng tiền đã thu có biên lai điện tử</span>
              <p className="reg-figure">
                <strong>
                  <CountUpStat rawText={money(totalCollected)} showBar={false} />
                </strong>
                <span>· {allReceipts.length} phiếu thu</span>
              </p>
            </div>
            <span className="reg-standing good">100% đã ký số & gạch nợ</span>
          </div>

          <div className="tui-split-bar" aria-hidden="true">
            <span
              className="tui-split-seg is-online"
              style={{ flex: Math.max(1, onlineAmount) }}
              title={`Phiếu thu trực tuyến: ${money(onlineAmount)}`}
            />
            <span
              className="tui-split-seg is-tuition"
              style={{ flex: Math.max(1, summaryAmount) }}
              title={`Phiếu thu tổng hợp: ${money(summaryAmount)}`}
            />
          </div>

          <div className="reg-quota-foot">
            <span>
              <i className="tui-legend-dot is-online" aria-hidden="true" />
              VietQR trực tuyến ({onlineReceipts.length}): <strong>{money(onlineAmount)}</strong>
            </span>
            <span>
              <i className="tui-legend-dot is-tuition" aria-hidden="true" />
              Phiếu tổng hợp ({summaryReceipts.length}): <strong>{money(summaryAmount)}</strong>
            </span>
          </div>
        </section>

        <section className="tui-stat-card rcp-term-chart-card" aria-label="Biểu đồ thu theo đợt học">
          <div className="tui-stat-head">
            <span className="reg-label">Phân bổ theo biên lai</span>
            <code>Đơn vị: VNĐ</code>
          </div>
          <ul className="rcp-mini-bars">
            {allReceipts.map((rcp) => {
              const sum = rcp.items.reduce((s, i) => s + i.amount, 0);
              const pct = Math.min(100, Math.round((sum / 7_500_000) * 100));
              const isSelected = rcp.id === selected.id;
              return (
                <li
                  key={rcp.id}
                  className={`rcp-mini-bar-row${isSelected ? " is-active" : ""}`}
                  onClick={() => setSelectedId(rcp.id)}
                >
                  <div className="rcp-mini-bar-top">
                    <code>{rcp.receiptNo}</code>
                    <span>{rcp.term}</span>
                    <strong>{money(sum)}</strong>
                  </div>
                  <div className="rcp-mini-bar-track" aria-hidden="true">
                    <span
                      className={rcp.kind === "Phiếu thu trực tuyến" ? "is-online" : "is-summary"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Main Master-Detail Split: Left receipt list & table, Right Official Electronic Voucher (The Moment) */}
      <div className="rcp-workspace">
        <div className="rcp-main">
          <Section
            title="Danh sách phiếu thu điện tử"
            action={
              <div className="rcp-search-box">
                <Icon name="search" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm số phiếu, mã GD, môn học"
                  aria-label="Tìm phiếu thu"
                />
              </div>
            }
          >
            {/* Interactive Receipt Cards (#081 Hover lift) */}
            <div className="rcp-card-list" role="listbox" aria-label="Chọn biên lai để xem chi tiết">
              {visible.map((rcp) => {
                const sum = rcp.items.reduce((s, i) => s + i.amount, 0);
                const isCurrent = rcp.id === selected.id;
                const isOnline = rcp.kind === "Phiếu thu trực tuyến";
                return (
                  <article
                    key={rcp.id}
                    role="option"
                    aria-selected={isCurrent}
                    tabIndex={0}
                    className={`rcp-item-card${isCurrent ? " is-selected" : ""}`}
                    onClick={() => setSelectedId(rcp.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(rcp.id);
                      }
                    }}
                  >
                    <div className="rcp-item-head">
                      <div className="rcp-item-id">
                        <code>{rcp.receiptNo}</code>
                        <span className="rcp-symbol-tag">KH: {rcp.invoiceSymbol}</span>
                      </div>
                      <span className={`rcp-kind-badge ${isOnline ? "is-online" : "is-summary"}`}>
                        <i aria-hidden="true" />
                        {rcp.kind}
                      </span>
                    </div>

                    <div className="rcp-item-body">
                      <div>
                        <h4>{rcp.term}</h4>
                        <p>
                          {rcp.items.length} khoản thu · {rcp.method} · {rcp.collectedAt}
                        </p>
                      </div>
                      <div className="rcp-item-amount">
                        <strong>{money(sum)}</strong>
                        <span>{rcp.status}</span>
                      </div>
                    </div>

                    <div className="rcp-item-foot">
                      <span className="rcp-item-ref">
                        Mã đối soát: <code>{rcp.transactionRef}</code>
                      </span>
                      <span className="rcp-item-cta">
                        {isCurrent ? "Đang mở bên phải" : "Xem chứng từ"} <Icon name="chevron" />
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Structured accounting table below cards */}
            <div className="ad-table-wrap rcp-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th scope="col">Số phiếu</th>
                    <th scope="col">Ký hiệu</th>
                    <th scope="col">Đợt học</th>
                    <th scope="col">Ngày thu</th>
                    <th scope="col">Hình thức</th>
                    <th scope="col" className="ad-actions">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((rcp) => {
                    const sum = rcp.items.reduce((s, i) => s + i.amount, 0);
                    const isCurrent = rcp.id === selected.id;
                    return (
                      <tr
                        key={rcp.id}
                        className={`rcp-table-row${isCurrent ? " is-current-row" : ""}`}
                        onClick={() => setSelectedId(rcp.id)}
                      >
                        <td className="ad-code">{rcp.receiptNo}</td>
                        <td className="ad-code">{rcp.invoiceSymbol}</td>
                        <td>{rcp.term}</td>
                        <td className="ad-code">{rcp.collectedAt}</td>
                        <td>{rcp.method}</td>
                        <td className="ad-actions ad-code">
                          <strong>{money(sum)}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        {/* Right column: Rendered Official Electronic Receipt Voucher (The Moment) */}
        <aside className="rcp-side">
          <section className="rcp-voucher" aria-label={`Chứng từ biên lai ${selected.receiptNo}`}>
            {/* Motion Prompt #070 Spinner overlay during signature check */}
            {verifyState !== "idle" && (
              <div className="rcp-verify-scrim" role="status" aria-live="polite">
                {verifyState === "checking" ? (
                  <div className="rcp-verify-box">
                    <span className="rcp-spinner-arc" aria-hidden="true" />
                    <strong>Đang kiểm tra chữ ký số SHA-256...</strong>
                    <span>Đối chiếu sổ cái Phòng Tài chính - Kế toán</span>
                  </div>
                ) : (
                  <div className="rcp-verify-box is-done">
                    <span className="rcp-verify-check" aria-hidden="true">
                      <Icon name="check" />
                    </span>
                    <strong>Chứng từ điện tử hợp lệ</strong>
                    <span>Số phiếu {selected.receiptNo} · Đã gạch nợ 100%</span>
                  </div>
                )}
              </div>
            )}

            {/* Motion Prompt #057 Tabs with sliding underline */}
            <div className="rcp-voucher-tabs" role="tablist" aria-label="Chế độ xem chứng từ">
              <button
                type="button"
                role="tab"
                aria-selected={voucherTab === "voucher"}
                className={voucherTab === "voucher" ? "is-active" : ""}
                onClick={() => setVoucherTab("voucher")}
              >
                Bản thể hiện biên lai
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={voucherTab === "audit"}
                className={voucherTab === "audit" ? "is-active" : ""}
                onClick={() => setVoucherTab("audit")}
              >
                Chuỗi xác thực & Chữ ký số
              </button>
              <span
                className="rcp-tab-underline"
                style={{ transform: `translate3d(${voucherTab === "voucher" ? "0%" : "100%"}, 0, 0)` }}
                aria-hidden="true"
              />
            </div>

            {voucherTab === "voucher" ? (
              <div key="voucher-view" className="rcp-tab-panel">
                <header className="rcp-doc-header">
                  <div className="rcp-doc-org">
                    <img src="/sao-do-logo.png" alt="SDU" width={32} height={36} />
                    <div>
                      <span className="rcp-doc-ministry">BỘ CÔNG THƯƠNG</span>
                      <strong>TRƯỜNG ĐẠI HỌC SAO ĐỎ</strong>
                      <small>Số 24 Nguyễn Trãi, P. Sao Đỏ, TP. Chí Linh, Hải Dương</small>
                    </div>
                  </div>
                  <div className="rcp-doc-serial">
                    <span>Mẫu số: 01/TT-SDU</span>
                    <span>
                      Ký hiệu: <code>{selected.invoiceSymbol}</code>
                    </span>
                    <span>
                      Số: <strong className="is-red">{selected.receiptNo}</strong>
                    </span>
                  </div>
                </header>

                <div className="rcp-doc-title">
                  <h3>BIÊN LAI THU TIỀN ĐIỆN TỬ</h3>
                  <span>({selected.kind} · Bản thể hiện của biên lai điện tử)</span>
                  <small>Ngày lập: {selected.collectedAt}</small>
                </div>

                <dl className="rcp-doc-payer">
                  <div>
                    <dt>Họ và tên người nộp</dt>
                    <dd>{account.displayName}</dd>
                  </div>
                  <div>
                    <dt>Mã số sinh viên</dt>
                    <dd className="is-mono">{studentCode}</dd>
                  </div>
                  <div>
                    <dt>Lớp / Khoa quản lý</dt>
                    <dd>
                      {account.cohortClass} · {account.department}
                    </dd>
                  </div>
                  <div>
                    <dt>Đợt học / Học kỳ</dt>
                    <dd>{selected.term}</dd>
                  </div>
                  <div>
                    <dt>Hình thức thanh toán</dt>
                    <dd>
                      {selected.method} · Mã GD <code>{selected.transactionRef}</code>
                    </dd>
                  </div>
                </dl>

                <table className="rcp-doc-table">
                  <thead>
                    <tr>
                      <th scope="col">STT</th>
                      <th scope="col">Nội dung khoản thu</th>
                      <th scope="col" className="is-num">TC</th>
                      <th scope="col" className="is-num">Số tiền (₫)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((line, idx) => (
                      <tr key={line.code}>
                        <td className="is-mono">{idx + 1}</td>
                        <td>
                          <strong>{line.description}</strong>
                          <small className="is-mono">Mã: {line.code}</small>
                        </td>
                        <td className="is-num is-mono">{line.credits ?? "—"}</td>
                        <td className="is-num is-mono">{money(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="rcp-doc-total-row">
                      <th scope="row" colSpan={3}>Tổng cộng tiền thu</th>
                      <td className="is-num is-mono">{money(selectedTotal)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="rcp-doc-words">
                  <span>Số tiền viết bằng chữ:</span>
                  <strong>{vndToWords(selectedTotal)}</strong>
                </div>

                <div className="rcp-doc-stamp-row">
                  <div className="rcp-doc-qr">
                    <div className="rcp-doc-qr-box" aria-hidden="true">
                      <svg viewBox="0 0 17 17" shapeRendering="crispEdges">
                        {verifyQrGrid.map((row, r) =>
                          row.map((cell, c) =>
                            cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} /> : null,
                          ),
                        )}
                      </svg>
                    </div>
                    <div>
                      <span>Mã tra cứu biên lai</span>
                      <code>{selected.transactionRef}</code>
                      <small>Quét QR để đối chiếu bản gốc</small>
                    </div>
                  </div>

                  <div className="rcp-digital-seal" aria-label="Con dấu xác nhận đã thu tiền">
                    <span className="rcp-seal-title">ĐÃ KÝ SỐ & GẠCH NỢ</span>
                    <strong>TRƯỜNG ĐẠI HỌC SAO ĐỎ</strong>
                    <small>{selected.collectedAt.split(" ")[0]}</small>
                  </div>
                </div>
              </div>
            ) : (
              <div key="audit-view" className="rcp-tab-panel rcp-audit-panel">
                <div className="rcp-audit-head">
                  <span className="rcp-audit-status">
                    <i aria-hidden="true" /> Chứng thư số công cộng hợp lệ (SHA-256 / RSA-2048)
                  </span>
                  <p>
                    Biên lai điện tử được khởi tạo và ký số tự động bởi Hệ thống Quản lý Tài chính
                    Sinh viên PMT-EMS của Trường Đại học Sao Đỏ.
                  </p>
                </div>

                <dl className="tui-voucher-fields">
                  <div className="tui-field-row">
                    <div>
                      <dt>Đơn vị ký phát hành</dt>
                      <dd>TRƯỜNG ĐẠI HỌC SAO ĐỎ · MST 0800289312</dd>
                    </div>
                  </div>
                  <div className="tui-field-row">
                    <div>
                      <dt>Thu ngân / Cổng gạch nợ</dt>
                      <dd>{selected.cashier}</dd>
                    </div>
                  </div>
                  <div className="tui-field-row">
                    <div>
                      <dt>Tài khoản ngân hàng nhận</dt>
                      <dd className="is-mono">
                        {bank.shortName} · {bank.account}
                      </dd>
                    </div>
                  </div>
                  <div className="tui-field-row">
                    <div>
                      <dt>Mã giao dịch tham chiếu</dt>
                      <dd className="is-mono">{selected.transactionRef}</dd>
                    </div>
                    <button
                      type="button"
                      className={`tui-copy-btn${copiedKey === "ref" ? " is-copied" : ""}`}
                      onClick={() => copyText("ref", selected.transactionRef, "mã giao dịch")}
                    >
                      <Icon name={copiedKey === "ref" ? "check" : "copy"} />
                      <span>{copiedKey === "ref" ? "Đã chép" : "Sao chép"}</span>
                    </button>
                  </div>
                  <div className="tui-field-row">
                    <div>
                      <dt>Mã băm chứng từ (Digest)</dt>
                      <dd className="is-mono">
                        SHA256:{selected.id.toUpperCase()}-{selected.invoiceSymbol}-9F4A2C8E
                      </dd>
                    </div>
                  </div>
                </dl>

                <div className="rcp-courses-sync">
                  <span className="reg-label">Đối chiếu lộ trình học phần ({courses.length} HP kỳ hiện tại)</span>
                  <p>
                    Dữ liệu phiếu thu được đồng bộ trực tiếp với bảng kê đăng ký tín chỉ và tự động
                    mở khóa danh sách dự thi kết thúc học phần.
                  </p>
                </div>
              </div>
            )}

            <div className="rcp-voucher-actions">
              <button
                type="button"
                className="tui-copy-btn rcp-action-btn"
                onClick={triggerSignatureVerify}
              >
                <Icon name="shield" />
                <span>Xác thực chữ ký số</span>
              </button>
              <button
                type="button"
                className="tui-copy-btn rcp-action-btn"
                onClick={() => copyText("no", selected.receiptNo, "số phiếu thu")}
              >
                <Icon name={copiedKey === "no" ? "check" : "copy"} />
                <span>{copiedKey === "no" ? "Đã chép số phiếu" : "Chép mã phiếu"}</span>
              </button>
              <button
                type="button"
                className="tui-pay-btn rcp-print-btn"
                onClick={() => {
                  showToast("Đang mở hộp thoại in PDF", `Biên lai ${selected.receiptNo}`);
                  window.print();
                }}
              >
                <Icon name="file" />
                <span>In / Tải PDF</span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* Motion Prompt #056 Toast notification */}
      {toast && (
        <div key={toast.id} className="mp-toast" role="status" aria-live="polite">
          <span className="mp-toast-icon" aria-hidden="true">
            <Icon name="check" />
          </span>
          <div className="mp-toast-body">
            <strong>{toast.title}</strong>
            <span>{toast.detail}</span>
          </div>
          <button
            type="button"
            className="mp-toast-close"
            aria-label="Đóng thông báo"
            onClick={() => setToast(null)}
          >
            <Icon name="close" />
          </button>
          <span className="mp-toast-bar" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
