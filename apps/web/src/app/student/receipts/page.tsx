"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { DemoBanner, PageTitle, Section, StatTile } from "@/components/portal/Parts";
import { money, receiptRecords, type ReceiptRecord } from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

export default function ReceiptsPage() {
  const { account } = useStudent();
  const [kindFilter, setKindFilter] = useState<"all" | ReceiptRecord["kind"]>("all");
  const [selectedId, setSelectedId] = useState<string>(receiptRecords[0]!.id);
  const [copiedRef, setCopiedRef] = useState("");

  const visible = receiptRecords.filter((item) => kindFilter === "all" || item.kind === kindFilter);
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? receiptRecords[0]!;
  const totalAmount = receiptRecords.reduce(
    (sum, rcp) => sum + rcp.items.reduce((s, line) => s + line.amount, 0),
    0,
  );
  const onlineCount = receiptRecords.filter((r) => r.kind === "Phiếu thu trực tuyến").length;
  const summaryCount = receiptRecords.filter((r) => r.kind === "Phiếu thu tổng hợp").length;

  return (
    <>
      <DemoBanner />
      <PageTitle
        title="Phiếu thu trực tuyến & Phiếu thu tổng hợp"
        lead="Tra cứu biên lai thu học phí, bảo hiểm y tế và các khoản thu theo từng đợt học."
      >
        <div className="asg-tabs" role="group" aria-label="Loại phiếu thu">
          <button type="button" aria-pressed={kindFilter === "all"} onClick={() => setKindFilter("all")}>
            <span>Tất cả</span>
            <code>{receiptRecords.length}</code>
          </button>
          <button
            type="button"
            aria-pressed={kindFilter === "Phiếu thu trực tuyến"}
            onClick={() => setKindFilter("Phiếu thu trực tuyến")}
          >
            <span>Phiếu thu trực tuyến</span>
            <code>{onlineCount}</code>
          </button>
          <button
            type="button"
            aria-pressed={kindFilter === "Phiếu thu tổng hợp"}
            onClick={() => setKindFilter("Phiếu thu tổng hợp")}
          >
            <span>Phiếu thu tổng hợp</span>
            <code>{summaryCount}</code>
          </button>
        </div>
      </PageTitle>

      <div className="pt-stats">
        <StatTile label="Tổng số biên lai" value={`${receiptRecords.length} phiếu`} note="Lưu trữ điện tử toàn khóa" />
        <StatTile label="Tổng tiền đã thu" value={money(totalAmount)} note="Đã đối soát công nợ" tone="good" />
        <StatTile label="Phiếu thu trực tuyến" value={`${onlineCount} phiếu`} note="Qua VietQR / Cổng trực tuyến" />
        <StatTile label="Phiếu thu tổng hợp" value={`${summaryCount} phiếu`} note="Phòng Tài chính - Kế toán cấp" />
      </div>

      <Section
        title="Danh sách phiếu thu điện tử"
        action={<span className="reg-table-meta">{visible.length} phiếu thu</span>}
      >
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">Số phiếu</th>
                <th scope="col">Ký hiệu HĐ</th>
                <th scope="col">Đợt học</th>
                <th scope="col">Loại phiếu</th>
                <th scope="col">Ngày thu</th>
                <th scope="col">Hình thức</th>
                <th scope="col">Tổng tiền</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" className="ad-actions">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((rcp) => {
                const sum = rcp.items.reduce((s, i) => s + i.amount, 0);
                const isCurrent = rcp.id === selected.id;
                return (
                  <tr key={rcp.id} className={isCurrent ? "is-current-row" : undefined}>
                    <td className="ad-code">{rcp.receiptNo}</td>
                    <td className="ad-code">{rcp.invoiceSymbol}</td>
                    <td>{rcp.term}</td>
                    <td>
                      <span className={`chip ${rcp.kind === "Phiếu thu trực tuyến" ? "submitted" : ""}`}>
                        {rcp.kind}
                      </span>
                    </td>
                    <td className="ad-code">{rcp.collectedAt}</td>
                    <td>{rcp.method}</td>
                    <td className="ad-code">
                      <strong>{money(sum)}</strong>
                    </td>
                    <td>
                      <span className="chip reviewed">{rcp.status}</span>
                    </td>
                    <td className="ad-actions">
                      <button
                        type="button"
                        className={`button button-small ${isCurrent ? "button-primary" : "button-outline"}`}
                        onClick={() => setSelectedId(rcp.id)}
                      >
                        Xem phiếu
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {selected && (
        <Section
          title={`Chi tiết biên lai · Số phiếu ${selected.receiptNo} (${selected.term})`}
          action={
            <div className="role-action-bar">
              <button
                type="button"
                className="button button-outline button-small"
                onClick={() => {
                  void navigator.clipboard?.writeText(selected.transactionRef);
                  setCopiedRef(selected.transactionRef);
                }}
              >
                <Icon name="copy" /> {copiedRef === selected.transactionRef ? "Đã chép mã GD" : `Mã GD: ${selected.transactionRef}`}
              </button>
              <button
                type="button"
                className="button button-primary button-small"
                onClick={() => window.print()}
              >
                <Icon name="file" /> In phiếu thu
              </button>
            </div>
          }
        >
          <dl className="acc-fields" style={{ marginBottom: 16 }}>
            <div>
              <dt>Người nộp tiền</dt>
              <dd>{account.displayName} ({account.code})</dd>
            </div>
            <div>
              <dt>Lớp niên chế / Đơn vị</dt>
              <dd>{account.cohortClass} · {account.department}</dd>
            </div>
            <div>
              <dt>Đơn vị thu / Thu ngân</dt>
              <dd>{selected.cashier}</dd>
            </div>
          </dl>

          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th scope="col">STT</th>
                  <th scope="col">Mã khoản thu / Lớp HP</th>
                  <th scope="col">Nội dung khoản thu</th>
                  <th scope="col">Số tín chỉ</th>
                  <th scope="col" className="ad-actions">Số tiền (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((line, index) => (
                  <tr key={line.code}>
                    <td className="ad-code">{index + 1}</td>
                    <td className="ad-code">{line.code}</td>
                    <td>{line.description}</td>
                    <td className="ad-code">{line.credits ?? "-"}</td>
                    <td className="ad-actions ad-code">
                      <strong>{money(line.amount)}</strong>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4}>
                    <strong>Tổng cộng tiền thu trên biên lai</strong>
                  </td>
                  <td className="ad-actions ad-code">
                    <strong>{money(selected.items.reduce((s, i) => s + i.amount, 0))}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </>
  );
}
