"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { DemoBanner, PageTitle, Section } from "@/components/portal/Parts";
import {
  initialProfileUpdates,
  useDemoState,
  type ProfileUpdateProposal,
} from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

const categories: ProfileUpdateProposal["category"][] = [
  "Hồ sơ cá nhân",
  "Tài khoản ngân hàng",
  "Bảo hiểm y tế",
  "Thông tin gia đình",
];

function ProfileUpdateContent() {
  const { account } = useStudent();
  const [proposals, setProposals] = useDemoState<ProfileUpdateProposal[]>(
    "profile-updates",
    () => initialProfileUpdates,
  );
  const [bankInfo, setBankInfo] = useDemoState("student-bank-info", () => ({
    bankName: "BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
    branchName: "Chi nhánh Chí Linh, Hải Dương",
    accountNumber: "46110002869999",
    accountHolder: account.displayName.toUpperCase(),
    bhytCode: "SV4303020400864",
    bhytPlace: "Trung tâm Y tế TP. Chí Linh",
  }));

  const searchParams = useSearchParams();
  const [category, setCategory] = useState<ProfileUpdateProposal["category"]>("Hồ sơ cá nhân");
  const [fieldLabel, setFieldLabel] = useState("Địa chỉ liên hệ hiện tại");
  const [oldValue, setOldValue] = useState("471, Tổ 4, Khu Quang Trung, Mạo Khê, Đông Triều, Quảng Ninh");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const qCat = searchParams.get("category") as ProfileUpdateProposal["category"] | null;
    const qField = searchParams.get("field");
    const qOld = searchParams.get("old");
    const qNew = searchParams.get("new");
    const qReason = searchParams.get("reason");
    const qSource = searchParams.get("from");
    queueMicrotask(() => {
      if (qCat && categories.includes(qCat)) setCategory(qCat);
      if (qField) setFieldLabel(qField);
      if (qOld !== null) setOldValue(qOld);
      if (qNew !== null) setNewValue(qNew);
      if (qReason !== null) setReason(qReason);
      if (qSource === "portfolio") {
        setNotice("Đã nạp dữ liệu trích xuất từ Hồ sơ của bạn vào biểu mẫu chỉnh sửa. Vui lòng kiểm tra và gửi duyệt.");
      }
    });
  }, [searchParams]);

  function submitProposal(event: FormEvent) {
    event.preventDefault();
    if (!fieldLabel.trim() || !newValue.trim() || !reason.trim()) return;
    const item: ProfileUpdateProposal = {
      id: `pup-${Date.now()}`,
      category,
      fieldLabel: fieldLabel.trim(),
      oldValue: oldValue.trim() || "Chưa khai báo",
      newValue: newValue.trim(),
      reason: reason.trim(),
      submittedAt: new Date().toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Đang chờ duyệt",
    };
    setProposals((prev) => [item, ...prev]);
    setNewValue("");
    setReason("");
    setNotice("Đã gửi đề xuất cập nhật thông tin tới Phòng Công tác sinh viên.");
  }

  function saveBankAndBhyt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = {
      bankName: String(form.get("bankName") ?? "").trim(),
      branchName: String(form.get("branchName") ?? "").trim(),
      accountNumber: String(form.get("accountNumber") ?? "").trim(),
      accountHolder: String(form.get("accountHolder") ?? "").trim(),
      bhytCode: String(form.get("bhytCode") ?? "").trim(),
      bhytPlace: String(form.get("bhytPlace") ?? "").trim(),
    };
    setBankInfo(next);
    setNotice("Đã lưu thông tin Tài khoản ngân hàng và Bảo hiểm y tế sinh viên.");
  }

  return (
    <>
      <DemoBanner />
      <PageTitle
        title="Đề xuất cập nhật thông tin"
        lead="Gửi yêu cầu điều chỉnh hồ sơ sinh viên, khai báo tài khoản ngân hàng nhận học bổng/chính sách và cập nhật thẻ BHYT."
      />

      {notice && (
        <div className="notice ok" role="status" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <div>
            <strong>Đã ghi nhận thông tin</strong>
            <p>{notice}</p>
          </div>
          <button className="button button-quiet button-xs" type="button" onClick={() => setNotice("")}>
            Đóng
          </button>
        </div>
      )}

      <div className="pt-two">
        <Section title="Gửi phiếu đề xuất chỉnh sửa hồ sơ" icon="pen">
          <form className="pt-form" onSubmit={submitProposal}>
            <label className="field">
              Nhóm thông tin cần điều chỉnh
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProfileUpdateProposal["category"])}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Trường thông tin
              <input
                type="text"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                placeholder="Ví dụ: Số CCCD, Ngày cấp, Điện thoại liên hệ..."
                required
              />
            </label>
            <label className="field">
              Giá trị hiện tại trên hệ thống
              <input
                type="text"
                value={oldValue}
                onChange={(e) => setOldValue(e.target.value)}
                placeholder="Thông tin cũ đang hiển thị"
              />
            </label>
            <label className="field">
              Giá trị mới đề xuất cập nhật
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Nhập thông tin chính xác theo giấy tờ gốc"
                required
              />
            </label>
            <label className="field">
              Lý do cập nhật & căn cứ minh chứng
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Đổi thẻ CCCD gắn chip mới ngày 12/08/2025..."
                required
              />
            </label>
            <div className="pt-form-actions">
              <button type="submit" className="button button-primary">
                <Icon name="send" /> Gửi đề xuất duyệt
              </button>
            </div>
          </form>
        </Section>

        <Section title="Cập nhật Tài khoản ngân hàng & BHYT" icon="wallet">
          <form className="pt-form" onSubmit={saveBankAndBhyt}>
            <label className="field">
              Ngân hàng thụ hưởng
              <input name="bankName" type="text" defaultValue={bankInfo.bankName} required />
            </label>
            <label className="field">
              Chi nhánh ngân hàng
              <input name="branchName" type="text" defaultValue={bankInfo.branchName} required />
            </label>
            <label className="field">
              Số tài khoản cá nhân
              <input name="accountNumber" type="text" defaultValue={bankInfo.accountNumber} required />
            </label>
            <label className="field">
              Chủ tài khoản (viết hoa không dấu)
              <input name="accountHolder" type="text" defaultValue={bankInfo.accountHolder} required />
            </label>
            <label className="field">
              Mã số Bảo hiểm y tế (10 ký tự hoặc mã thẻ)
              <input name="bhytCode" type="text" defaultValue={bankInfo.bhytCode} required />
            </label>
            <label className="field">
              Nơi đăng ký khám chữa bệnh ban đầu
              <input name="bhytPlace" type="text" defaultValue={bankInfo.bhytPlace} required />
            </label>
            <div className="pt-form-actions">
              <button type="submit" className="button button-outline">
                <Icon name="check" /> Lưu thông tin Ngân hàng & BHYT
              </button>
            </div>
          </form>
        </Section>
      </div>

      <Section
        title="Lịch sử đề xuất cập nhật thông tin"
        action={<span className="reg-table-meta">{proposals.length} phiếu đề xuất</span>}
      >
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">Thời gian gửi</th>
                <th scope="col">Nhóm thông tin</th>
                <th scope="col">Trường cập nhật</th>
                <th scope="col">Thông tin cũ</th>
                <th scope="col">Thông tin mới đề xuất</th>
                <th scope="col">Lý do</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((item) => (
                <tr key={item.id}>
                  <td className="ad-code">{item.submittedAt}</td>
                  <td>{item.category}</td>
                  <td>
                    <strong>{item.fieldLabel}</strong>
                  </td>
                  <td className="pt-muted">{item.oldValue}</td>
                  <td>
                    <strong>{item.newValue}</strong>
                  </td>
                  <td>{item.reason}</td>
                  <td>
                    <span className={`chip ${item.status === "Đã duyệt" ? "reviewed" : "soon"}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

export default function ProfileUpdatePage() {
  return (
    <Suspense fallback={null}>
      <ProfileUpdateContent />
    </Suspense>
  );
}
