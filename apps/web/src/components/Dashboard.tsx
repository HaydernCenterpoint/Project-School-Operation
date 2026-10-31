import type { AiUsage, ApiClass, Assignment, Submission } from "@sao-do/contracts";
import type { Route } from "next";
import Link from "next/link";
import {
  classAccents,
  classCode,
  dueState,
  formatDate,
  greeting,
  relativeDue,
} from "@/lib/format";
import { AssignmentTable, type AssignmentRow } from "./AssignmentTable";
import { Icon, type IconName } from "./Icon";
import { CountUpStat } from "./landing/MotionPromptEffects";
import { PhuongTree } from "./landing/Phuong";

export type DashboardLinks = {
  assignment: (id: string) => Route;
  assignments: Route;
  classes: Route;
  ai: Route;
  /** The student AI workspace is a full-page tool opened in its own tab. */
  aiInNewTab?: boolean;
};

export function openAssignments(assignments: Assignment[], submissions: Submission[]) {
  const submitted = new Set(submissions.map((item) => item.assignmentId));
  return assignments
    .filter((item) => !submitted.has(item.id))
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
}

export function DueChip({ dueAt, now }: { dueAt: string | null; now: number }) {
  const state = dueState(dueAt, now);
  if (state === "none") return <span className="chip">Không có hạn</span>;
  return (
    <span className={`chip ${state === "later" ? "" : state}`}>
      <Icon name="clock" /> {relativeDue(dueAt, now)}
    </span>
  );
}

export function ClassCard({ item, index, count, href }: { item: ApiClass; index: number; count: number; href: Route }) {
  return (
    <Link href={href} className="class-card" style={{ "--accent": classAccents[index % classAccents.length] } as React.CSSProperties}>
      <div>
        <span className="code">{classCode(item.id)}</span>
        <h4>{item.name}</h4>
      </div>
      <footer>
        <span>{count ? `${count} bài tập` : "Chưa có bài tập"}</span>
        <Icon name="arrow" />
      </footer>
    </Link>
  );
}

const day = 24 * 3600 * 1000;
const vietnamOffset = 7 * 3600 * 1000; // No daylight saving in Vietnam.
const weekLabel = (time: number) => {
  const local = new Date(time + vietnamOffset);
  return `${local.getUTCDate()}/${local.getUTCMonth() + 1}`;
};

/** Assignments due in each of the next eight weeks (Monday start, Vietnam time). */
function weeklyDeadlines(assignments: Assignment[], submitted: Set<string>, now: number) {
  const local = new Date(now + vietnamOffset);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - vietnamOffset;
  const weekStart = midnight - ((local.getUTCDay() + 6) % 7) * day;
  const weeks = Array.from({ length: 8 }, (_, index) => ({
    label: weekLabel(weekStart + index * 7 * day),
    done: 0,
    open: 0,
  }));
  for (const item of assignments) {
    if (!item.dueAt) continue;
    const index = Math.floor((Date.parse(item.dueAt) - weekStart) / (7 * day));
    const week = weeks[index];
    if (week) week[submitted.has(item.id) ? "done" : "open"] += 1;
  }
  return weeks;
}

function DeadlineChart({ weeks }: { weeks: ReturnType<typeof weeklyDeadlines> }) {
  const max = Math.max(4, ...weeks.map((week) => week.done + week.open));
  const top = Math.ceil(max / 4) * 4;
  const [width, height, left, bottom] = [640, 220, 32, 28];
  const slot = (width - left) / weeks.length;
  const y = (value: number) => (height - bottom) * (1 - value / top) + 8;
  const summary = weeks.map((week) => `Tuần ${week.label}: ${week.done + week.open} bài`).join("; ");

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height + 8}`} role="img" aria-label={`Số bài tập đến hạn theo tuần. ${summary}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <g key={ratio}>
          <line x1={left} x2={width} y1={y(top * ratio)} y2={y(top * ratio)} className="grid" />
          <text x={left - 8} y={y(top * ratio) + 4} textAnchor="end">{top * ratio}</text>
        </g>
      ))}
      {weeks.map((week, index) => {
        const x = left + index * slot + slot * 0.28;
        const barWidth = slot * 0.44;
        return (
          <g key={week.label}>
            {week.done > 0 && <rect className="bar-done" x={x} width={barWidth} y={y(week.done)} height={y(0) - y(week.done)} rx="4" />}
            {week.open > 0 && <rect className="bar-open" x={x} width={barWidth} y={y(week.done + week.open)} height={y(week.done) - y(week.done + week.open)} rx="4" />}
            <text x={x + barWidth / 2} y={height + 4} textAnchor="middle">{week.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: number | string; label: string }) {
  return (
    <div className="stat-cell" data-spotlight>
      <span className="icon-box"><Icon name={icon} /></span>
      <strong><CountUpStat rawText={String(value)} showBar={false} /></strong>
      <span>{label}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  badge,
  tone,
  icon,
  href,
  action,
  newTab,
}: {
  label: string;
  value: string;
  badge: string;
  tone: "good" | "warn" | "neutral";
  icon: IconName;
  href: Route;
  action: string;
  newTab?: boolean;
}) {
  return (
    <div className="metric-cell">
      <div>
        <span className="metric-label">{label}</span>
        <p className="metric-value">
          {value} <span className={`badge ${tone}`}>{badge}</span>
        </p>
        <Link href={href} className="button button-outline button-xs" {...(newTab ? { target: "_blank", rel: "noopener" } : {})}>
          {action} <Icon name="arrow" />
        </Link>
      </div>
      <span className="icon-box"><Icon name={icon} /></span>
    </div>
  );
}

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

export function Dashboard({
  name,
  classes,
  assignments,
  submissions,
  aiUsage,
  links,
  now,
  actions,
  children,
}: {
  name: string;
  classes: ApiClass[];
  assignments: Assignment[];
  submissions: Submission[];
  aiUsage: AiUsage | null;
  links: DashboardLinks;
  now: number;
  actions?: React.ReactNode;
  /** Optional panels between the greeting and the progress frame (the student "Hôm nay" hub). */
  children?: React.ReactNode;
}) {
  const submitted = new Set(submissions.map((item) => item.assignmentId));
  const bySubmission = new Map(submissions.map((item) => [item.assignmentId, item]));
  const open = openAssignments(assignments, submissions);
  const soon = open.filter((item) => dueState(item.dueAt, now) === "soon").length;
  const overdue = open.filter((item) => dueState(item.dueAt, now) === "overdue").length;
  const reviewed = submissions.filter((item) => item.status === "reviewed").length;
  const classNames = new Map(classes.map((item) => [item.id, item.name]));
  const done = percent(assignments.length - open.length, assignments.length);

  const rows: AssignmentRow[] = assignments.map((item) => {
    const submission = bySubmission.get(item.id);
    const state = dueState(item.dueAt, now);
    return {
      id: item.id,
      title: item.title,
      className: classNames.get(item.classId) ?? "Lớp học",
      status: submission ? submission.status : state === "overdue" ? "overdue" : state === "soon" ? "soon" : "open",
      dueAt: item.dueAt,
      dueLabel: item.dueAt ? formatDate(item.dueAt) : "Không có hạn",
      remaining: submission ? "-" : relativeDue(item.dueAt, now),
      href: links.assignment(item.id),
    };
  });

  const update = overdue
    ? <>Bạn có <em className="warn">{overdue} bài tập quá hạn</em> chưa nộp</>
    : soon
      ? <>Bạn có <em className="warn">{soon} bài tập</em> cần nộp trong 3 ngày tới</>
      : open.length
        ? <>Còn <em>{open.length} bài tập</em> chưa nộp. Hãy lên kế hoạch sớm</>
        : <>Bạn đã nộp <em>tất cả bài tập</em> hiện có</>;

  return (
    <>
      <div className="dash-header">
        <div>
          <h2>
            {greeting(new Date(now))}, {name} <span className="sun" aria-hidden="true"><Icon name="sun" /></span>
          </h2>
          <p>Theo dõi việc học của bạn hôm nay</p>
        </div>
        {actions && <div className="dash-actions">{actions}</div>}
        <PhuongTree className="dash-tree" id="phuong-dash" />
      </div>

      {children}
      <div className="dash-frame">
        <div className="frame-row update-row">
          <div>
            <p className="update-meta">
              <span className="live-dot" aria-hidden="true" /> <strong>Cập nhật</strong> · {formatDate(new Date(now).toISOString())}
            </p>
            <p className="update-text">{update}</p>
          </div>
          <Link href={links.assignments} className="button button-outline button-xs">
            Xem bài tập <Icon name="arrow" />
          </Link>
        </div>

        <div className="frame-gap" aria-hidden="true" />
        <div className="frame-row split-row">
          <section className="frame-cell" id="tien-do" style={{ scrollMarginTop: 88 }} aria-labelledby="progress-title">
            <h3 className="cell-head" id="progress-title"><Icon name="trend" /> Tiến độ nộp bài</h3>
            <div className="cell-body">
              <div className="chart-head">
                <div>
                  <span className="metric-label">Đã nộp</span>
                  <p className="metric-value big">
                    {assignments.length - open.length}/{assignments.length}
                    <span className="badge good">{done}%</span>
                    <small>bài tập được giao</small>
                  </p>
                </div>
                <span className="chip-outline">8 tuần tới</span>
              </div>
              <div className="chart-scroll"><DeadlineChart weeks={weeklyDeadlines(assignments, submitted, now)} /></div>
              <p className="legend">
                <span><i className="bar-done" /> Đã nộp</span>
                <span><i className="bar-open" /> Chưa nộp</span>
                <span>Theo hạn nộp, giờ Việt Nam</span>
              </p>
            </div>
          </section>
          <section className="frame-cell" id="tong-quan-hoc-tap" style={{ scrollMarginTop: 88 }} aria-labelledby="summary-title">
            <h3 className="cell-head" id="summary-title"><Icon name="book" /> Tổng quan học tập</h3>
            <div className="stat-grid">
              <Stat icon="class" value={classes.length} label="Lớp đang học" />
              <Stat icon="assignment" value={assignments.length} label="Bài tập được giao" />
              <Stat icon="checkCircle" value={submissions.length} label="Bài đã nộp" />
              <Stat icon="message" value={reviewed} label="Có phản hồi" />
            </div>
          </section>
        </div>

        <div className="frame-gap" aria-hidden="true" />
        <div className="frame-row metric-row">
          <Metric
            label="Chưa nộp"
            value={String(open.length)}
            badge={`${percent(open.length, assignments.length)}%`}
            tone={open.length ? "warn" : "good"}
            icon="assignment"
            href={links.assignments}
            action="Xem bài tập"
          />
          <Metric
            label="Sắp đến hạn (3 ngày)"
            value={String(soon)}
            badge={overdue ? `${overdue} quá hạn` : soon ? "cần chú ý" : "đúng tiến độ"}
            tone={overdue || soon ? "warn" : "good"}
            icon="clock"
            href={links.assignments}
            action="Xem hạn nộp"
          />
          <Metric
            label="Lượt hỏi AI hôm nay"
            value={aiUsage ? `${aiUsage.used}/${aiUsage.limit}` : "-"}
            badge={aiUsage?.enabled ? `${percent(aiUsage.used, aiUsage.limit)}%` : "chưa bật"}
            tone="neutral"
            icon="sparkle"
            href={links.ai}
            action="Học cùng AI"
            newTab={links.aiInNewTab}
          />
        </div>

        <div className="frame-gap" aria-hidden="true" />
        <section className="frame-row table-row" id="bang-bai-tap" style={{ scrollMarginTop: 88 }} aria-labelledby="table-title">
          <h3 className="cell-head" id="table-title"><Icon name="list" /> Bài tập & hạn nộp</h3>
          <AssignmentTable rows={rows} />
        </section>
      </div>
    </>
  );
}
