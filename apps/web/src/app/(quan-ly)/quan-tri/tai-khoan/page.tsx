"use client";

import type { Route } from "next";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Icon } from "@/components/Icon";
import { PageTitle, Section, StatTile } from "@/components/portal/Parts";
import {
  type ClassStudentRosterItem,
  ROLE_PERMISSION_LABELS,
  usePortalAccounts,
} from "@/lib/accounts";

export default function AccountManagementDashboardPage() {
  const {
    activeAccount: account,
    accounts,
    setActiveAccount: switchAccount,
    roster,
    submissions,
    clubMembers,
    clubEvents,
    updateStudentNote,
    addClassStudent,
    approveClubMember,
    updateClubMemberRole,
    removeClubMember,
  } = usePortalAccounts();

  const [notice, setNotice] = useState("");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [attendanceDraft, setAttendanceDraft] = useState(95);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentCode, setNewStudentCode] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentRole, setNewStudentRole] =
    useState<ClassStudentRosterItem["roleInClass"]>("Thành viên lớp");

  const grantedCount = Object.values(account.permissions).filter(Boolean).length;
  const totalPermCount = Object.keys(account.permissions).length;

  const teacherAcc = accounts.find((item) => item.role === "teacher")!;
  const clubLeaderAcc = accounts.find((item) => item.role === "club_leader")!;
  const studentAcc = accounts.find((item) => item.role === "class_student")!;

  const pendingClubMembers = clubMembers.filter((m) => m.status === "pending");
  const activeClubMembers = clubMembers.filter((m) => m.status === "active");
  const reviewedSubmissions = submissions.filter((s) => s.status === "reviewed");

  function handleSaveStudentNote(studentCode: string) {
    updateStudentNote(studentCode, {
      teacherNote: noteDraft.trim(),
      attendancePct: Math.min(100, Math.max(0, Number(attendanceDraft) || 0)),
      status: Number(attendanceDraft) < 85 ? "warning" : "active",
    });
    setEditingCode(null);
    setNotice(`Đã cập nhật hồ sơ học tập của sinh viên ${studentCode}.`);
  }

  function handleAddStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newStudentCode.trim() || !newStudentName.trim()) return;
    addClassStudent({
      studentCode: newStudentCode.trim(),
      fullName: newStudentName.trim(),
      phone: newStudentPhone.trim() || "0988123456",
      roleInClass: newStudentRole,
    });
    setNotice(`Đã thêm sinh viên ${newStudentName.trim()} (${newStudentCode.trim()}) vào lớp DK13-CNTT1.`);
    setNewStudentCode("");
    setNewStudentName("");
    setNewStudentPhone("");
    setShowAddStudent(false);
  }

  return (
    <div className="ad-page">
      <PageTitle
        title="Dashboard Quản lý Tài khoản & Phân quyền (RBAC)"
        lead="Trung tâm quản trị các loại tài khoản (Giảng viên, Trưởng CLB, Sinh viên thuộc lớp của giảng viên), ma trận phân quyền, danh sách lớp DK13-CNTT1 và thành viên CLB Tin học Sao Đỏ."
      >
        <Link className="button button-outline button-small" href={"/student/classes" as Route}>
          <Icon name="class" /> Mở trang Lớp học
        </Link>
        <Link className="button button-outline button-small" href={"/student/clubs" as Route}>
          <Icon name="users" /> Mở trang CLB
        </Link>
        <Link className="button button-primary button-small" href={"/student" as Route}>
          <Icon name="home" /> Vào Cổng với vai trò {account.roleBadge}
        </Link>
      </PageTitle>

      {notice && (
        <div className="notice ok" role="status" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <div>
            <strong>Đã cập nhật trên Dashboard Quản lý</strong>
            <p>{notice}</p>
          </div>
          <button
            className="button button-quiet button-xs"
            type="button"
            onClick={() => setNotice("")}
          >
            Đóng
          </button>
        </div>
      )}

      <div className="pt-stats ad-stats">
        <StatTile
          icon="shield"
          label="Tài khoản định danh"
          value={`${accounts.length} tài khoản`}
          note="1 GV · 1 Trưởng CLB · 2 SV"
        />
        <StatTile
          icon="users"
          label="Lớp của giảng viên"
          value={`${roster.length} SV`}
          note="Lớp niên chế DK13-CNTT1"
          tone="good"
        />
        <StatTile
          icon="assignment"
          label="Bài nộp học phần"
          value={`${reviewedSubmissions.length}/${submissions.length}`}
          note="Đã chấm điểm / Tổng bài nộp"
        />
        <StatTile
          icon="flag"
          label="CLB Tin học Sao Đỏ"
          value={`${activeClubMembers.length} TV`}
          note={
            pendingClubMembers.length > 0
              ? `${pendingClubMembers.length} đơn chờ Trưởng CLB duyệt`
              : `${clubEvents.length} lịch sinh hoạt`
          }
          tone="good"
        />
      </div>

      <Section
        title="1. Chọn & Chuyển đổi tài khoản tác nghiệp"
        action={
          <span className="reg-table-meta">
            Đang kích hoạt: <strong>{account.displayName}</strong> ({account.roleTitle} · {grantedCount}/{totalPermCount} quyền)
          </span>
        }
      >
        <div className="rbac-panel">
          <div className="rbac-accounts" role="radiogroup" aria-label="Chọn tài khoản phân quyền">
            {accounts.map((item) => {
              const isSelected = item.id === account.id;
              const itemPermCount = Object.values(item.permissions).filter(Boolean).length;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`rbac-account-card is-${item.role}${isSelected ? " is-active" : ""}`}
                  onClick={() => {
                    switchAccount(item.id);
                    setNotice(
                      `Đã chuyển phiên làm việc sang tài khoản ${item.displayName} (${item.roleTitle}).`,
                    );
                  }}
                >
                  <div className="rbac-account-top">
                    <span className={`role-badge is-${item.role}`}>{item.roleBadge}</span>
                    <span className="rbac-account-code">{item.code}</span>
                    {isSelected && <span className="rbac-active-pill">Đang kích hoạt</span>}
                  </div>
                  <strong>{item.displayName}</strong>
                  <span className="rbac-account-role">{item.roleTitle}</span>
                  <p>{item.bio}</p>
                  <div className="rbac-account-foot">
                    <span>
                      Lớp: <strong>{item.cohortClass}</strong>
                    </span>
                    <span>
                      Quyền hạn: <strong>{itemPermCount}/10</strong>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rbac-matrix">
            <div className="rbac-matrix-head">
              <div>
                <span className="reg-label">Tài khoản đang kích hoạt trên toàn hệ thống</span>
                <h4>
                  [{account.roleBadge}] {account.displayName} — {account.positionLabel}
                </h4>
              </div>
              <div className="rbac-quick-links">
                <Link className="button button-outline button-xs" href={"/student/classes" as Route}>
                  <Icon name="class" />{" "}
                  {account.role === "teacher" ? "Quản lý lớp & giao bài" : "Xem lớp của giảng viên"}
                </Link>
                <Link
                  className="button button-outline button-xs"
                  href={"/student/assignments/22222222-2222-4222-8222-222222222201" as Route}
                >
                  <Icon name="assignment" />{" "}
                  {account.role === "teacher" ? "Chấm bài sinh viên" : "Nộp bài & xem điểm"}
                </Link>
                <Link className="button button-outline button-xs" href={"/student/clubs" as Route}>
                  <Icon name="users" />{" "}
                  {account.role === "club_leader" ? "Quản trị CLB Tin học" : "Câu lạc bộ sinh viên"}
                </Link>
              </div>
            </div>

            <ul className="rbac-perm-grid">
              {ROLE_PERMISSION_LABELS.map((perm) => {
                const allowed = account.permissions[perm.key];
                return (
                  <li
                    key={perm.key}
                    className={`rbac-perm-item${allowed ? " is-allowed" : " is-denied"}`}
                  >
                    <span className="rbac-perm-icon" aria-hidden="true">
                      <Icon name={allowed ? "check" : "close"} />
                    </span>
                    <div className="rbac-perm-text">
                      <strong>{perm.label}</strong>
                      <small>
                        {perm.group} · {allowed ? "Được cấp quyền" : "Giới hạn theo vai trò"}
                      </small>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Section>

      <Section
        title="2. Bảng đối chiếu Ma trận Phân quyền giữa 3 nhóm Tài khoản"
        action={<span className="reg-table-meta">10 quyền nghiệp vụ cốt lõi</span>}
      >
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">Nhóm nghiệp vụ</th>
                <th scope="col">Quyền hạn chi tiết</th>
                <th scope="col">Giảng viên (GV)</th>
                <th scope="col">Trưởng CLB (CLB)</th>
                <th scope="col">Sinh viên thuộc lớp (SV)</th>
              </tr>
            </thead>
            <tbody>
              {ROLE_PERMISSION_LABELS.map((perm) => (
                <tr key={perm.key}>
                  <td>
                    <span className="chip">{perm.group}</span>
                  </td>
                  <td>
                    <strong>{perm.label}</strong>
                  </td>
                  <td>
                    {teacherAcc.permissions[perm.key] ? (
                      <span className="chip success">Được phép</span>
                    ) : (
                      <span className="chip">Không</span>
                    )}
                  </td>
                  <td>
                    {clubLeaderAcc.permissions[perm.key] ? (
                      <span className="chip success">Được phép</span>
                    ) : (
                      <span className="chip">Không</span>
                    )}
                  </td>
                  <td>
                    {studentAcc.permissions[perm.key] ? (
                      <span className="chip success">Được phép</span>
                    ) : (
                      <span className="chip">Không</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="3. Quản lý Sinh viên thuộc lớp của Giảng viên (Lớp DK13-CNTT1 · ThS. Trần Minh Đức)"
        action={
          <button
            className="button button-outline button-xs"
            type="button"
            onClick={() => setShowAddStudent((v) => !v)}
          >
            <Icon name="plus" /> Thêm sinh viên vào lớp
          </button>
        }
      >
        {showAddStudent && (
          <form className="card form-grid" onSubmit={handleAddStudent} style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Thêm sinh viên mới vào lớp niên chế DK13-CNTT1</h3>
            <div className="grid-2" style={{ gap: 12 }}>
              <label className="field">
                <span>Mã sinh viên</span>
                <input
                  value={newStudentCode}
                  onChange={(e) => setNewStudentCode(e.target.value)}
                  placeholder="VD: 2200292"
                  required
                />
              </label>
              <label className="field">
                <span>Họ và tên</span>
                <input
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="VD: Bùi Minh Quân"
                  required
                />
              </label>
              <label className="field">
                <span>Số điện thoại</span>
                <input
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                  placeholder="VD: 0974112233"
                />
              </label>
              <label className="field">
                <span>Chức vụ trong lớp</span>
                <select
                  value={newStudentRole}
                  onChange={(e) =>
                    setNewStudentRole(e.target.value as ClassStudentRosterItem["roleInClass"])
                  }
                >
                  <option value="Thành viên lớp">Thành viên lớp</option>
                  <option value="Lớp trưởng">Lớp trưởng</option>
                  <option value="Bí thư Chi đoàn">Bí thư Chi đoàn</option>
                  <option value="Trưởng CLB Tin học">Trưởng CLB Tin học</option>
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button className="button button-primary button-small" type="submit">
                <Icon name="check" /> Lưu vào danh sách lớp
              </button>
              <button
                className="button button-quiet button-small"
                type="button"
                onClick={() => setShowAddStudent(false)}
              >
                Huỷ
              </button>
            </div>
          </form>
        )}

        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">MSSV</th>
                <th scope="col">Họ và tên</th>
                <th scope="col">Vai trò trong lớp</th>
                <th scope="col">Chuyên cần</th>
                <th scope="col">GPA</th>
                <th scope="col">Nhận xét của Giảng viên (ThS. Trần Minh Đức)</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((student) => {
                const linkedAccount = accounts.find((a) => a.code === student.studentCode);
                const isEditing = editingCode === student.studentCode;
                return (
                  <tr key={student.studentCode}>
                    <td className="ad-code">{student.studentCode}</td>
                    <td className="ad-name">
                      <strong>{student.fullName}</strong>
                      <small>{student.email}</small>
                    </td>
                    <td>
                      <span
                        className={`chip ${
                          student.roleInClass === "Trưởng CLB Tin học"
                            ? "warn"
                            : student.roleInClass !== "Thành viên lớp"
                              ? "info"
                              : ""
                        }`}
                      >
                        {student.roleInClass}
                      </span>
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={attendanceDraft}
                          onChange={(e) => setAttendanceDraft(Number(e.target.value))}
                          style={{ width: 68 }}
                        />
                      ) : (
                        <span className={`chip ${student.attendancePct < 85 ? "danger" : "success"}`}>
                          {student.attendancePct}%
                        </span>
                      )}
                    </td>
                    <td>
                      <strong>{student.gpa.toFixed(2)}</strong>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      {isEditing ? (
                        <input
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          style={{ width: "100%" }}
                        />
                      ) : (
                        <small>{student.teacherNote}</small>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {isEditing ? (
                          <>
                            <button
                              className="button button-primary button-xs"
                              type="button"
                              onClick={() => handleSaveStudentNote(student.studentCode)}
                            >
                              Lưu
                            </button>
                            <button
                              className="button button-quiet button-xs"
                              type="button"
                              onClick={() => setEditingCode(null)}
                            >
                              Huỷ
                            </button>
                          </>
                        ) : (
                          <button
                            className="button button-outline button-xs"
                            type="button"
                            onClick={() => {
                              setEditingCode(student.studentCode);
                              setNoteDraft(student.teacherNote);
                              setAttendanceDraft(student.attendancePct);
                            }}
                          >
                            <Icon name="pen" /> Sửa ghi chú
                          </button>
                        )}
                        {linkedAccount && (
                          <button
                            className="button button-quiet button-xs"
                            type="button"
                            onClick={() => {
                              switchAccount(linkedAccount.id);
                              setNotice(
                                `Đã chuyển sang tài khoản ${linkedAccount.displayName} (${linkedAccount.roleTitle}).`,
                              );
                            }}
                          >
                            Dùng TK này
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="4. Quản lý Thành viên CLB Tin học Sao Đỏ (Trưởng CLB: Nguyễn Văn Minh)"
        action={
          <span className="reg-table-meta">
            {activeClubMembers.length} chính thức · {pendingClubMembers.length} chờ duyệt
          </span>
        }
      >
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">MSSV</th>
                <th scope="col">Họ tên</th>
                <th scope="col">Lớp</th>
                <th scope="col">Chức vụ trong CLB</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Ghi chú</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {clubMembers.map((member) => (
                <tr key={member.id}>
                  <td className="ad-code">{member.studentCode}</td>
                  <td className="ad-name">
                    <strong>{member.fullName}</strong>
                  </td>
                  <td>{member.cohortClass}</td>
                  <td>
                    <select
                      aria-label={`Vai trò của ${member.fullName}`}
                      value={member.memberRole}
                      onChange={(e) => {
                        updateClubMemberRole(
                          member.id,
                          e.target.value as typeof member.memberRole,
                        );
                        setNotice(`Đã cập nhật chức vụ CLB của ${member.fullName}.`);
                      }}
                    >
                      <option value="Chủ nhiệm CLB">Chủ nhiệm CLB</option>
                      <option value="Phó chủ nhiệm">Phó chủ nhiệm</option>
                      <option value="Trưởng ban Chuyên môn">Trưởng ban Chuyên môn</option>
                      <option value="Thành viên">Thành viên</option>
                    </select>
                  </td>
                  <td>
                    <span className={`chip ${member.status === "active" ? "success" : "warn"}`}>
                      {member.status === "active" ? "Chính thức" : "Chờ duyệt"}
                    </span>
                  </td>
                  <td>
                    <small>{member.note}</small>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {member.status === "pending" && (
                        <button
                          className="button button-primary button-xs"
                          type="button"
                          onClick={() => {
                            approveClubMember(member.id);
                            setNotice(`Đã duyệt ${member.fullName} vào CLB Tin học Sao Đỏ.`);
                          }}
                        >
                          <Icon name="check" /> Duyệt
                        </button>
                      )}
                      {member.studentCode !== "2200286" && (
                        <button
                          className="button button-quiet button-xs"
                          type="button"
                          onClick={() => {
                            removeClubMember(member.id);
                            setNotice(`Đã xóa ${member.fullName} khỏi danh sách CLB.`);
                          }}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
