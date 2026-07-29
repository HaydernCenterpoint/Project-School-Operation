import {
  apiError,
  getCommunityContext,
  hasExactKeys,
  isUuid,
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
  if (!hasExactKeys(body.value, [])) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }
  const { data, error } = await auth.context.supabase.rpc(
    "leave_community_club",
    { p_space_id: id },
  );
  if (error) return mapCommunityRpcError(error);
  if (data !== true) return apiError(404, "not_found", "Resource not found.");
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
