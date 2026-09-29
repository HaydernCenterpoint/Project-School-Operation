"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AssignmentRows } from "@/components/AssignmentRows";
import { Icon } from "@/components/Icon";
import { useStudent } from "@/lib/student-context";

const filters = [
  { key: "open", label: "Chưa nộp" },
  { key: "done", label: "Đã nộp" },
  { key: "all", label: "Tất cả" },
] as const;

export default function AssignmentsPage() {
  const { data } = useStudent();
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("open");
  const [now] = useState(Date.now);
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
  const needle = query.toLocaleLowerCase("vi");

  const submitted = new Set(data.submissions.map((item) => item.assignmentId));
  const visible = data.assignments
    .filter((item) =>
      filter === "all" ? true : filter === "done" ? submitted.has(item.id) : !submitted.has(item.id),
    )
    .filter((item) => !needle || item.title.toLocaleLowerCase("vi").includes(needle))
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));

  return (
    <>
      <div className="page-title">
        <h2>Bài tập</h2>
        <p>Hạn nộp được hiển thị theo giờ Việt Nam.</p>
      </div>
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Lọc bài tập">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {query && (
          <span className="chip">
            Kết quả cho “{query}”
            <button type="button" className="chip-clear" aria-label="Xoá tìm kiếm" onClick={() => setQuery("")}>×</button>
          </span>
        )}
      </div>
      <AssignmentRows
        assignments={visible}
        submissions={data.submissions}
        now={now}
        empty={
          <div className="empty">
            <Icon name={filter === "open" ? "checkCircle" : "assignment"} />
            <strong>{filter === "open" ? "Bạn đã nộp hết bài tập" : "Chưa có bài tập"}</strong>
            <p>
              {filter === "open"
                ? "Không còn bài nào đang chờ. Bạn có thể ôn tập cùng trợ lý AI."
                : "Bài tập sẽ xuất hiện khi giảng viên công bố."}
            </p>
          </div>
        }
      />
    </>
  );
}
