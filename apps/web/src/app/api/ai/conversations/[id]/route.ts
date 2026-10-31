import type { AiMessage } from "@sao-do/contracts";
import {
  apiError,
  databaseError,
  getAcademicContext,
  isUuid,
  json,
} from "@/lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, route: RouteContext) {
  const { id } = await route.params;
  if (!isUuid(id)) return apiError(404, "not_found", "Resource not found.");
  const auth = await getAcademicContext(request);
  if (auth.response) return auth.response;
  const { supabase } = auth.context;

  const [conversation, messages] = await Promise.all([
    supabase
      .from("ai_conversations")
      .select("id,title,mode,updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ai_messages")
      .select("id,role,content,status,created_at")
      .eq("conversation_id", id)
      .order("created_at")
      .order("role")
      .limit(200),
  ]);
  if (conversation.error || messages.error) return databaseError();
  if (!conversation.data) return apiError(404, "not_found", "Resource not found.");

  return json({
    conversation: {
      id: conversation.data.id,
      title: conversation.data.title,
      mode: conversation.data.mode,
      updatedAt: conversation.data.updated_at,
    },
    messages: messages.data.map(
      (row): AiMessage => ({
        id: row.id,
        role: row.role,
        content: row.content,
        status: row.status,
        createdAt: row.created_at,
      }),
    ),
  });
}

export async function DELETE(request: Request, route: RouteContext) {
  const { id } = await route.params;
  if (!isUuid(id)) return apiError(404, "not_found", "Resource not found.");
  const auth = await getAcademicContext(request);
  if (auth.response) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  const { data, error } = await auth.context.supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return databaseError();
  if (!data.length) return apiError(404, "not_found", "Resource not found.");
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
