import {
  apiError,
  databaseError,
  getAcademicContext,
  hasExactKeys,
  isUuid,
  json,
  mapAcademicRpcError,
  mapAssignment,
  readJsonObject,
  singleRpcRow,
} from "@/lib/academic-api";

function optionalClassId(request: Request) {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => key !== "classId")) return null;
  const values = params.getAll("classId");
  if (values.length === 0) return undefined;
  return values.length === 1 && isUuid(values[0]) ? values[0] : null;
}

export async function GET(request: Request) {
  const classId = optionalClassId(request);
  if (classId === null) {
    return apiError(400, "invalid_query", "classId must be a single UUID.");
  }

  const auth = await getAcademicContext(request);
  if (auth.response) return auth.response;

  let query = auth.context.supabase
    .from("assignments")
    .select(
      "id,tenant_id,class_id,created_by,title,instructions,status,due_at,created_at",
    )
    .order("created_at", { ascending: false });
  if (classId) query = query.eq("class_id", classId);

  const { data, error } = await query;
  if (error) return databaseError("Unable to load assignments.");
  return json({ assignments: (data ?? []).map(mapAssignment) });
}

export async function POST(request: Request) {
  const auth = await getAcademicContext(request);
  if (auth.response) return auth.response;

  const body = await readJsonObject(request);
  if (body.response) return body.response;
  if (
    !hasExactKeys(body.value, [
      "classId",
      "title",
      "instructions",
      "status",
      "dueAt",
    ])
  ) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }

  const classId = body.value.classId;
  const title =
    typeof body.value.title === "string" ? body.value.title.trim() : "";
  const instructions =
    typeof body.value.instructions === "string"
      ? body.value.instructions.trim()
      : "";
  const status = body.value.status;
  const dueAt = body.value.dueAt;
  const validDueAt =
    dueAt === null ||
    (typeof dueAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        dueAt,
      ) &&
      Number.isFinite(Date.parse(dueAt)) &&
      Date.parse(dueAt) > Date.now());

  if (
    !isUuid(classId) ||
    title.length < 1 ||
    title.length > 200 ||
    instructions.length > 10_000 ||
    status !== "published" ||
    !validDueAt
  ) {
    return apiError(400, "invalid_body", "Assignment details are invalid.");
  }

  const id = crypto.randomUUID();
  const { data, error } = await auth.context.supabase.rpc("save_assignment", {
    p_assignment_id: id,
    p_class_id: classId,
    p_title: title,
    p_instructions: instructions,
    p_status: status,
    p_due_at: dueAt,
  });
  if (error) return mapAcademicRpcError(error);

  let row = singleRpcRow(data);
  if (isUuid(data)) {
    const result = await auth.context.supabase
      .from("assignments")
      .select(
        "id,tenant_id,class_id,created_by,title,instructions,status,due_at,created_at",
      )
      .eq("id", data)
      .maybeSingle();
    if (result.error) return databaseError("Unable to load created assignment.");
    row = result.data;
  }
  if (!row) return databaseError("Assignment creation returned no record.");
  return json({ assignment: mapAssignment(row) }, 201);
}
