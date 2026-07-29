import type { AiTutorCitationDetail } from "@sao-do/contracts";
import { getAiProviderConfiguration } from "@/lib/ai-gateway";
import {
  apiError,
  databaseError,
  getAcademicContext,
  hasExactKeys,
  isRecord,
  isUuid,
  json,
} from "@/lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };

function isBoundedText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

type CitationDetailRow = Omit<AiTutorCitationDetail, "excerpt"> & {
  content: string;
};

function isCitationDetailRow(value: unknown): value is CitationDetailRow {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["id", "title", "sourceName", "pageNumber", "content"]) &&
    isUuid(value.id) &&
    isBoundedText(value.title, 300) &&
    isBoundedText(value.sourceName, 300) &&
    (value.pageNumber === null ||
      (typeof value.pageNumber === "number" &&
        Number.isInteger(value.pageNumber) &&
        value.pageNumber >= 1 &&
        value.pageNumber <= 100_000)) &&
    isBoundedText(value.content, 8_000)
  );
}

export async function GET(request: Request, route: RouteContext) {
  const { id } = await route.params;
  const url = new URL(request.url);
  const classIds = url.searchParams.getAll("classId");
  if (
    !isUuid(id) ||
    [...url.searchParams.keys()].some((key) => key !== "classId") ||
    classIds.length !== 1 ||
    !isUuid(classIds[0])
  ) {
    return apiError(404, "not_found", "Resource not found.");
  }

  const auth = await getAcademicContext(request);
  if (auth.response) return auth.response;
  if (auth.context.membership.role !== "student") {
    return apiError(403, "forbidden", "Student access is required.");
  }
  if (getAiProviderConfiguration().error) {
    return apiError(503, "ai_unavailable", "AI Tutor is unavailable.");
  }

  const result = await auth.context.supabase.rpc("get_tutor_citation_detail", {
    p_chunk_id: id,
    p_class_id: classIds[0],
  });
  if (result.error) {
    return databaseError("Unable to load AI Tutor citation.");
  }
  if (!Array.isArray(result.data) || result.data.length > 1) {
    return databaseError("AI Tutor citation returned an invalid record.");
  }
  if (result.data.length === 0) {
    return apiError(404, "not_found", "Resource not found.");
  }
  const row = result.data[0];
  if (!isCitationDetailRow(row)) {
    return databaseError("AI Tutor citation returned an invalid record.");
  }
  const citation: AiTutorCitationDetail = {
    id: row.id,
    title: row.title,
    sourceName: row.sourceName,
    pageNumber: row.pageNumber,
    excerpt: row.content,
  };
  return json(citation);
}
