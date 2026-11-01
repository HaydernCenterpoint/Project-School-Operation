"use client";

import type { Route } from "next";
import { useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { TodayPanel } from "@/components/portal/TodayPanel";
import { useStudent } from "@/lib/student-context";

export default function StudentHome() {
  const { data } = useStudent();
  const [now] = useState(Date.now);
  if (!data) return null;

  return (
    <Dashboard
      name={data.session.user.displayName}
      classes={data.session.classes}
      assignments={data.assignments}
      submissions={data.submissions}
      aiUsage={data.aiUsage}
      now={now}
      hideHeader
      links={{
        assignment: (id) => `/student/assignments/${id}` as Route,
        assignments: "/student/assignments",
        classes: "/student/classes",
        ai: "/student/ai",
        aiInNewTab: true,
      }}
    >
      <TodayPanel now={now} />
    </Dashboard>
  );
}
