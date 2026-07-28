import {
  apiError,
  getCommunityContext,
  hasExactKeys,
  isUuid,
  json,
  mapCommunityRpcError,
  readJsonObject,
} from "@/lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, route: RouteContext) {
  const { id } = await route.params;
  if (!isUuid(id)) return apiError(404, "not_found", "Resource not found.");
  const auth = await getCommunityContext(request);
  if (auth.response) return auth.response;
  const body = await readJsonObject(request);
  if (body.response) return body.response;
  if (
    !hasExactKeys(body.value, ["active"]) ||
    typeof body.value.active !== "boolean"
  ) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }
  const { data, error } = await auth.context.supabase.rpc(
    "set_community_block",
    { p_blocked: body.value.active, p_user_id: id },
  );
  if (error) return mapCommunityRpcError(error);
  return json({ active: data === true });
}
