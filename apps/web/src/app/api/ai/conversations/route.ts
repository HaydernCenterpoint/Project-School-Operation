import type { AiConversation } from "@sao-do/contracts";
import { apiError, getAcademicContext, json } from "@/lib/academic-api";

const pageSize = 30;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const before = params.get("before");
  if (
    [...params.keys()].some((key) => key !== "before") ||
    (before !== null && !Number.isFinite(Date.parse(before)))
  ) {
    return apiError(400, "invalid_query", "before must be an ISO timestamp.");
  }

  const auth = await getAcademicContext(request);
  if (auth.response) {
    return json({ conversations: [], nextCursor: null });
  }

  let query = auth.context.supabase
    .from("ai_conversations")
    .select("id,title,mode,updated_at")
    .order("updated_at", { ascending: false })
    .limit(pageSize);
  if (before) query = query.lt("updated_at", new Date(before).toISOString());

  const { data, error } = await query;
  if (error || !data) {
    return json({ conversations: [], nextCursor: null });
  }
  const conversations: AiConversation[] = data.map((row) => ({
    id: row.id,
    title: row.title,
    mode: row.mode,
    updatedAt: row.updated_at,
  }));
  return json({
    conversations,
    nextCursor: conversations.length === pageSize ? conversations.at(-1)!.updatedAt : null,
  });
}
