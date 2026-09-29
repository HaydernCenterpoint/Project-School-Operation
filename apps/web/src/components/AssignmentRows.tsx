import type { Assignment, Submission } from "@sao-do/contracts";
import type { Route } from "next";
import Link from "next/link";
import { formatDeadline } from "@/lib/format";
import { DueChip } from "./Dashboard";
import { Icon } from "./Icon";

export function AssignmentRows({
  assignments,
  submissions,
  now,
  empty,
}: {
  assignments: Assignment[];
  submissions: Submission[];
  now: number;
  empty: React.ReactNode;
}) {
  if (!assignments.length) return <>{empty}</>;
  const byAssignment = new Map(submissions.map((item) => [item.assignmentId, item]));

  return (
    <ul className="row-list">
      {assignments.map((item) => {
        const submission = byAssignment.get(item.id);
        return (
          <li key={item.id}>
            <Link href={`/student/assignments/${item.id}` as Route}>
              <span className={`tile-icon ${submission ? "green" : ""}`}>
                <Icon name={submission ? "checkCircle" : "assignment"} />
              </span>
              <span className="item-text">
                <strong>{item.title}</strong>
                <small>Hạn nộp: {formatDeadline(item.dueAt)}</small>
              </span>
              <span className="row-meta">
                {submission ? (
                  <span className={`chip ${submission.status}`}>
                    {submission.status === "reviewed" ? "Đã có phản hồi" : "Đã nộp"}
                  </span>
                ) : (
                  <DueChip dueAt={item.dueAt} now={now} />
                )}
                <span className="chev"><Icon name="chevron" /></span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
