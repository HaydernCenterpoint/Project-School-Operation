"use client";

import { FormEvent, useState } from "react";
import { Icon } from "@/components/Icon";
import { DemoBanner, Empty, PageTitle, Section } from "@/components/portal/Parts";
import type { ClubMemberRecord } from "@/lib/accounts";
import { formatDate } from "@/lib/format";
import { clubs, weekdays } from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

export default function ClubsPage() {
  const {
    account,
    clubMembers,
    clubEvents,
    requestJoinClub,
    approveClubMember,
    updateClubMemberRole,
    removeClubMember,
    createClubEvent,
  } = useStudent();

  const [category, setCategory] = useState("Tất cả");
  const [statusMessage, setStatusMessage] = useState("");
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventTime, setEventTime] = useState("Thứ 6 · 18:00 – 20:00");
  const [eventPlace, setEventPlace] = useState("Phòng B1-202");
  const [eventSummary, setEventSummary] = useState("");

  const isClubLeader = account.permissions.canManageClubMembers;
  const managedClubId = account.managedClubId ?? "club-it";
  const managedClub = clubs.find((c) => c.id === managedClubId) ?? clubs[0]!;

  const managedClubMembers = clubMembers.filter((m) => m.clubId === managedClubId);
  const pendingRequests = managedClubMembers.filter((m) => m.status === "pending");
  const activeMembers = managedClubMembers.filter((m) => m.status === "active");

  const categories = ["Tất cả", ...new Set(clubs.map((club) => club.category))];
  const visible = clubs.filter((club) => category === "Tất cả" || club.category === category);

  const myMemberships = clubMembers.filter((m) => m.studentCode === account.code);

  function handleCreateEvent(event: FormEvent) {
    event.preventDefault();
    if (!eventTitle.trim() || !eventSummary.trim()) return;
    createClubEvent({
      clubId: managedClubId,
      title: eventTitle,
      time: eventTime,
      place: eventPlace,
      summary: eventSummary,
    });
    setEventTitle("");
    setEventSummary("");
    setShowEventForm(false);
    setStatusMessage(`Trưởng CLB ${account.displayName} đã công bố lịch sinh hoạt mới cho ${managedClub.name}.`);
  }

  function handleJoinOrLeave(clubId: string, clubName: string) {
    const existing = clubMembers.find((m) => m.clubId === clubId && m.studentCode === account.code);
    if (existing) {
      if (existing.memberRole === "Chủ nhiệm CLB") {
        setStatusMessage("Bạn đang là Chủ nhiệm CLB này nên không thể rời khỏi câu lạc bộ.");
        return;
      }
      removeClubMember(existing.id);
      setStatusMessage(`Đã rút khỏi ${clubName}.`);
      return;
    }
    requestJoinClub(
      clubId,
      `Sinh viên ${account.displayName} (${account.code} · Lớp ${account.cohortClass}) đăng ký tham gia ${clubName}.`,
    );
    setStatusMessage(
      isClubLeader && clubId === managedClubId
        ? `Đã tham gia ${clubName}.`
        : `Đã gửi đơn đăng ký vào ${clubName}. Đơn đang chờ Ban chủ nhiệm CLB phê duyệt.`,
    );
  }

  return (
    <>
      <DemoBanner />
      <PageTitle
        title={isClubLeader ? `Điều hành Câu lạc bộ · ${managedClub.name}` : "Câu lạc bộ sinh viên"}
        lead={
          isClubLeader
            ? `Tài khoản Trưởng CLB: ${account.displayName} (${account.code}) · Duyệt đơn gia nhập của sinh viên lớp ${account.cohortClass}, phân ban và lên lịch sinh hoạt`
            : "Tham gia câu lạc bộ để học thuật, kết nối và cộng điểm rèn luyện. Đơn đăng ký được Trưởng CLB phê duyệt trực tiếp."
        }
      >
        {isClubLeader && (
          <div className="role-action-bar">
            <button
              type="button"
              className="button button-primary button-small"
              onClick={() => setShowEventForm((v) => !v)}
            >
              <Icon name="plus" /> Lên lịch sinh hoạt CLB
            </button>
          </div>
        )}
      </PageTitle>

      {statusMessage && (
        <div className="notice" role="status" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <div>
            <strong>Đã cập nhật hoạt động Câu lạc bộ</strong>
            <p>{statusMessage}</p>
          </div>
        </div>
      )}

      {isClubLeader && showEventForm && (
        <section className="card rbac-compose-card" aria-label="Lên lịch sinh hoạt CLB">
          <div className="card-head">
            <h3>Tạo lịch sinh hoạt / Workshop mới ({managedClub.name})</h3>
            <button type="button" className="button button-quiet button-xs" onClick={() => setShowEventForm(false)}>
              Đóng
            </button>
          </div>
          <form className="pt-form" onSubmit={handleCreateEvent}>
            <label className="field">
              Chủ đề buổi sinh hoạt / sự kiện
              <input
                type="text"
                required
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="VD: Thực hành lập trình C++ OOP & Giải đề thi cuối kỳ IT3040"
              />
            </label>
            <div className="ad-grid">
              <label className="field">
                Thời gian tổ chức
                <input
                  type="text"
                  required
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </label>
              <label className="field">
                Địa điểm / Phòng máy
                <input
                  type="text"
                  required
                  value={eventPlace}
                  onChange={(e) => setEventPlace(e.target.value)}
                />
              </label>
            </div>
            <label className="field">
              Nội dung chuẩn bị cho thành viên
              <textarea
                rows={3}
                required
                value={eventSummary}
                onChange={(e) => setEventSummary(e.target.value)}
                placeholder="Mô tả nội dung buổi sinh hoạt, tài liệu cần mang theo…"
              />
            </label>
            <div className="pt-form-actions">
              <button type="submit" className="button button-primary button-small">
                <Icon name="calendar" /> Công bố lịch sinh hoạt
              </button>
            </div>
          </form>
        </section>
      )}

      {isClubLeader && (
        <Section
          title={`Bảng quản trị dành cho Trưởng CLB: ${managedClub.name}`}
          action={
            <span className="reg-table-meta">
              {activeMembers.length} thành viên chính thức · {pendingRequests.length} đơn chờ duyệt
            </span>
          }
        >
          {pendingRequests.length > 0 && (
            <div className="club-pending-box" style={{ marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem" }}>
                Đơn xin gia nhập chờ Trưởng CLB phê duyệt ({pendingRequests.length})
              </h4>
              <div className="cls-notice-list">
                {pendingRequests.map((req) => (
                  <article key={req.id} className="cls-notice-card">
                    <div className="cls-notice-head">
                      <div>
                        <strong>{req.fullName}</strong>{" "}
                        <code style={{ marginLeft: 6 }}>{req.studentCode}</code>{" "}
                        <span className="chip warning" style={{ marginLeft: 6 }}>
                          Lớp {req.cohortClass} · Chờ duyệt
                        </span>
                      </div>
                      <small>Gửi ngày {req.joinedAt}</small>
                    </div>
                    {req.note && <p style={{ marginTop: 6 }}>{req.note}</p>}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        className="button button-primary button-xs"
                        onClick={() => {
                          approveClubMember(req.id);
                          setStatusMessage(`Đã duyệt sinh viên ${req.fullName} (${req.studentCode}) vào ${managedClub.name}.`);
                        }}
                      >
                        <Icon name="check" /> Duyệt vào CLB
                      </button>
                      <button
                        type="button"
                        className="button button-outline button-xs"
                        onClick={() => {
                          removeClubMember(req.id);
                          setStatusMessage(`Đã từ chối đơn đăng ký của ${req.fullName}.`);
                        }}
                      >
                        Từ chối
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th scope="col">MSSV</th>
                  <th scope="col">Họ và tên</th>
                  <th scope="col">Lớp niên chế</th>
                  <th scope="col">Chức vụ trong CLB</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ghi chú ban chuyên môn</th>
                  <th scope="col">Phân quyền</th>
                </tr>
              </thead>
              <tbody>
                {managedClubMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="ad-code">{member.studentCode}</td>
                    <td className="ad-name">
                      <strong>{member.fullName}</strong>
                    </td>
                    <td>{member.cohortClass}</td>
                    <td>
                      <select
                        value={member.memberRole}
                        onChange={(e) => {
                          updateClubMemberRole(
                            member.id,
                            e.target.value as ClubMemberRecord["memberRole"],
                          );
                          setStatusMessage(`Đã cập nhật chức vụ của ${member.fullName} thành ${e.target.value}.`);
                        }}
                        disabled={member.studentCode === account.code}
                        style={{ padding: "4px 8px", borderRadius: 6, fontSize: "0.82rem" }}
                      >
                        <option value="Chủ nhiệm CLB">Chủ nhiệm CLB</option>
                        <option value="Phó chủ nhiệm">Phó chủ nhiệm</option>
                        <option value="Trưởng ban Chuyên môn">Trưởng ban Chuyên môn</option>
                        <option value="Thành viên">Thành viên</option>
                      </select>
                    </td>
                    <td>
                      <span className={`chip ${member.status === "active" ? "success" : "warning"}`}>
                        {member.status === "active" ? "Chính thức" : "Chờ duyệt"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.84rem", color: "var(--muted)" }}>{member.note ?? "—"}</td>
                    <td className="ad-actions">
                      {member.status === "pending" ? (
                        <button
                          type="button"
                          className="button button-primary button-xs"
                          onClick={() => approveClubMember(member.id)}
                        >
                          Duyệt
                        </button>
                      ) : member.studentCode !== account.code ? (
                        <button
                          type="button"
                          className="button button-quiet button-xs"
                          onClick={() => removeClubMember(member.id)}
                        >
                          Xoá
                        </button>
                      ) : (
                        <span className="chip reviewed">Trưởng CLB</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section
        title="Lịch sinh hoạt & Sự kiện do Trưởng CLB phát hành"
        action={<span className="reg-table-meta">{clubEvents.length} hoạt động sắp tới</span>}
      >
        <div className="cls-notice-list">
          {clubEvents.map((ev) => {
            const clb = clubs.find((c) => c.id === ev.clubId);
            return (
              <article key={ev.id} className="cls-notice-card">
                <div className="cls-notice-head">
                  <span className="chip reviewed">{clb?.name ?? "CLB Sinh viên"}</span>
                  <small>{ev.createdBy} · {formatDate(ev.createdAt)}</small>
                </div>
                <h4>{ev.title}</h4>
                <p>{ev.summary}</p>
                <div className="pt-meta" style={{ marginTop: 8 }}>
                  <span><Icon name="calendar" /> {ev.time}</span>
                  <span><Icon name="pin" /> {ev.place}</span>
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      <Section title={`Câu lạc bộ của ${account.displayName} (${myMemberships.length})`} icon="users">
        {myMemberships.length ? (
          <ul className="pt-mini-list">
            {myMemberships.map((m) => {
              const club = clubs.find((c) => c.id === m.clubId);
              if (!club) return null;
              return (
                <li key={m.id}>
                  <strong>{club.name}</strong>
                  <span className={`chip ${m.status === "active" ? "reviewed" : "warning"}`}>
                    {m.status === "active" ? m.memberRole : "Đang chờ Trưởng CLB duyệt"}
                  </span>
                  <span><Icon name="calendar" /> {weekdays[club.day]}, {club.time}</span>
                  <span><Icon name="pin" /> {club.place}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty
            icon="users"
            title={
              account.role === "teacher"
                ? "Giảng viên cố vấn theo dõi hoạt động CLB của sinh viên trong lớp"
                : "Bạn chưa tham gia câu lạc bộ nào"
            }
            text="Chọn một câu lạc bộ bên dưới để gửi đơn đăng ký cho Trưởng CLB."
          />
        )}
      </Section>

      <div className="toolbar">
        <div className="segmented pt-scroll" role="group" aria-label="Lọc theo lĩnh vực">
          {categories.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-club-grid">
        {visible.map((club, index) => {
          const membership = clubMembers.find(
            (m) => m.clubId === club.id && m.studentCode === account.code,
          );
          const clubActiveCount = clubMembers.filter(
            (m) => m.clubId === club.id && m.status === "active",
          ).length;
          return (
            <article key={club.id} className={`pt-club tone-${index % 6}`}>
              <div className="pt-club-mark" aria-hidden="true">{club.name.replace("CLB ", "").slice(0, 1)}</div>
              <p className="pt-code">
                {club.category}
                {club.id === "club-it" ? " · Chủ nhiệm: Nguyễn Văn Đạt (DK13-CNTT1)" : ""}
              </p>
              <h4>{club.name}</h4>
              <p>{club.about}</p>
              <p className="pt-meta">
                <span><Icon name="users" /> {club.members + clubActiveCount} thành viên</span>
                <span><Icon name="calendar" /> {weekdays[club.day]}, {club.time}</span>
              </p>
              {account.permissions.canJoinClubs ? (
                <button
                  className={`button button-small ${membership ? "button-outline" : "button-primary"}`}
                  type="button"
                  onClick={() => handleJoinOrLeave(club.id, club.name)}
                  aria-pressed={Boolean(membership)}
                >
                  {membership ? (
                    membership.status === "active" ? (
                      <>
                        <Icon name="check" /> {membership.memberRole}
                      </>
                    ) : (
                      <>
                        <Icon name="clock" /> Chờ Trưởng CLB duyệt (Huỷ)
                      </>
                    )
                  ) : (
                    "Gửi đơn xin gia nhập"
                  )}
                </button>
              ) : (
                <span className="chip">Chế độ Giảng viên quan sát</span>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
