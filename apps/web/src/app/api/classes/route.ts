import type { ApiPerson } from "@sao-do/contracts";
import {
  apiError,
  databaseError,
  getAcademicContext,
  getCommunityContext,
  hasExactKeys,
  isUuid,
  json,
  mapAcademicRpcError,
  mapClass,
  readJsonObject,
  singleRpcRow,
} from "@/lib/academic-api";

export async function GET(request: Request) {
  const auth = await getCommunityContext(request);
  if (auth.response) return auth.response;

  const { supabase, membership, user } = auth.context;
  const [{ data: tenant, error: tenantError }, classesResult, peopleResult] =
    await Promise.all([
      supabase
        .from("tenants")
        .select("id,name")
        .eq("id", membership.tenant_id)
        .single(),
      supabase
        .from("classes")
        .select("id,name,teacher_id,created_at")
        .order("created_at", { ascending: false }),
      membership.role === "admin"
        ? supabase
            .from("memberships")
            .select("user_id,display_name,email,role")
            .in("role", ["teacher", "student"])
            .order("display_name")
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (
    tenantError ||
    classesResult.error ||
    peopleResult.error ||
    !tenant
  ) {
    return databaseError("Unable to load academic session.");
  }

  const people: ApiPerson[] = (peopleResult.data ?? []).map((person) => ({
    id: person.user_id,
    displayName: person.display_name,
    email: person.email,
    role: person.role,
  }));

  return json({
    role: membership.role,
    tenant,
    user,
    classes: (classesResult.data ?? []).map(mapClass),
    people,
  });
}

export async function POST(request: Request) {
  const auth = await getAcademicContext(request);
  if (auth.response) return auth.response;
  if (auth.context.membership.role !== "admin") {
    return apiError(403, "forbidden", "Administrator access is required.");
  }

  const body = await readJsonObject(request);
  if (body.response) return body.response;
  if (!hasExactKeys(body.value, ["name", "teacherId", "studentIds"])) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }

  const name =
    typeof body.value.name === "string" ? body.value.name.trim() : "";
  const teacherId = body.value.teacherId;
  const studentIds = body.value.studentIds;
  if (
    name.length < 1 ||
    name.length > 200 ||
    !isUuid(teacherId) ||
    !Array.isArray(studentIds) ||
    studentIds.length < 1 ||
    studentIds.length > 500 ||
    !studentIds.every(isUuid) ||
    new Set(studentIds).size !== studentIds.length
  ) {
    return apiError(400, "invalid_body", "Class details are invalid.");
  }

  const { data, error } = await auth.context.supabase.rpc(
    "create_class_with_members",
    {
      class_name: name,
      teacher_id: teacherId,
      student_ids: studentIds,
    },
  );
  if (error) return mapAcademicRpcError(error);

  let row = singleRpcRow(data);
  if (isUuid(data)) {
    const result = await auth.context.supabase
      .from("classes")
      .select("id,name,teacher_id,created_at")
      .eq("id", data)
      .maybeSingle();
    if (result.error) return databaseError("Unable to load created class.");
    row = result.data;
  }
  if (!row) return databaseError("Class creation returned no record.");

  return json(
    {
      class: {
        ...mapClass(row),
        studentCount: studentIds.length,
      },
    },
    201,
  );
}
