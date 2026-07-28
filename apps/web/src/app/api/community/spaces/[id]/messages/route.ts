import {
  apiError,
  communityMentionCount,
  databaseError,
  getCommunityContext,
  hasExactKeys,
  isUuid,
  json,
  mapCommunityMessage,
  mapCommunityRpcError,
  readJsonObject,
  requiresCommunityPrivacyConfirmation,
  rpcRows,
} from "@/lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };

async function listMessages(
  context: Awaited<ReturnType<typeof getCommunityContext>> & {
    context: NonNullable<
      Awaited<ReturnType<typeof getCommunityContext>>["context"]
    >;
  },
  spaceId: string,
  messageId?: string,
) {
  return context.context.supabase.rpc("list_community_messages", {
    p_space_id: spaceId,
    ...(messageId ? { p_message_id: messageId } : {}),
  });
}

export async function GET(request: Request, route: RouteContext) {
  const { id } = await route.params;
  if (!isUuid(id)) return apiError(404, "not_found", "Resource not found.");
  if ([...new URL(request.url).searchParams.keys()].length > 0) {
    return apiError(400, "invalid_query", "Query parameters are not supported.");
  }
  const auth = await getCommunityContext(request);
  if (auth.response) return auth.response;

  const { data, error } = await listMessages(auth, id);
  if (error) return mapCommunityRpcError(error);
  const messages = rpcRows(data)
    .map(mapCommunityMessage)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  return json({ messages });
}

export async function POST(request: Request, route: RouteContext) {
  const { id } = await route.params;
  if (!isUuid(id)) return apiError(404, "not_found", "Resource not found.");
  const auth = await getCommunityContext(request);
  if (auth.response) return auth.response;
  const messageId = request.headers.get("Idempotency-Key");
  if (!isUuid(messageId)) {
    return apiError(
      400,
      "invalid_idempotency_key",
      "Idempotency-Key must be a UUID.",
    );
  }

  const body = await readJsonObject(request);
  if (body.response) return body.response;
  if (
    !hasExactKeys(body.value, [
      "text",
      "replyToId",
      "privacyWarningConfirmed",
    ])
  ) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }
  const text =
    typeof body.value.text === "string" ? body.value.text.trim() : "";
  const replyToId = body.value.replyToId;
  if (
    text.length < 1 ||
    text.length > 4_000 ||
    (replyToId !== null && !isUuid(replyToId)) ||
    typeof body.value.privacyWarningConfirmed !== "boolean" ||
    communityMentionCount(text) > 5
  ) {
    return apiError(
      400,
      "invalid_body",
      "Message details are invalid.",
    );
  }
  if (
    requiresCommunityPrivacyConfirmation(text) &&
    !body.value.privacyWarningConfirmed
  ) {
    return apiError(
      422,
      "privacy_confirmation_required",
      "Confirm the privacy warning before posting sensitive information.",
    );
  }

  const { data, error } = await auth.context.supabase.rpc(
    "post_community_message",
    {
      p_message_id: messageId,
      p_space_id: id,
      p_text: text,
      p_reply_to_id: replyToId,
      p_mentioned_user_ids: [],
      p_privacy_warning_confirmed: body.value.privacyWarningConfirmed,
    },
  );
  if (error) return mapCommunityRpcError(error);
  const createdId = isUuid(data) ? data : messageId;

  const listed = await listMessages(auth, id, createdId);
  if (listed.error) return mapCommunityRpcError(listed.error);
  const row = rpcRows(listed.data)[0];
  if (!row) return databaseError("Message creation returned no record.");
  return json({ message: mapCommunityMessage(row) }, 201);
}
