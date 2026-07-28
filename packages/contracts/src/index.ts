export const roles = ["admin", "teacher", "student"] as const;

export type Role = (typeof roles)[number];

export type TenantSummary = {
  id: string;
  name: string;
  campusName: string;
};

export type ClassSummary = {
  id: string;
  code: string;
  name: string;
  teacherName: string;
  studentCount: number;
  capacity: number;
};

export type ClassMember = {
  id: string;
  fullName: string;
  email: string;
  role: Extract<Role, "teacher" | "student">;
};

export const assignmentStatuses = ["draft", "published"] as const;
export type AssignmentStatus = (typeof assignmentStatuses)[number];

export const submissionStatuses = ["submitted", "reviewed"] as const;
export type SubmissionStatus = (typeof submissionStatuses)[number];

export type ApiTenant = {
  id: string;
  name: string;
};

export type ApiUser = {
  id: string;
  displayName: string;
  email: string;
};

export type ApiPerson = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
};

export type ApiClass = {
  id: string;
  name: string;
  teacherId: string;
  createdAt: string;
};

export type AcademicSession = {
  role: Role;
  tenant: ApiTenant;
  user: ApiUser;
  classes: ApiClass[];
  people: ApiPerson[];
};

export type Assignment = {
  id: string;
  tenantId: string;
  classId: string;
  createdBy: string;
  title: string;
  instructions: string;
  status: AssignmentStatus;
  dueAt: string | null;
  createdAt: string;
};

export type Submission = {
  id: string;
  tenantId: string;
  assignmentId: string;
  studentId: string;
  studentDisplayName: string;
  content: string;
  idempotencyKey: string;
  status: SubmissionStatus;
  submittedAt: string;
  feedback: string | null;
  feedbackAt: string | null;
  feedbackBy: string | null;
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

export function isAssignmentStatus(
  value: unknown,
): value is AssignmentStatus {
  return (
    typeof value === "string" &&
    assignmentStatuses.includes(value as AssignmentStatus)
  );
}
