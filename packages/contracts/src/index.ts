export const roles = [
  "admin",
  "moderator",
  "staff",
  "teacher",
  "student",
] as const;

export type Role = (typeof roles)[number];

export type TenantSummary = {
  id: string;
  name: string;
  campusName: string;
};

export type ClassSummary = {
  id: string;
  code: string;
  name: string;
  teacherName: string;
  studentCount: number;
  capacity: number;
};

export type ClassMember = {
  id: string;
  fullName: string;
  email: string;
  role: Extract<Role, "teacher" | "student">;
};

export const assignmentStatuses = ["draft", "published"] as const;
export type AssignmentStatus = (typeof assignmentStatuses)[number];

export const submissionStatuses = ["submitted", "reviewed"] as const;
export type SubmissionStatus = (typeof submissionStatuses)[number];

export type ApiTenant = {
  id: string;
  name: string;
};

export type ApiUser = {
  id: string;
  displayName: string;
  email: string;
};

export type ApiPerson = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
};

export type ApiClass = {
  id: string;
  name: string;
  teacherId: string;
  createdAt: string;
};

export type AcademicSession = {
  role: Role;
  tenant: ApiTenant;
  user: ApiUser;
  classes: ApiClass[];
  people: ApiPerson[];
};

export type Assignment = {
  id: string;
  tenantId: string;
  classId: string;
  createdBy: string;
  title: string;
  instructions: string;
  status: AssignmentStatus;
  dueAt: string | null;
  createdAt: string;
};

export type Submission = {
  id: string;
  tenantId: string;
  assignmentId: string;
  studentId: string;
  studentDisplayName: string;
  content: string;
  idempotencyKey: string;
  status: SubmissionStatus;
  submittedAt: string;
  feedback: string | null;
  feedbackAt: string | null;
  feedbackBy: string | null;
};

export const communitySpaceKinds = ["school", "class", "club"] as const;
export type CommunitySpaceKind = (typeof communitySpaceKinds)[number];

export const communityReaction = "like" as const;
export type CommunityReaction = typeof communityReaction;

export const communityReportReasons = [
  "spam",
  "harassment",
  "hate",
  "dangerous",
  "misinformation",
  "other",
] as const;
export type CommunityReportReason = (typeof communityReportReasons)[number];

export const communityReportStatuses = [
  "open",
  "escalated",
  "dismissed",
  "resolved",
] as const;
export type CommunityReportStatus =
  (typeof communityReportStatuses)[number];

export const communityModerationActions = [
  "dismiss",
  "hide",
  "escalate",
  "resolve",
] as const;
export type CommunityModerationAction =
  (typeof communityModerationActions)[number];

export type CommunitySpace = {
  id: string;
  tenantId: string;
  kind: CommunitySpaceKind;
  name: string;
  classId: string | null;
  slowModeSeconds: number;
  muted: boolean;
  canLeave: boolean;
  canPost: boolean;
};

export type CommunityAuthor = {
  id: string;
  displayName: string;
  role: Role;
  blockedByMe: boolean;
};

export type CommunityReply = {
  id: string;
  authorDisplayName: string;
  text: string;
};

export type CommunityMessage = {
  id: string;
  tenantId: string;
  spaceId: string;
  author: CommunityAuthor;
  text: string;
  replyTo: CommunityReply | null;
  reaction: {
    kind: CommunityReaction;
    count: number;
    reactedByMe: boolean;
  };
  report: {
    count: number;
    reportedByMe: boolean;
  };
  hidden: boolean;
  createdAt: string;
};

export type CommunityReportActor = {
  id: string;
  displayName: string;
  role: Role;
};

export type CommunityReportMessage = {
  id: string;
  spaceId: string;
  author: CommunityReportActor;
  text: string;
  hidden: boolean;
  createdAt: string;
};

export type CommunityReport = {
  id: string;
  tenantId: string;
  message: CommunityReportMessage;
  reporter: CommunityReportActor;
  reason: CommunityReportReason;
  detail: string | null;
  status: CommunityReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

export type CommunityMutationState = {
  active: boolean;
};

export type CommunityReportCreated = {
  reportId: string;
};

export type CommunityModerationResult = {
  actionId: string;
  reportId: string;
  action: CommunityModerationAction;
};

export const aiTutorStatuses = ["answered", "abstained", "failed"] as const;
export type AiTutorStatus = (typeof aiTutorStatuses)[number];

export type AiTutorCitation = {
  id: string;
  title: string;
  sourceName: string;
  pageNumber: number | null;
};

export type AiTutorResponse = {
  status: Extract<AiTutorStatus, "answered" | "abstained">;
  answer: string | null;
  citations: AiTutorCitation[];
  dailyRemaining: number;
};

export type AiTutorConsent = {
  tutorEnabled: boolean;
  granted: boolean;
  policyVersion: string | null;
  currentPolicyVersion: string;
  consentRequired: boolean;
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

export function isAssignmentStatus(
  value: unknown,
): value is AssignmentStatus {
  return (
    typeof value === "string" &&
    assignmentStatuses.includes(value as AssignmentStatus)
  );
}

export function isCommunityReportReason(
  value: unknown,
): value is CommunityReportReason {
  return (
    typeof value === "string" &&
    communityReportReasons.includes(value as CommunityReportReason)
  );
}

export function isCommunityModerationAction(
  value: unknown,
): value is CommunityModerationAction {
  return (
    typeof value === "string" &&
    communityModerationActions.includes(value as CommunityModerationAction)
  );
}

export function isAiTutorStatus(value: unknown): value is AiTutorStatus {
  return (
    typeof value === "string" &&
    aiTutorStatuses.includes(value as AiTutorStatus)
  );
}

export function isAiTutorCitation(value: unknown): value is AiTutorCitation {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const citation = value as Record<string, unknown>;
  return (
    typeof citation.id === "string" &&
    citation.id.length > 0 &&
    typeof citation.title === "string" &&
    typeof citation.sourceName === "string" &&
    (citation.pageNumber === null ||
      (typeof citation.pageNumber === "number" &&
        Number.isInteger(citation.pageNumber) &&
        citation.pageNumber > 0))
  );
}

export const aiModes = ["explain", "summarize", "practice", "plan"] as const;
export type AiMode = (typeof aiModes)[number];

export function isAiMode(value: unknown): value is AiMode {
  return typeof value === "string" && aiModes.includes(value as AiMode);
}

export const aiReasoningEfforts = ["low", "medium", "high"] as const;
export type AiReasoningEffort = (typeof aiReasoningEfforts)[number];

export function isAiReasoningEffort(value: unknown): value is AiReasoningEffort {
  return typeof value === "string" && aiReasoningEfforts.includes(value as AiReasoningEffort);
}

export type AiConversation = {
  id: string;
  title: string;
  mode: AiMode;
  updatedAt: string;
};

export type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  reasoningMs?: number;
  steps?: string[];
  model?: string;
  status: "pending" | "complete" | "interrupted" | "failed";
  createdAt: string;
};

export type AiUsage = {
  enabled: boolean;
  used: number;
  limit: number;
  resetsAt: string | null;
  model?: string;
};

/** One JSON object per line of the `POST /api/ai/chat` response stream. */
export type AiStreamEvent =
  | { type: "start"; conversationId: string; requestId: string; model?: string }
  | { type: "step"; label: string }
  | { type: "reasoning"; text: string }
  | { type: "delta"; text: string }
  | { type: "complete"; reasoningMs?: number }
  | { type: "error"; code: string };
