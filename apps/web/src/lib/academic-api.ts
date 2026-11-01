import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { clientIp, rateLimit } from "./rate-limit";
import {
  isRole,
  type ApiClass,
  type Assignment,
  type CommunityAuthor,
  type CommunityMessage,
  type CommunityReport,
  type CommunitySpace,
  type Role,
  type Submission,
} from "@sao-do/contracts";

type Membership = {
  tenant_id: string;
  user_id: string;
  role: Role;
  display_name: string;
  email: string;
};

export type AcademicContext = {
  supabase: SupabaseClient;
  token: string;
  user: { id: string; displayName: string; email: string };
  membership: Membership;
};

type ContextResult =
  | { context: AcademicContext; response?: never }
  | { context?: never; response: Response };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxJsonBodyBytes = 64 * 1024;

export function json(
  data: unknown,
  status = 200,
  extraHeaders?: HeadersInit,
) {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "no-store");
  return Response.json(data, {
    status,
    headers,
  });
}

export function apiError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
) {
  return json({ error: { code, message } }, status, headers);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

export function isJsonContentType(request: Request) {
  return (
    request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ===
    "application/json"
  );
}

export async function readJsonObject(
  request: Request,
): Promise<
  | { value: Record<string, unknown>; response?: never }
  | { value?: never; response: Response }
> {
  if (!isJsonContentType(request)) {
    return {
      response: apiError(
        415,
        "unsupported_media_type",
        "Content-Type must be application/json.",
      ),
    };
  }

  try {
    const declaredLength = request.headers.get("content-length");
    if (
      declaredLength &&
      (!/^\d+$/.test(declaredLength) ||
        Number(declaredLength) > maxJsonBodyBytes)
    ) {
      return {
        response: apiError(
          413,
          "payload_too_large",
          "JSON body must not exceed 64 KiB.",
        ),
      };
    }

    const reader = request.body?.getReader();
    if (!reader) {
      return {
        response: apiError(400, "invalid_json", "Request body is not valid JSON."),
      };
    }
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      totalBytes += chunk.byteLength;
      if (totalBytes > maxJsonBodyBytes) {
        await reader.cancel();
        return {
          response: apiError(
            413,
            "payload_too_large",
            "JSON body must not exceed 64 KiB.",
          ),
        };
      }
      chunks.push(chunk);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (!isRecord(value)) {
      return {
        response: apiError(400, "invalid_body", "JSON body must be an object."),
      };
    }
    return { value };
  } catch {
    return {
      response: apiError(400, "invalid_json", "Request body is not valid JSON."),
    };
  }
}

function serverEnvironment() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

async function getAuthenticatedContext(
  request: Request,
): Promise<ContextResult> {
  // Per IP before any work, so a flood of bad tokens never reaches Supabase Auth.
  const ipLimited = await rateLimit("ip", clientIp(request));
  if (ipLimited) return { response: ipLimited };

  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) {
    return {
      response: apiError(401, "unauthorized", "A valid Bearer token is required."),
    };
  }

  const { url, anonKey } = serverEnvironment();
  if (!url || !anonKey) {
    return {
      response: apiError(500, "server_configuration", "API is not configured."),
    };
  }

  const token = match[1]!;
  const supabase = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return {
      response: apiError(401, "unauthorized", "A valid Bearer token is required."),
    };
  }
  const userLimited = await rateLimit("user", user.id);
  if (userLimited) return { response: userLimited };

  const { data, error } = await supabase
    .from("memberships")
    .select("tenant_id,user_id,role,display_name,email")
    .eq("user_id", user.id)
    .limit(2);

  if (error) {
    return {
      response: apiError(500, "membership_lookup_failed", "Unable to load membership."),
    };
  }
  if (data.length !== 1 || !isRole(data[0]?.role)) {
    return {
      response: apiError(
        403,
        "membership_required",
        "Exactly one active membership is required.",
      ),
    };
  }

  return {
    context: {
      supabase,
      token,
      user: {
        id: user.id,
        displayName: data[0].display_name,
        email: user.email ?? data[0].email,
      },
      membership: data[0] as Membership,
    },
  };
}

export async function getCommunityContext(request: Request) {
  return getAuthenticatedContext(request);
}

export async function getAcademicContext(
  request: Request,
): Promise<ContextResult> {
  const result = await getAuthenticatedContext(request);
  if (result.response) return result;
  if (result.context.membership.role === "moderator") {
    return {
      response: apiError(
        403,
        "forbidden",
        "Academic access is not available to moderators.",
      ),
    };
  }
  return result;
}

export function databaseError(message = "Unable to complete the request.") {
  return apiError(500, "database_error", message);
}

export function mapClass(row: Record<string, unknown>): ApiClass {
  return {
    id: String(row.id),
    name: String(row.name),
    teacherId: String(row.teacher_id),
    createdAt: String(row.created_at),
  };
}

export function mapAssignment(row: Record<string, unknown>): Assignment {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    classId: String(row.class_id),
    createdBy: String(row.created_by),
    title: String(row.title),
    instructions: String(row.instructions),
    status: row.status as Assignment["status"],
    dueAt: row.due_at === null ? null : String(row.due_at),
    createdAt: String(row.created_at),
  };
}

export function mapSubmission(
  row: Record<string, unknown>,
  studentDisplayName = String(row.student_id),
): Submission {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    assignmentId: String(row.assignment_id),
    studentId: String(row.student_id),
    studentDisplayName,
    content: String(row.content),
    idempotencyKey: String(row.idempotency_key),
    status: row.status as Submission["status"],
    submittedAt: String(row.submitted_at),
    feedback: row.feedback === null ? null : String(row.feedback),
    feedbackAt: row.feedback_at === null ? null : String(row.feedback_at),
    feedbackBy: row.feedback_by === null ? null : String(row.feedback_by),
  };
}

export function singleRpcRow(data: unknown): Record<string, unknown> | null {
  const value = Array.isArray(data) ? data[0] : data;
  return isRecord(value) ? value : null;
}

function nullableString(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

function nonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

function mapCommunityAuthor(
  row: Record<string, unknown>,
  prefix = "author_",
): CommunityAuthor {
  return {
    id: String(row[`${prefix}id`]),
    displayName: String(row[`${prefix}display_name`]),
    role: row[`${prefix}role`] as Role,
    blockedByMe: Boolean(
      row[prefix === "author_" ? "blocked_by_me" : `${prefix}blocked_by_me`],
    ),
  };
}

export function mapCommunitySpace(
  row: Record<string, unknown>,
): CommunitySpace {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    kind: row.kind as CommunitySpace["kind"],
    name: String(row.name),
    classId: nullableString(row.class_id),
    slowModeSeconds: nonNegativeInteger(row.slow_mode_seconds),
    muted: Boolean(row.muted),
    canLeave: Boolean(row.can_leave),
    canPost: Boolean(row.can_post),
  };
}

export function mapCommunityMessage(
  row: Record<string, unknown>,
): CommunityMessage {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    spaceId: String(row.space_id),
    author: mapCommunityAuthor(row),
    text: String(row.text),
    replyTo:
      row.reply_to_id === null || row.reply_to_id === undefined
        ? null
        : {
            id: String(row.reply_to_id),
            authorDisplayName: String(row.reply_author_display_name),
            text: String(row.reply_text),
          },
    reaction: {
      kind: "like",
      count: nonNegativeInteger(row.reaction_count),
      reactedByMe: Boolean(row.reacted_by_me),
    },
    report: {
      count: nonNegativeInteger(row.report_count),
      reportedByMe: Boolean(row.reported_by_me),
    },
    hidden: Boolean(row.hidden),
    createdAt: String(row.created_at),
  };
}

export function mapCommunityReport(
  row: Record<string, unknown>,
): CommunityReport {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    message: {
      id: String(row.message_id),
      spaceId: String(row.space_id),
      author: {
        id: String(row.author_id),
        displayName: String(row.author_display_name),
        role: row.author_role as Role,
      },
      text: String(row.message_text),
      hidden: Boolean(row.hidden),
      createdAt: String(row.message_created_at),
    },
    reporter: {
      id: String(row.reporter_id),
      displayName: String(row.reporter_display_name),
      role: row.reporter_role as Role,
    },
    reason: row.reason as CommunityReport["reason"],
    detail: nullableString(row.detail),
    status: row.status as CommunityReport["status"],
    createdAt: String(row.created_at),
    resolvedAt: nullableString(row.resolved_at),
    resolvedBy: nullableString(row.resolved_by),
  };
}

export function rpcRows(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return isRecord(data) ? [data] : [];
  return data.filter(isRecord);
}

const sensitiveCommunityPatterns = [
  /\b(?:https?:\/\/|www\.)\S+/i,
  /\b\d{9,15}\b/,
  /\+\d(?:[\s().-]?\d){8,14}\b/,
  /\b0\d{1,3}(?:[ .-]\d{2,4}){2,4}\b/,
  /\b(?:otp|one[- ]time (?:password|code)|verification code)\b/i,
  /\b(?:bank|banking|account number|iban|swift)\b/i,
  /\b(?:passport|identity card|national id|driver'?s licen[cs]e)\b/i,
  /\b(?:address|street|road|avenue|postcode|zip code)\b/i,
  /(?:^|[^\p{L}\p{N}_])(?:mã xác thực|mã otp|ngân hàng|số tài khoản|căn cước|cccd|cmnd|hộ chiếu|địa chỉ|đường|phường|quận)(?=$|[^\p{L}\p{N}_])/iu,
] as const;

export function requiresCommunityPrivacyConfirmation(text: string) {
  return sensitiveCommunityPatterns.some((pattern) => pattern.test(text));
}

export function communityMentionCount(text: string) {
  return text.match(/@[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}/g)?.length ?? 0;
}

export function mapCommunityRpcError(error: {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
}) {
  const detail =
    `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  if (
    detail.includes("rate_limited") ||
    detail.includes("community_slow_mode")
  ) {
    const retryAfter =
      error.hint?.match(/retry after (\d+) seconds/i)?.[1] ?? "60";
    return apiError(
      429,
      "rate_limited",
      "Too many requests. Try again shortly.",
      { "Retry-After": retryAfter },
    );
  }
  if (detail.includes("privacy_confirmation_required")) {
    return apiError(
      422,
      "privacy_confirmation_required",
      "Confirm the privacy warning before posting sensitive information.",
    );
  }
  if (
    error.code === "42501" ||
    detail.includes("not_found") ||
    detail.includes("not found") ||
    detail.includes("p0002")
  ) {
    return apiError(404, "not_found", "Resource not found.");
  }
  if (
    detail.includes("moderator_required") ||
    detail.includes("moderation_required")
  ) {
    return apiError(403, "forbidden", "Moderator access is required.");
  }
  if (
    error.code === "23505" ||
    detail.includes("conflict") ||
    detail.includes("already reported")
  ) {
    return apiError(409, "conflict", "The request conflicts with existing data.");
  }
  if (
    error.code === "22023" ||
    error.code === "23503" ||
    error.code === "23514" ||
    detail.includes("invalid") ||
    detail.includes("unprocessable")
  ) {
    return apiError(422, "unprocessable", "The request cannot be processed.");
  }
  return databaseError();
}

export function mapAcademicRpcError(error: {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
}) {
  const detail =
    `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();

  if (detail.includes("rate_limited")) {
    return apiError(
      429,
      "rate_limited",
      "Too many requests. Try again shortly.",
      { "Retry-After": "60" },
    );
  }

  if (
    error.code === "42501" ||
    detail.includes("not_found") ||
    detail.includes("not found") ||
    detail.includes("p0002")
  ) {
    return apiError(404, "not_found", "Resource not found.");
  }
  if (
    detail.includes("conflict") ||
    error.code === "23505" ||
    (detail.includes("idempotency") && detail.includes("reused")) ||
    detail.includes("already submitted") ||
    detail.includes("already")
  ) {
    return apiError(409, "conflict", "The request conflicts with existing data.");
  }
  if (
    detail.includes("invalid") ||
    detail.includes("forbidden") ||
    error.code === "22023" ||
    error.code === "23503" ||
    error.code === "23514" ||
    detail.includes("check")
  ) {
    return apiError(422, "unprocessable", "The request cannot be processed.");
  }

  return databaseError();
}
