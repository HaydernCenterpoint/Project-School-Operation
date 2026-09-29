"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "./Icon";

export type AssignmentRow = {
  id: string;
  title: string;
  className: string;
  status: "open" | "soon" | "overdue" | "submitted" | "reviewed";
  dueAt: string | null;
  dueLabel: string;
  remaining: string;
  href: Route;
};

const statusLabel: Record<AssignmentRow["status"], string> = {
  open: "Chưa nộp",
  soon: "Sắp đến hạn",
  overdue: "Quá hạn",
  submitted: "Đã nộp",
  reviewed: "Có phản hồi",
};
const statusOrder = ["overdue", "soon", "open", "submitted", "reviewed"];

type SortKey = "title" | "status" | "due";

export function AssignmentTable({ rows }: { rows: AssignmentRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "due", asc: true });
  const sorted = [...rows].sort((a, b) => {
    const value =
      sort.key === "title"
        ? a.title.localeCompare(b.title, "vi")
        : sort.key === "status"
          ? statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
          : (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999");
    return sort.asc ? value : -value;
  });

  const header = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.asc ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => setSort((current) => ({ key, asc: current.key === key ? !current.asc : true }))}>
        {label} <Icon name="sort" />
      </button>
    </th>
  );

  if (!rows.length) {
    return (
      <div className="empty" style={{ margin: 16 }}>
        <Icon name="assignment" />
        <strong>Chưa có bài tập</strong>
        <p>Bài tập giảng viên công bố sẽ xuất hiện tại đây.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {header("title", "Bài tập")}
            {header("status", "Trạng thái")}
            {header("due", "Hạn nộp")}
            <th scope="col">Thời gian</th>
            <th scope="col"><span className="sr-only">Mở</span></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id}>
              <td>
                <Link href={row.href} className="cell-title">
                  <strong>{row.title}</strong>
                  <small>{row.className}</small>
                </Link>
              </td>
              <td><span className={`pill ${row.status}`}>{statusLabel[row.status]}</span></td>
              <td className="muted-cell">{row.dueLabel}</td>
              <td className="muted-cell">{row.remaining}</td>
              <td>
                <Link href={row.href} className="icon-button" aria-label={`Mở bài tập ${row.title}`}>
                  <Icon name="more" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
