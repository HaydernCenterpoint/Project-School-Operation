// Student records and accounts for the management area (/quan-tri). Permissions live in the
// database (supabase/migrations/202609300002_student_records.sql); this file only calls it.

import { genders } from "./student-csv";
import { getSupabaseBrowserClient } from "./supabase-browser";

export { csvColumns, genders, parseCsv, readStudentCsv, toCsv, validateStudent, type ParsedRow } from "./student-csv";

export type StaffRole = "admin" | "staff" | "teacher";
export type StudentStatus = "active" | "suspended" | "graduated" | "withdrawn";

export const statusLabels: Record<StudentStatus, string> = {
  active: "Đang học",
  suspended: "Tạm khoá",
  graduated: "Đã tốt nghiệp",
  withdrawn: "Thôi học",
};

export type StudentRecord = {
  user_id: string;
  student_code: string;
  full_name: string;
  date_of_birth: string | null;
  gender: (typeof genders)[number] | null;
  class_name: string | null;
  faculty: string | null;
  major: string | null;
  cohort: string | null;
  phone: string | null;
  personal_email: string | null;
  status: StudentStatus;
  note: string;
  updated_at: string;
};

/** Fields staff type in; everything optional except code and name. */
export type StudentInput = Partial<Omit<StudentRecord, "user_id" | "status" | "updated_at">> & { student_code: string; full_name: string };

/** Teachers may change only these (the database enforces the same list). */
export const teacherFields = ["phone", "personal_email", "note"] as const;

export type ImportResult = { row_no: number; student_code: string; ok: boolean; message: string; temp_password: string | null };

const db = () => getSupabaseBrowserClient();

async function run<T>(query: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) {
    if (error.message === "rate_limited") throw new Error("Bạn thao tác quá nhanh. Chờ một lát rồi thử lại.");
    if (error.code === "23505") throw new Error("Mã sinh viên này đã có tài khoản.");
    if (error.code === "42501") throw new Error("Bạn không có quyền thực hiện thao tác này.");
    if (error.code === "22023" || error.code === "23514") throw new Error("Dữ liệu chưa hợp lệ. Kiểm tra mã sinh viên, ngày sinh, số điện thoại và email.");
    throw new Error("Không kết nối được máy chủ. Vui lòng thử lại.");
  }
  return data as T;
}

export const students = {
  /** The caller's role, or null when they have no staff-side access. */
  role: async (): Promise<{ role: StaffRole; name: string } | null> => {
    const { data: auth } = await db().auth.getUser();
    if (!auth.user) return null;
    const rows = await run<{ role: string; display_name: string | null }[]>(
      db().from("memberships").select("role, display_name").eq("user_id", auth.user.id),
    );
    const row = rows.find((item) => item.role === "admin" || item.role === "staff" || item.role === "teacher");
    return row ? { role: row.role as StaffRole, name: row.display_name ?? auth.user.email ?? "" } : null;
  },
  list: () => run<StudentRecord[]>(db().from("student_records").select("*").order("student_code")),
  create: (input: StudentInput) =>
    run<{ user_id: string; temp_password: string }[]>(db().rpc("staff_create_student", { p: input })).then((rows) => rows[0]!),
  import: (rows: StudentInput[]) => run<ImportResult[]>(db().rpc("staff_import_students", { rows })),
  update: (id: string, patch: Partial<StudentInput>) => run(db().rpc("staff_update_student", { target: id, p: patch })),
  setStatus: (id: string, status: StudentStatus) => run(db().rpc("staff_set_student_status", { target: id, new_status: status })),
  resetPassword: (id: string) => run<string>(db().rpc("staff_reset_password", { target: id })),
};
