"use client";

import { DemoBanner, Empty, PageTitle, Section, StatTile } from "@/components/portal/Parts";
import { attendanceRecords, semester } from "@/lib/portal-demo";

export default function AttendancePage() {
  const totalPeriods = attendanceRecords.reduce((sum, item) => sum + item.totalPeriods, 0);
  const attendedPeriods = attendanceRecords.reduce((sum, item) => sum + item.attendedPeriods, 0);
  const excused = attendanceRecords.reduce((sum, item) => sum + item.excusedAbsences, 0);
  const unexcused = attendanceRecords.reduce((sum, item) => sum + item.unexcusedAbsences, 0);
  const attendancePct = Math.round((attendedPeriods / totalPeriods) * 1000) / 10;
  const allLogs = attendanceRecords.flatMap((course) =>
    course.logs.map((log) => ({ ...log, courseCode: course.courseCode, courseName: course.courseName })),
  );

  return (
    <>
      <DemoBanner />
      <PageTitle
        title="Thông tin điểm danh"
        lead={`${semester.name} · Quy chế đào tạo: Sinh viên nghỉ quá 20% tổng số tiết quy định của học phần sẽ không đủ điều kiện dự thi kết thúc học phần.`}
      />

      <div className="pt-stats">
        <StatTile
          label="Tỷ lệ chuyên cần"
          value={`${attendancePct}%`}
          note={`Có mặt ${attendedPeriods} / ${totalPeriods} tiết`}
          tone="good"
        />
        <StatTile
          label="Vắng có phép"
          value={`${excused} tiết`}
          note="Có giấy xác nhận hợp lệ"
        />
        <StatTile
          label="Vắng không phép"
          value={`${unexcused} tiết`}
          note={unexcused > 0 ? "Cần đi học đầy đủ các buổi còn lại" : "Không có tiết vắng không phép"}
          tone={unexcused > 0 ? "warn" : "good"}
        />
        <StatTile
          label="Điều kiện dự thi"
          value="Đủ điều kiện"
          note={`${attendanceRecords.length}/${attendanceRecords.length} học phần đạt chuẩn`}
          tone="good"
        />
      </div>

      <Section
        title="Bảng tổng hợp điểm danh theo lớp học phần"
        action={<span className="reg-table-meta">{attendanceRecords.length} lớp học phần</span>}
      >
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">Mã lớp HP</th>
                <th scope="col">Tên học phần</th>
                <th scope="col">TC</th>
                <th scope="col">Giảng viên</th>
                <th scope="col">Tổng số tiết</th>
                <th scope="col">Có mặt</th>
                <th scope="col">Vắng có phép</th>
                <th scope="col">Vắng không phép</th>
                <th scope="col">Tối đa được nghỉ</th>
                <th scope="col">ĐK dự thi</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map((row) => {
                const totalAbsent = row.excusedAbsences + row.unexcusedAbsences;
                const eligible = totalAbsent <= row.maxAllowedAbsences;
                return (
                  <tr key={row.classCode}>
                    <td className="ad-code">{row.classCode}</td>
                    <td>
                      <strong>{row.courseName}</strong>
                      <div className="pt-code">{row.courseCode}</div>
                    </td>
                    <td className="ad-code">{row.credits}</td>
                    <td>{row.lecturer}</td>
                    <td className="ad-code">{row.totalPeriods}</td>
                    <td className="ad-code">{row.attendedPeriods}</td>
                    <td className="ad-code">{row.excusedAbsences}</td>
                    <td className="ad-code">
                      <strong style={{ color: row.unexcusedAbsences > 0 ? "var(--danger)" : undefined }}>
                        {row.unexcusedAbsences}
                      </strong>
                    </td>
                    <td className="ad-code">{row.maxAllowedAbsences} tiết (20%)</td>
                    <td>
                      <span className={`chip ${eligible ? "reviewed" : "overdue"}`}>
                        {eligible ? "Đủ điều kiện" : "Cấm thi"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Chi tiết các buổi nghỉ học đã ghi nhận"
        action={<span className="reg-table-meta">{allLogs.length} bản ghi</span>}
      >
        {allLogs.length > 0 ? (
          <ul className="pt-list">
            {allLogs.map((log, index) => (
              <li key={`${log.courseCode}-${log.date}-${index}`} className="pt-request">
                <div>
                  <h4>
                    <span className="pt-code">{log.courseCode}</span> · {log.courseName}
                  </h4>
                  <p className="pt-muted">
                    Ngày {log.date} ({log.periods}) · Lý do: {log.note}
                  </p>
                </div>
                <span className={`chip ${log.type === "Có phép" ? "submitted" : "soon"}`}>
                  {log.type}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="checkCircle" title="Chưa có buổi vắng nào" text="Bạn đã tham gia đầy đủ tất cả các buổi học tính đến hiện tại." />
        )}
      </Section>
    </>
  );
}
