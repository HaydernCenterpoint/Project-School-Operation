"use client";

import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AssignmentRows } from "@/components/AssignmentRows";
import { Icon } from "@/components/Icon";
import { Section } from "@/components/portal/Parts";
import {
  getMaterialsForClass,
  MATERIAL_CATEGORY_META,
  readCustomCourseMaterials,
  subscribeCustomCourseMaterials,
  type CourseMaterial,
} from "@/lib/course-materials";
import { classCode } from "@/lib/format";
import { useHydratedNow } from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStudent();
  const [now] = useHydratedNow();
  const [customMaterials, setCustomMaterials] = useState<CourseMaterial[]>([]);

  useEffect(() => {
    setCustomMaterials(readCustomCourseMaterials());
    return subscribeCustomCourseMaterials(() => {
      setCustomMaterials(readCustomCourseMaterials());
    });
  }, []);

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

  const code = classCode(item.id);
  const assignments = data.assignments
    .filter((entry) => entry.classId === item.id)
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
  const materials = getMaterialsForClass(item.id, customMaterials).length
    ? getMaterialsForClass(item.id, customMaterials)
    : getMaterialsForClass(code, customMaterials);

  return (
    <>
      <Link className="back-link" href="/student/classes">
        <Icon name="back" /> Lớp học
      </Link>
      <div className="page-title">
        <span className="chip">{code}</span>
        <h2 style={{ marginTop: 10 }}>{item.name}</h2>
        <p>
          {assignments.length ? `${assignments.length} bài tập đã công bố` : "Giảng viên chưa công bố bài tập"}
          {materials.length ? ` · ${materials.length} học liệu số đã tải lên` : ""}
        </p>
      </div>

      <Section
        title="Học liệu lớp học phần (Đề cương · Giáo trình · Slide · Bài tập)"
        action={
          <Link
            className="button button-outline button-xs"
            href={`/student/ai?course=${encodeURIComponent(materials[0]?.courseCode ?? code)}` as Route}
          >
            <Icon name="sparkle" /> Mở Kho học liệu trên Chat AI
          </Link>
        }
      >
        {materials.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {materials.map((doc) => {
              const catMeta = MATERIAL_CATEGORY_META[doc.category];
              return (
                <article
                  key={doc.id}
                  className="card"
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span className="chip reviewed">{catMeta.label}</span>
                      <small style={{ color: "var(--muted)" }}>{doc.pageCount} trang PDF · Phòng {doc.room}</small>
                    </div>
                    <h4 style={{ margin: "8px 0 6px", fontSize: "0.95rem", lineHeight: 1.4 }}>{doc.title}</h4>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.5 }}>
                      {doc.summary}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 6 }}>
                    {doc.publicUrl && (
                      <a
                        className="button button-outline button-xs"
                        href={doc.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Icon name="file" /> Xem PDF
                      </a>
                    )}
                    {doc.publicUrl && (
                      <a className="button button-quiet button-xs" href={doc.publicUrl} download={doc.fileName}>
                        Tải xuống
                      </a>
                    )}
                    <Link
                      className="button button-primary button-xs"
                      style={{ marginLeft: "auto" }}
                      href={`/student/ai?material=${encodeURIComponent(doc.id)}` as Route}
                    >
                      <Icon name="sparkle" /> Hỏi Trợ lý AI
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty asg-empty">
            <Icon name="book" />
            <strong>Chưa có học liệu mẫu riêng cho mã lớp này</strong>
            <p>Bạn có thể mở Kho học liệu chung (20 tài liệu) trực tiếp trong Trợ lý AI.</p>
          </div>
        )}
      </Section>

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
