import type { ApiClass, Assignment, Submission } from "@sao-do/contracts";

// Synthetic data for the guest demo and the welcome-page preview only.
// It never reaches an API and is always labelled as illustrative.

const day = 24 * 3600 * 1000;

export function demoData(now: number) {
  const iso = (offset: number) => new Date(now + offset).toISOString();
  const classes: ApiClass[] = [
    { id: "a3f91c20-demo", name: "Lập trình hướng đối tượng", teacherId: "demo", createdAt: iso(-60 * day) },
    { id: "b7d42e10-demo", name: "Cơ sở dữ liệu", teacherId: "demo", createdAt: iso(-60 * day) },
    { id: "e5c08a40-demo", name: "Tiếng Anh chuyên ngành", teacherId: "demo", createdAt: iso(-60 * day) },
  ];
  const assignment = (id: string, classId: string, title: string, due: number): Assignment => ({
    id, tenantId: "demo", classId, createdBy: "demo", title, instructions: "",
    status: "published", dueAt: iso(due), createdAt: iso(-7 * day),
  });
  const assignments = [
    assignment("demo-a1", classes[0]!.id, "Bài thực hành: Kế thừa và đa hình", 1.5 * day),
    assignment("demo-a2", classes[1]!.id, "Thiết kế lược đồ quan hệ cho thư viện", 5 * day),
    assignment("demo-a3", classes[2]!.id, "Viết email xin thực tập (150 từ)", 9 * day),
    assignment("demo-a4", classes[1]!.id, "Truy vấn SQL cơ bản", -2 * day),
    assignment("demo-a5", classes[0]!.id, "Thiết kế lớp cho hệ thống thư viện", 13 * day),
  ];
  const submissions: Submission[] = [
    {
      id: "demo-s1", tenantId: "demo", assignmentId: "demo-a4", studentId: "demo",
      studentDisplayName: "Khách", content: "", idempotencyKey: "demo", status: "reviewed",
      submittedAt: iso(-3 * day), feedbackAt: iso(-1 * day), feedbackBy: "demo",
      feedback: "Câu truy vấn đúng. Em nên đặt bí danh cho bảng để câu lệnh JOIN dễ đọc hơn.",
    },
  ];
  return { classes, assignments, submissions };
}
