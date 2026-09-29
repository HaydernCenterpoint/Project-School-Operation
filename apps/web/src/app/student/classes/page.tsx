"use client";

import type { Route } from "next";
import { ClassCard } from "@/components/Dashboard";
import { Icon } from "@/components/Icon";
import { useStudent } from "@/lib/student-context";

export default function ClassesPage() {
  const { data } = useStudent();
  if (!data) return null;
  const { classes } = data.session;

  return (
    <>
      <div className="page-title">
        <h2>Lớp học của tôi</h2>
        <p>{classes.length ? `Bạn đang theo học ${classes.length} lớp.` : "Bạn chưa được xếp vào lớp nào."}</p>
      </div>
      {classes.length ? (
        <div className="class-grid">
          {classes.map((item, index) => (
            <ClassCard
              key={item.id}
              item={item}
              index={index}
              count={data.assignments.filter((entry) => entry.classId === item.id).length}
              href={`/student/classes/${item.id}` as Route}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <Icon name="class" />
          <strong>Chưa có lớp học</strong>
          <p>Lớp được nhà trường phân công sẽ xuất hiện tại đây.</p>
        </div>
      )}
    </>
  );
}
