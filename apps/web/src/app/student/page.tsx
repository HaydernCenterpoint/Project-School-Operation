"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { newTab } from "@/components/AppShell";
import { Dashboard } from "@/components/Dashboard";
import { Icon } from "@/components/Icon";
import { TodayPanel } from "@/components/portal/TodayPanel";
import { useStudent } from "@/lib/student-context";

export default function StudentHome() {
  const { data, refresh } = useStudent();
  const [now, setNow] = useState(Date.now);
  const [refreshing, setRefreshing] = useState(false);
  if (!data) return null;

  return (
    <Dashboard
      name={data.session.user.displayName}
      classes={data.session.classes}
      assignments={data.assignments}
      submissions={data.submissions}
      aiUsage={data.aiUsage}
      now={now}
      links={{
        assignment: (id) => `/student/assignments/${id}` as Route,
        assignments: "/student/assignments",
        classes: "/student/classes",
        ai: "/student/ai",
        aiInNewTab: true,
      }}
      actions={
        <>
          <button
            className="button button-outline button-icon"
            type="button"
            aria-label="Làm mới dữ liệu"
            aria-busy={refreshing}
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              await refresh();
              setNow(Date.now());
              setRefreshing(false);
            }}
          >
            <Icon name="retry" />
          </button>
          <Link className="button button-outline button-sm" href="/student/classes">
            <Icon name="class" /> Lớp học
          </Link>
          <Link className="button button-dark button-sm" href="/student/ai" {...newTab}>
            <Icon name="sparkle" /> Học cùng AI
          </Link>
        </>
      }
    >
      <TodayPanel now={now} />
    </Dashboard>
  );
}
