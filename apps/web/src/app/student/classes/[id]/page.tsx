"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AssignmentRows } from "@/components/AssignmentRows";
import { Icon } from "@/components/Icon";
import { Section } from "@/components/portal/Parts";
import { classCode } from "@/lib/format";
import { useHydratedNow } from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStudent();
  const [now] = useHydratedNow();
  if (!data) return null;
  const item = data.session.classes.find((entry) => entry.id === id);

  if (!item) {
    return (
      <div className="empty" style={{ marginTop: 8 }}>
        <Icon name="question" />
        <strong>Không tìm thấy lớp học</strong>
        <p>Lớp không tồn tại hoặc bạn không có quyền truy cập.</p>
        <Link className="button button-quiet" href="/student/classes">Về danh sách lớp</Link>
      </div>
    );
  }

  const assignments = data.assignments
    .filter((entry) => entry.classId === item.id)
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));

  return (
    <>
      <Link className="back-link" href="/student/classes">
        <Icon name="back" /> Lớp học
      </Link>
      <div className="page-title">
        <span className="chip">{classCode(item.id)}</span>
        <h2 style={{ marginTop: 10 }}>{item.name}</h2>
        <p>{assignments.length ? `${assignments.length} bài tập đã công bố` : "Giảng viên chưa công bố bài tập"}</p>
      </div>
      <Section title="Sổ bài tập lớp học phần" action={<span className="reg-table-meta">{assignments.length} bài tập</span>}>
        <AssignmentRows
          assignments={assignments}
          submissions={data.submissions}
          classes={data.session.classes}
          now={now}
          empty={
            <div className="empty asg-empty">
              <Icon name="assignment" />
              <strong>Chưa có bài tập</strong>
              <p>Bài tập mới của lớp sẽ xuất hiện tại đây</p>
            </div>
          }
        />
      </Section>
    </>
  );
}
