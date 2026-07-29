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
  if (!["moderator", "admin"].includes(auth.context.membership.role)) {
    return apiError(403, "forbidden", "Moderator access is required.");
  }

  const body = await readJsonObject(request);
  if (body.response) return body.response;
  if (!hasExactKeys(body.value, ["seconds"])) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }
  const seconds = body.value.seconds;
  if (!Number.isInteger(seconds) || Number(seconds) < 0 || Number(seconds) > 300) {
    return apiError(400, "invalid_body", "Slow mode must be 0 to 300 seconds.");
  }

  const { data, error } = await auth.context.supabase.rpc(
    "set_community_slow_mode",
    { p_space_id: id, p_seconds: seconds },
  );
  if (error) return mapCommunityRpcError(error);
  return json({ slowModeSeconds: Number(data) });
}
