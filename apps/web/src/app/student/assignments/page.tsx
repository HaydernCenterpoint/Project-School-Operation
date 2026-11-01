"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AssignmentRows } from "@/components/AssignmentRows";
import { Icon } from "@/components/Icon";
import { PageTitle, Section } from "@/components/portal/Parts";
import { classCode, dueState } from "@/lib/format";
import { useHydratedNow } from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

const filters = [
  { key: "open", label: "Chưa nộp" },
  { key: "done", label: "Đã nộp" },
  { key: "all", label: "Tất cả" },
] as const;

export default function AssignmentsPage() {
  const { data } = useStudent();
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("open");
  const [classFilter, setClassFilter] = useState("");
  const [now] = useHydratedNow();
  const [query, setQuery] = useState("");
  const pathname = usePathname();

  // The header search submits ?q= here; read it without a Suspense boundary.
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q")?.trim() ?? "";
    queueMicrotask(() => {
      setQuery(q);
      if (q) setFilter("all");
    });
  }, [pathname]);

  if (!data) return null;
  const needle = query.trim().toLocaleLowerCase("vi");

  const submitted = new Set(data.submissions.map((item) => item.assignmentId));
  const reviewedCount = data.submissions.filter((item) => item.status === "reviewed").length;
  const totalCount = data.assignments.length;
  const doneCount = data.assignments.filter((item) => submitted.has(item.id)).length;
  const openList = data.assignments.filter((item) => !submitted.has(item.id));
  const openCount = openList.length;
  const overdueCount = openList.filter((item) => dueState(item.dueAt, now) === "overdue").length;
  const soonCount = openList.filter((item) => dueState(item.dueAt, now) === "soon").length;

  const donePct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const soonPct = totalCount ? Math.min(100 - donePct, Math.round((soonCount / totalCount) * 100)) : 0;
  const overduePct = totalCount ? Math.min(100 - donePct - soonPct, Math.round((overdueCount / totalCount) * 100)) : 0;

  const counts = {
    open: openCount,
    done: doneCount,
    all: totalCount,
  } as const;

  const visible = data.assignments
    .filter((item) =>
      filter === "all" ? true : filter === "done" ? submitted.has(item.id) : !submitted.has(item.id),
    )
    .filter((item) => !classFilter || item.classId === classFilter)
    .filter(
      (item) =>
        !needle ||
        item.title.toLocaleLowerCase("vi").includes(needle) ||
        item.instructions.toLocaleLowerCase("vi").includes(needle),
    )
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));

  return (
    <>
      <PageTitle title="Bài tập học phần" lead="Theo dõi hạn nộp, trạng thái chấm bài và yêu cầu từng lớp học phần">
        <div className="reg-window is-open" role="note">
          <span className="reg-window-dot" aria-hidden="true" />
          <span>Múi giờ chuẩn · <strong>GMT+7 (Việt Nam)</strong></span>
        </div>
      </PageTitle>

      <div className="asg-overview">
        <div className="reg-quota-card">
          <div className="reg-quota-head">
            <div>
              <span className="reg-label">Tiến độ hoàn thành bài tập</span>
              <p className="reg-figure">
                <strong>{doneCount}</strong>
                <span>/ {totalCount} bài tập ({donePct}%)</span>
              </p>
            </div>
            <span
              className={`reg-standing ${
                overdueCount > 0 ? "danger" : openCount > 0 ? "warn" : "good"
              }`}
            >
              {overdueCount > 0
                ? `${overdueCount} bài quá hạn cần xử lý`
                : openCount > 0
                  ? `Còn ${openCount} bài đang mở`
                  : "Đã hoàn thành toàn bộ"}
            </span>
          </div>
          <div
            className="reg-meter"
            role="img"
            aria-label={`Đã nộp ${doneCount} bài, sắp đến hạn ${soonCount} bài, quá hạn ${overdueCount} bài trên tổng số ${totalCount} bài tập`}
          >
            <span className="reg-meter-current" style={{ width: `${donePct}%` }} />
            <span
              className="asg-meter-soon"
              style={{ width: `${soonPct}%`, left: `${donePct}%` }}
            />
            <span
              className="reg-meter-extra"
              style={{ width: `${overduePct}%`, left: `${donePct + soonPct}%` }}
            />
          </div>
          <div className="reg-quota-foot">
            <span>
              <i className="dot-current" /> Đã nộp: <strong>{doneCount}</strong>
              {reviewedCount > 0 ? ` (${reviewedCount} có phản hồi)` : ""}
            </span>
            <span>
              <i className="dot-soon" /> Sắp đến hạn: <strong>{soonCount}</strong>
            </span>
            <span>
              <i className="dot-extra" /> Quá hạn: <strong>{overdueCount}</strong>
            </span>
          </div>
        </div>

        <div className="asg-filter-card">
          <div className="reg-picked-head">
            <span className="reg-label">Bộ lọc & tra cứu nhanh</span>
            <span className="reg-picked-count">{visible.length} hiển thị</span>
          </div>
          <div className="asg-filter-controls">
            <label className="asg-search-input">
              <Icon name="search" />
              <span className="sr-only">Tìm theo tên hoặc nội dung bài tập</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm tên bài tập, chủ đề…"
              />
            </label>
            <label className="asg-class-select">
              <span className="sr-only">Lọc theo lớp học phần</span>
              <select
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
              >
                <option value="">Tất cả lớp học phần ({data.session.classes.length})</option>
                {data.session.classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {classCode(cls.id)} · {cls.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <Section
        title="Sổ bài tập"
        action={
          <div className="asg-tabs" role="group" aria-label="Lọc trạng thái bài tập">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                <span>{item.label}</span>
                <code>{counts[item.key]}</code>
              </button>
            ))}
          </div>
        }
      >
        <AssignmentRows
          assignments={visible}
          submissions={data.submissions}
          classes={data.session.classes}
          now={now}
          empty={
            <div className="empty asg-empty">
              <Icon name={filter === "open" ? "checkCircle" : "assignment"} />
              <strong>{filter === "open" ? "Đã nộp đủ bài tập" : "Không có bài tập phù hợp"}</strong>
              <p>
                {filter === "open"
                  ? "Không còn bài tập nào đang chờ nộp trong danh sách này"
                  : "Thử đổi bộ lọc trạng thái hoặc từ khoá tìm kiếm"}
              </p>
            </div>
          }
        />
      </Section>
    </>
  );
}
