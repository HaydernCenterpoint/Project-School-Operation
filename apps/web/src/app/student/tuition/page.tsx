"use client";

// Motion Prompt #007, #056, #060, #068, #085, #160 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/
// Unslop 9-pass redesign for /student/tuition (Sao Do University Student Portal)

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Icon } from "@/components/Icon";
import { CountUpStat } from "@/components/landing/MotionPromptEffects";
import { countdown, daysUntil, DemoBanner, PageTitle, Section } from "@/components/portal/Parts";
import {
  bank,
  clock,
  courses,
  invoices,
  longDay,
  money,
  payments,
  receiptRecords,
  useDemoState,
  useHydratedNow,
} from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

const perCredit = 450_000;
const qrSize = 21;

type ViewScope = "current" | "history";
type PayPreset = "full" | "half" | "bhyt";

type RippleCircle = {
  id: number;
  x: number;
  y: number;
  maxR: number;
};

type ToastState = {
  id: number;
  title: string;
  detail: string;
} | null;

/** Deterministic 21x21 QR matrix seeded from the VietQR transfer payload. */
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

const TERM_HISTORY = [
  { term: "HK1 2024-2025", credits: 17, billed: 7_650_000, discount: 0, paid: 7_650_000, receiptNo: "PT2024/006120" },
  { term: "HK2 2024-2025", credits: 19, billed: 8_550_000, discount: 500_000, paid: 8_050_000, receiptNo: "PT2025/002104" },
  { term: "HK1 2025-2026", credits: 16, billed: 7_200_000, discount: 0, paid: 7_200_000, receiptNo: "PT2025/008341" },
  { term: "HK2 2025-2026", credits: 13, billed: 5_850_000, discount: 0, paid: 5_850_000, receiptNo: "PT2026/001905" },
];

export default function TuitionPage() {
  const { data, account } = useStudent();
  const [now] = useHydratedNow();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [settledExtra, setSettledExtra] = useDemoState<number>("tuition-settled", () => 0);
  const [viewScope, setViewScope] = useState<ViewScope>("current");
  const [payPreset, setPayPreset] = useState<PayPreset>("full");
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(null);
  // Motion Prompt #160 Loading button state: idle -> loading -> done
  const [payPhase, setPayPhase] = useState<"idle" | "loading" | "done">("idle");
  // Motion Prompt #085 Ink ripple circles
  const [ripples, setRipples] = useState<RippleCircle[]>([]);
  // Motion Prompt #056 Toast notification state
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<number>(0);

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  if (!data) return null;

  const [current] = invoices(now);
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  const tuitionGross = totalCredits * perCredit;
  const healthInsurance = 680_400;
  const policyDiscount = 1_000_000;
  const due = current!.items.reduce((sum, item) => sum + item.amount, 0);
  const paidTotal = Math.min(due, current!.paid + settledExtra);
  const owed = Math.max(0, due - paidTotal);
  const paidPct = due > 0 ? Math.min(100, Math.round((paidTotal / due) * 100)) : 100;

  const studentCode = account.code || (data.session.user.email?.split("@")[0]?.toUpperCase() ?? "2200286");
  const rawAccount = bank.account.replace(/\s+/g, "");
  const days = daysUntil(current!.due, now);

  const presetAmount =
    owed === 0
      ? 0
      : payPreset === "half"
        ? Math.ceil(owed / 2 / 1000) * 1000
        : payPreset === "bhyt"
          ? Math.min(owed, healthInsurance)
          : owed;

  const transferSuffix = payPreset === "bhyt" ? "BHYT" : current!.term.replace(/\s+/g, " ");
  const transferNote = `SDU ${studentCode} ${transferSuffix}`;
  const qrGrid = buildQrMatrix(`${bank.bin}|${rawAccount}|${presetAmount}|${transferNote}`);

  // Motion Prompt #068 Step indicator (0..3)
  const currentStep = owed === 0 ? 3 : payPhase === "loading" ? 2 : paidTotal > 0 ? 1 : 0;
  const stepItems = [
    { index: 1, label: "Chốt bảng kê", meta: `${totalCredits} tín chỉ · ${courses.length} HP` },
    { index: 2, label: "Quét VietQR", meta: owed > 0 ? `Cần nộp ${money(presetAmount)}` : "Đã đủ" },
    { index: 3, label: "Đối soát tự động", meta: payPhase === "loading" ? "Đang xác thực NAPAS..." : "1–3 phút qua PMT-EMS" },
    { index: 4, label: "Xuất phiếu thu", meta: owed === 0 ? "Hoàn tất 100%" : `Đã cấp ${receiptRecords.length} phiếu` },
  ];

  const allPayments = [
    ...(settledExtra > 0
      ? [
          {
            at: new Date(now).toISOString(),
            amount: settledExtra,
            method: "VietQR trực tuyến",
            reference: `SDU${studentCode}-1026`,
            receiptNo: "PT2026/004899",
          },
        ]
      : []),
    ...payments(now).map((p, idx) => ({
      ...p,
      receiptNo: receiptRecords[idx]?.receiptNo ?? `PT2026/00481${idx + 2}`,
    })),
  ];

  const showToast = (title: string, detail: string) => {
    window.clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), title, detail });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  function copyValue(key: string, value: string, label: string) {
    void navigator.clipboard?.writeText(value).then(
      () => {
        setCopiedKey(key);
        showToast(`Đã chép ${label}`, value);
        window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
      },
      () => showToast(`Không thể sao chép ${label}`, "Vui lòng chọn và chép thủ công"),
    );
  }

  // Motion Prompt #085 + #160: Click ink ripple & shrink-spin-check button sequence
  function handleConfirmPayment(e: MouseEvent<HTMLButtonElement>) {
    if (owed <= 0 || payPhase !== "idle") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const maxR = Math.max(
      Math.hypot(x, y),
      Math.hypot(rect.width - x, y),
      Math.hypot(x, rect.height - y),
      Math.hypot(rect.width - x, rect.height - y),
    );
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y, maxR }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((item) => item.id !== id));
    }, 650);

    const amountToSettle = presetAmount;
    setPayPhase("loading");
    window.setTimeout(() => {
      setPayPhase("done");
      setSettledExtra((prev) => prev + amountToSettle);
      showToast(
        "Đối soát giao dịch thành công",
        `Đã gạch nợ ${money(amountToSettle)} · Mã GD SDU${studentCode}-1026`,
      );
      window.setTimeout(() => {
        setPayPhase("idle");
      }, 1100);
    }, 950);
  }

  const allTermsRows = [
    {
      term: `${current!.term} (Hiện tại)`,
      credits: totalCredits,
      billed: tuitionGross + healthInsurance,
      discount: policyDiscount,
      paid: paidTotal,
      receiptNo: settledExtra > 0 ? "PT2026/004899" : "PT2026/004812",
      owed,
    },
    ...TERM_HISTORY.map((row) => ({ ...row, owed: 0 })),
  ];

  const totalCareerBilled = allTermsRows.reduce((s, r) => s + r.billed - r.discount, 0);
  const totalCareerPaid = allTermsRows.reduce((s, r) => s + r.paid, 0);

  return (
    <div className="tui">
      <DemoBanner />
      <PageTitle
        title="Học phí & Công nợ"
        lead={`Kỳ thu hiện tại: ${current!.term} · Mã SV ${studentCode} · Đơn vị tính: Đồng Việt Nam (₫)`}
      >
        <div className="tui-title-controls">
          {/* Motion Prompt #060 Segmented control */}
          <div className="tui-seg" role="tablist" aria-label="Phạm vi tra cứu học phí">
            <span
              className="tui-seg-indicator"
              style={{ transform: `translate3d(${viewScope === "current" ? "0%" : "100%"}, 0, 0)` }}
              aria-hidden="true"
            />
            <button
              type="button"
              role="tab"
              aria-selected={viewScope === "current"}
              className={viewScope === "current" ? "is-active" : ""}
              onClick={() => setViewScope("current")}
            >
              <span>Kỳ hiện tại</span>
              <code>{current!.term}</code>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewScope === "history"}
              className={viewScope === "history" ? "is-active" : ""}
              onClick={() => setViewScope("history")}
            >
              <span>Toàn khóa</span>
              <code>5 học kỳ</code>
            </button>
          </div>

          <Link href="/student/receipts" className="button button-outline button-small">
            <Icon name="file" /> Phiếu thu điện tử ({receiptRecords.length})
          </Link>
        </div>
      </PageTitle>

      {/* Motion Prompt #068 Step indicator: 4-step tuition settlement progress */}
      <section className="tui-stepper-card" aria-label="Quy trình gạch nợ học phí">
        <div className="tui-stepper-head">
          <div className="tui-stepper-title">
            <span className={`reg-window-dot ${owed === 0 ? "is-settled" : "is-active"}`} aria-hidden="true" />
            <strong>
              {owed === 0
                ? "Đã hoàn thành nghĩa vụ học phí HK1 2026-2027"
                : `Đang mở cổng thu học phí · Hạn ${new Date(current!.due).toLocaleDateString("vi-VN")} (${countdown(current!.due, now)})`}
            </strong>
          </div>
          <span className="tui-stepper-badge">
            Bước {Math.min(4, currentStep + 1)}/4 · {stepItems[Math.min(3, currentStep)]!.label}
          </span>
        </div>

        <div className="tui-stepper-track-wrap">
          <div className="tui-stepper-line" aria-hidden="true">
            <span
              className="tui-stepper-line-fill"
              style={{ transform: `scaleX(${(currentStep / 3).toFixed(3)})` }}
            />
          </div>
          <ol className="tui-stepper-list">
            {stepItems.map((step, idx) => {
              const isDone = idx < currentStep || (currentStep === 3 && idx === 3);
              const isCurrent = idx === currentStep && currentStep < 3;
              return (
                <li
                  key={step.index}
                  className={`tui-step-node${isDone ? " is-done" : ""}${isCurrent ? " is-current" : ""}`}
                >
                  <span className="tui-step-circle" aria-hidden="true">
                    {isDone ? <Icon name="check" /> : step.index}
                  </span>
                  <div className="tui-step-copy">
                    <strong>{step.label}</strong>
                    <span>{step.meta}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Top settlement progress & visual composition breakdown */}
      <div className="tui-overview">
        <section className="reg-quota-card tui-quota-card" aria-label="Tiến độ hoàn thành học phí">
          <div className="reg-quota-head">
            <div>
              <span className="reg-label">
                {viewScope === "current" ? `Còn phải nộp · ${current!.term}` : "Tổng học phí đã thanh toán toàn khóa"}
              </span>
              <p className="reg-figure">
                <strong>
                  <CountUpStat
                    rawText={money(viewScope === "current" ? owed : totalCareerPaid)}
                    showBar={false}
                  />
                </strong>
                <span>/ {money(viewScope === "current" ? due : totalCareerBilled)}</span>
              </p>
            </div>
            <span className={`reg-standing ${owed === 0 ? "good" : days <= 7 ? "danger" : "warn"}`}>
              {owed === 0 ? "Đã gạch nợ 100%" : `Đã nộp ${paidPct}% · ${countdown(current!.due, now)}`}
            </span>
          </div>

          {/* Stacked visual bar: Paid vs Remaining */}
          <div className="tui-visual-bar-wrap">
            <div
              className="reg-meter tui-meter-tall"
              role="progressbar"
              aria-label="Tỷ lệ học phí đã nộp"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={paidPct}
            >
              <span className="tui-meter-paid" style={{ width: `${paidPct}%` }} />
            </div>
            <div className="tui-bar-ticks" aria-hidden="true">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="reg-quota-foot">
            <span>
              <i className="tui-dot-paid" aria-hidden="true" />
              Đã đối soát: <strong>{money(paidTotal)}</strong>
            </span>
            <span>
              <i className="tui-dot-owed" aria-hidden="true" />
              Còn phải nộp: <strong>{money(owed)}</strong>
            </span>
            <span className="reg-quota-min">Đơn giá: {money(perCredit)} / tín chỉ</span>
          </div>
        </section>

        <section className="tui-stat-card" aria-label="Cơ cấu khoản thu học kỳ">
          <div className="tui-stat-head">
            <span className="reg-label">Cơ cấu phải thu · {current!.term}</span>
            <code>{totalCredits} tín chỉ</code>
          </div>

          {/* Proportional stacked bar showing Tuition vs BHYT vs Discount */}
          <div className="tui-split-bar" aria-hidden="true">
            <span
              className="tui-split-seg is-tuition"
              style={{ flex: tuitionGross }}
              title={`Học phí tín chỉ: ${money(tuitionGross)}`}
            />
            <span
              className="tui-split-seg is-bhyt"
              style={{ flex: healthInsurance }}
              title={`Bảo hiểm y tế: ${money(healthInsurance)}`}
            />
          </div>

          <dl className="tui-stat-list">
            <div>
              <dt>
                <span className="tui-legend-dot is-tuition" aria-hidden="true" />
                Học phí ({totalCredits} TC × {money(perCredit)})
              </dt>
              <dd>{money(tuitionGross)}</dd>
            </div>
            <div>
              <dt>
                <span className="tui-legend-dot is-bhyt" aria-hidden="true" />
                Bảo hiểm y tế bắt buộc (12 tháng)
              </dt>
              <dd>{money(healthInsurance)}</dd>
            </div>
            <div>
              <dt>
                <span className="tui-legend-dot is-discount" aria-hidden="true" />
                Miễn giảm chính sách
              </dt>
              <dd className="is-discount">{money(-policyDiscount)}</dd>
            </div>
            <div className="tui-stat-net">
              <dt>Thực thu học kỳ</dt>
              <dd>{money(due)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Asymmetric split: Left itemized ledger + history, Right VietQR payment voucher */}
      <div className="tui-workspace">
        <div className="tui-main">
          {viewScope === "current" ? (
            <Section
              title={`Bảng kê học phần & khoản thu · ${current!.term}`}
              action={
                <span className="reg-table-meta">
                  {courses.length} học phần · Bấm vào dòng để xem tỷ trọng
                </span>
              }
            >
              <div className="tui-table-wrap">
                <table className="tui-ledger-table">
                  <thead>
                    <tr>
                      <th scope="col">Mã HP</th>
                      <th scope="col">Nội dung khoản thu</th>
                      <th scope="col" className="is-num">Tín chỉ</th>
                      <th scope="col" className="is-num">Tỷ trọng</th>
                      <th scope="col" className="is-num">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => {
                      const amount = course.credits * perCredit;
                      const sharePct = Math.round((amount / (tuitionGross + healthInsurance)) * 100);
                      const isSelected = selectedCourseCode === course.code;
                      return (
                        <tr
                          key={course.code}
                          className={`tui-interactive-row${isSelected ? " is-selected" : ""}`}
                          onClick={() =>
                            setSelectedCourseCode((prev) => (prev === course.code ? null : course.code))
                          }
                        >
                          <td className="is-code">{course.code}</td>
                          <td>
                            <strong>{course.name}</strong>
                            <small>{course.lecturer}</small>
                          </td>
                          <td className="is-num is-mono">{course.credits}</td>
                          <td className="is-num">
                            <div className="tui-row-share">
                              <span className="tui-row-share-bar" aria-hidden="true">
                                <i style={{ width: `${Math.min(100, sharePct * 3)}%` }} />
                              </span>
                              <code className="is-mono">{sharePct}%</code>
                            </div>
                          </td>
                          <td className="is-num is-mono">{money(amount)}</td>
                        </tr>
                      );
                    })}
                    <tr
                      className={`tui-interactive-row${selectedCourseCode === "BHYT" ? " is-selected" : ""}`}
                      onClick={() => setSelectedCourseCode((prev) => (prev === "BHYT" ? null : "BHYT"))}
                    >
                      <td className="is-code">BHYT</td>
                      <td>
                        <strong>Bảo hiểm y tế sinh viên năm 2026</strong>
                        <small>Thu theo năm học (12 tháng · Trung tâm Y tế TP. Chí Linh)</small>
                      </td>
                      <td className="is-num is-mono">—</td>
                      <td className="is-num">
                        <div className="tui-row-share">
                          <span className="tui-row-share-bar is-bhyt" aria-hidden="true">
                            <i style={{ width: "28%" }} />
                          </span>
                          <code className="is-mono">9%</code>
                        </div>
                      </td>
                      <td className="is-num is-mono">{money(healthInsurance)}</td>
                    </tr>
                    <tr className="is-discount-row">
                      <td className="is-code">MG01</td>
                      <td>
                        <strong>Miễn giảm theo chính sách</strong>
                        <small>Hỗ trợ học phí theo quy định hiện hành</small>
                      </td>
                      <td className="is-num is-mono">—</td>
                      <td className="is-num is-mono">—</td>
                      <td className="is-num is-mono is-discount">{money(-policyDiscount)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row" colSpan={4}>Tổng phải nộp học kỳ</th>
                      <td className="is-num is-mono">{money(due)}</td>
                    </tr>
                    <tr>
                      <th scope="row" colSpan={4}>Đã nộp và gạch nợ</th>
                      <td className="is-num is-mono is-discount">{money(-paidTotal)}</td>
                    </tr>
                    <tr className="is-balance-row">
                      <th scope="row" colSpan={4}>Số tiền còn phải nộp</th>
                      <td className="is-num is-mono">{money(owed)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Section>
          ) : (
            <Section
              title="Tổng hợp công nợ & thanh toán toàn khóa (2024 – 2027)"
              action={<span className="reg-table-meta">{allTermsRows.length} học kỳ</span>}
            >
              <div className="tui-table-wrap">
                <table className="tui-ledger-table">
                  <thead>
                    <tr>
                      <th scope="col">Học kỳ</th>
                      <th scope="col" className="is-num">Tín chỉ</th>
                      <th scope="col" className="is-num">Phải thu</th>
                      <th scope="col" className="is-num">Miễn giảm</th>
                      <th scope="col" className="is-num">Đã nộp</th>
                      <th scope="col" className="is-num">Còn nợ</th>
                      <th scope="col">Phiếu thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTermsRows.map((row) => (
                      <tr key={row.term}>
                        <td>
                          <strong>{row.term}</strong>
                        </td>
                        <td className="is-num is-mono">{row.credits}</td>
                        <td className="is-num is-mono">{money(row.billed)}</td>
                        <td className="is-num is-mono is-discount">
                          {row.discount > 0 ? money(-row.discount) : "0 đ"}
                        </td>
                        <td className="is-num is-mono">{money(row.paid)}</td>
                        <td className={`is-num is-mono ${row.owed > 0 ? "is-owed-cell" : ""}`}>
                          {money(row.owed)}
                        </td>
                        <td className="is-code">
                          <Link href="/student/receipts" className="tui-receipt-link">
                            {row.receiptNo}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="is-balance-row">
                      <th scope="row">Tổng lũy kế 5 học kỳ</th>
                      <td className="is-num is-mono">
                        {allTermsRows.reduce((s, r) => s + r.credits, 0)}
                      </td>
                      <td className="is-num is-mono">{money(totalCareerBilled + 1_500_000)}</td>
                      <td className="is-num is-mono is-discount">{money(-1_500_000)}</td>
                      <td className="is-num is-mono">{money(totalCareerPaid)}</td>
                      <td className="is-num is-mono">{money(owed)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Section>
          )}

          <Section
            title="Lịch sử giao dịch & Biên lai đối soát"
            action={
              <Link href="/student/receipts" className="tui-section-link">
                <span>Mở kho phiếu thu điện tử</span>
                <Icon name="arrow" />
              </Link>
            }
          >
            <ul className="tui-receipt-list">
              {allPayments.map((item) => (
                <li key={item.reference} className="tui-receipt-row">
                  <div className="tui-receipt-code">
                    <code>{item.reference}</code>
                    <span>
                      {clock(item.at)} · {longDay(item.at)}
                    </span>
                  </div>
                  <div className="tui-receipt-method">
                    <strong>{item.method}</strong>
                    <span className="tui-verified">
                      <i aria-hidden="true" /> Đã đối soát tự động · Phiếu {item.receiptNo}
                    </span>
                  </div>
                  <div className="tui-receipt-amount">
                    <strong>{money(item.amount)}</strong>
                    <Link href="/student/receipts" className="tui-mini-receipt-btn">
                      Xem biên lai
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Right column: VietQR Payment Voucher (The Moment) */}
        <aside className="tui-side">
          <section className="tui-voucher" aria-label="Phiếu chuyển khoản học phí VietQR">
            <header className="tui-voucher-head">
              <div>
                <span className="tui-voucher-kicker">
                  <i aria-hidden="true" /> Lệnh thanh toán tự động NAPAS 247
                </span>
                <h3>Phiếu chuyển khoản VietQR</h3>
              </div>
              <code className="tui-bank-badge">{bank.shortName}</code>
            </header>

            {owed > 0 && (
              <div className="tui-preset-group" role="group" aria-label="Chọn mức thanh toán">
                <span className="tui-preset-label">Mức tạo mã QR</span>
                <div className="tui-preset-pills">
                  <button
                    type="button"
                    className={`tui-preset-pill${payPreset === "full" ? " is-active" : ""}`}
                    onClick={() => setPayPreset("full")}
                  >
                    <span>Tất cả công nợ</span>
                    <code>{money(owed)}</code>
                  </button>
                  <button
                    type="button"
                    className={`tui-preset-pill${payPreset === "half" ? " is-active" : ""}`}
                    onClick={() => setPayPreset("half")}
                  >
                    <span>Tạm nộp 50%</span>
                    <code>{money(Math.ceil(owed / 2 / 1000) * 1000)}</code>
                  </button>
                  <button
                    type="button"
                    className={`tui-preset-pill${payPreset === "bhyt" ? " is-active" : ""}`}
                    onClick={() => setPayPreset("bhyt")}
                  >
                    <span>Riêng BHYT</span>
                    <code>{money(Math.min(owed, healthInsurance))}</code>
                  </button>
                </div>
              </div>
            )}

            <div className="tui-qr-frame">
              <div
                className="tui-qr-box"
                role="img"
                aria-label={`Mã QR chuyển khoản ${money(presetAmount)} tới ${bank.name}`}
              >
                <svg
                  viewBox={`0 0 ${qrSize} ${qrSize}`}
                  className="tui-qr-svg"
                  shapeRendering="crispEdges"
                >
                  {qrGrid.map((row, r) =>
                    row.map((cell, c) =>
                      cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} /> : null,
                    ),
                  )}
                </svg>
                <span className="tui-qr-seal">
                  <img src="/sao-do-logo.png" alt="SDU" width={20} height={22} />
                </span>
              </div>
              <div className="tui-qr-caption">
                <span className="tui-qr-tag">
                  {owed > 0 ? "Quét bằng App Ngân hàng" : "Đã tất toán kỳ này"}
                </span>
                <strong>{owed > 0 ? money(presetAmount) : "0 đ"}</strong>
                <span>
                  Tự điền số tài khoản, số tiền và nội dung chuyển khoản chuẩn <code>{transferNote}</code>
                </span>
              </div>
            </div>

            <dl className="tui-voucher-fields">
              <div className="tui-field-row">
                <div>
                  <dt>Ngân hàng thụ hưởng</dt>
                  <dd>{bank.name}</dd>
                </div>
                <span className="tui-field-tag">Chi nhánh Chí Linh</span>
              </div>

              <div className="tui-field-row">
                <div>
                  <dt>Đơn vị thụ hưởng</dt>
                  <dd className="is-mono">{bank.holder}</dd>
                </div>
              </div>

              <div className="tui-field-row">
                <div>
                  <dt>Số tài khoản định danh</dt>
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
                  <dt>Số tiền lệnh QR</dt>
                  <dd className="is-mono is-accent">{money(presetAmount)}</dd>
                </div>
                <button
                  type="button"
                  className={`tui-copy-btn${copiedKey === "amount" ? " is-copied" : ""}`}
                  disabled={presetAmount === 0}
                  onClick={() => copyValue("amount", String(presetAmount), "số tiền chuyển khoản")}
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

            {/* Motion Prompt #160 Loading button + #085 Ink ripple */}
            <div className="tui-voucher-actions">
              {owed > 0 ? (
                <button
                  type="button"
                  className={`tui-pay-btn is-${payPhase}`}
                  disabled={payPhase !== "idle"}
                  onClick={handleConfirmPayment}
                >
                  <span className="tui-ripple-layer" aria-hidden="true">
                    {ripples.map((r) => (
                      <span
                        key={r.id}
                        className="tui-ink-ripple"
                        style={{
                          left: r.x,
                          top: r.y,
                          width: r.maxR * 2,
                          height: r.maxR * 2,
                        }}
                      />
                    ))}
                  </span>
                  {payPhase === "loading" ? (
                    <span className="tui-btn-spinner" aria-hidden="true" />
                  ) : payPhase === "done" ? (
                    <>
                      <Icon name="checkCircle" />
                      <span>Đã đối soát xong</span>
                    </>
                  ) : (
                    <>
                      <Icon name="checkCircle" />
                      <span>Xác nhận đã chuyển {money(presetAmount)}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className="tui-reset-btn"
                  onClick={() => {
                    setSettledExtra(0);
                    setPayPreset("full");
                    showToast("Đã khôi phục công nợ mẫu", "Trạng thái đối soát đã đặt lại ban đầu");
                  }}
                >
                  <Icon name="retry" />
                  <span>Đặt lại trạng thái đối soát mẫu</span>
                </button>
              )}
              <p className="tui-voucher-note">
                Cổng PMT-EMS tự động gạch nợ và cấp biên lai điện tử trong 1–3 phút khi đúng cú pháp{" "}
                <code>{transferNote}</code>
              </p>
            </div>
          </section>
        </aside>
      </div>

      {/* Motion Prompt #056 Toast notification with auto-dismiss progress bar */}
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
