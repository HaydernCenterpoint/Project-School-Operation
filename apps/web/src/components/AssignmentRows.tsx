import type { ApiClass, Assignment, Submission } from "@sao-do/contracts";
import type { Route } from "next";
import Link from "next/link";
import { classCode, dueState, formatDate, relativeDue } from "@/lib/format";
import { Icon } from "./Icon";

export function AssignmentRows({
  assignments,
  submissions,
  classes,
  now,
  empty,
}: {
  assignments: Assignment[];
  submissions: Submission[];
  classes?: ApiClass[];
  now: number;
  empty: React.ReactNode;
}) {
  if (!assignments.length) return <>{empty}</>;
  const byAssignment = new Map(submissions.map((item) => [item.assignmentId, item]));
  const byClass = new Map((classes ?? []).map((item) => [item.id, item]));

  return (
    <ul className="asg-ledger">
      {assignments.map((item) => {
        const submission = byAssignment.get(item.id);
        const course = byClass.get(item.classId);
        const state = submission
          ? submission.status === "reviewed"
            ? "reviewed"
            : "submitted"
          : dueState(item.dueAt, now);
        const statusLabel = submission
          ? submission.status === "reviewed"
            ? "Đã có phản hồi"
            : "Đã nộp bài"
          : relativeDue(item.dueAt, now);
        const snippet = item.instructions?.trim().replace(/\s+/g, " ");

        return (
          <li key={item.id} className={`asg-row is-${state}`}>
            <Link href={`/student/assignments/${item.id}` as Route} className="asg-row-link">
              <div className="asg-col-code">
                <code>{classCode(item.classId)}</code>
                <span>{course?.name ?? "Học phần chuyên ngành"}</span>
              </div>
              <div className="asg-col-main">
                <strong>{item.title}</strong>
                {snippet && <p>{snippet}</p>}
              </div>
              <div className="asg-col-due">
                <span className="asg-due-label">Hạn nộp</span>
                <time dateTime={item.dueAt ?? undefined}>
                  {item.dueAt ? formatDate(item.dueAt) : "Không giới hạn"}
                </time>
              </div>
              <div className="asg-col-status">
                <span className={`asg-status is-${state}`}>
                  <i aria-hidden="true" />
                  {statusLabel}
                </span>
                <span className="asg-chev" aria-hidden="true">
                  <Icon name="chevron" />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
