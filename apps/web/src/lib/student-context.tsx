"use client";

import type { AcademicSession, AiUsage, Assignment, Submission } from "@sao-do/contracts";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { closeCurtain } from "@/components/landing/SceneTransition";
import { academicRequest } from "./academic-client";
import {
  type AttendanceMarkStatus,
  buildSessionForAccount,
  type ClassAnnouncement,
  type ClassStudentRosterItem,
  type ClubEventRecord,
  type ClubMemberRecord,
  type PortalAccount,
  type SharedSubmissionRecord,
  type TeacherAttendanceSessionRecord,
  type TeacherSubjectClass,
  usePortalAccounts,
} from "./accounts";
import { persistAvatar, readStoredAvatar, useAvatarSync } from "./avatar";
import { getSupabaseBrowserClient, hasSupabaseEnvironment } from "./supabase-browser";

export type StudentData = {
  token: string;
  session: AcademicSession;
  assignments: Assignment[];
  submissions: Submission[];
  /** Null when the allowance could not be read; academics never depend on it. */
  aiUsage: AiUsage | null;
};

type StudentState = {
  data: StudentData | null;
  error: string;
  avatarUrl: string | null;
  setAvatarUrl: (next: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  /** Pass the click origin to play the sign-out curtain from there. */
  signOut: (from?: { x: number; y: number }) => Promise<void>;
  /** Active account persona & role permissions */
  account: PortalAccount;
  accounts: PortalAccount[];
  supabaseConnected: boolean;
  switchAccount: (accountId: string) => void;
  roster: ClassStudentRosterItem[];
  subjectClasses: TeacherSubjectClass[];
  attendanceSessions: TeacherAttendanceSessionRecord[];
  allSubmissions: SharedSubmissionRecord[];
  classAnnouncements: ClassAnnouncement[];
  clubMembers: ClubMemberRecord[];
  clubEvents: ClubEventRecord[];
  updateStudentNote: (
    studentCode: string,
    patch: { teacherNote?: string; attendancePct?: number; gpa?: number; status?: "active" | "warning" },
  ) => void;
  addClassStudent: (input: {
    studentCode: string;
    fullName: string;
    phone: string;
    roleInClass: ClassStudentRosterItem["roleInClass"];
  }) => void;
  addSubjectClass: (input: {
    classCode: string;
    courseCode: string;
    name: string;
    credits: number;
    cohortClass: string;
    schedule: string;
    room: string;
    totalPeriods: number;
  }) => TeacherSubjectClass;
  createAttendanceSession: (input: {
    subjectClassId: string;
    date: string;
    periods: string;
    topic: string;
    marks: Record<string, AttendanceMarkStatus>;
    notes?: Record<string, string>;
  }) => TeacherAttendanceSessionRecord;
  updateAttendanceSessionMark: (
    sessionId: string,
    studentCode: string,
    mark: AttendanceMarkStatus,
    note?: string,
  ) => void;
  createAssignment: (input: {
    classId: string;
    title: string;
    instructions: string;
    dueAt: string | null;
  }) => Assignment;
  submitStudentWork: (input: { assignmentId: string; content: string; account?: PortalAccount }) => void;
  gradeSubmission: (input: {
    submissionId: string;
    score: number;
    feedback: string;
    gradedBy?: string;
  }) => void;
  postClassAnnouncement: (input: {
    classId: string;
    title: string;
    body: string;
    pinned?: boolean;
  }) => void;
  requestJoinClub: (clubId: string, note?: string) => void;
  approveClubMember: (memberId: string) => void;
  updateClubMemberRole: (memberId: string, memberRole: ClubMemberRecord["memberRole"]) => void;
  removeClubMember: (memberId: string) => void;
  createClubEvent: (input: {
    clubId: string;
    title: string;
    time: string;
    place: string;
    summary: string;
  }) => void;
};

const StudentContext = createContext<StudentState | null>(null);

export function useStudent() {
  const value = useContext(StudentContext);
  if (!value) throw new Error("useStudent must be used inside StudentProvider");
  return value;
}

async function load(token: string): Promise<StudentData> {
  const [session, assignmentData, submissionData, aiUsage] = await Promise.all([
    academicRequest<AcademicSession>("/api/classes", token),
    academicRequest<{ assignments: Assignment[] }>("/api/assignments", token),
    academicRequest<{ submissions: Submission[] }>("/api/submissions", token),
    academicRequest<AiUsage>("/api/ai/usage", token).catch(() => null),
  ]);
  return {
    token,
    session,
    assignments: assignmentData.assignments.filter((item) => item.status === "published"),
    submissions: submissionData.submissions,
    aiUsage,
  };
}

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const portalAccounts = usePortalAccounts();
  const [remoteData, setRemoteData] = useState<StudentData | null>(null);
  const [error, setError] = useState("");
  const tokenRef = useRef("");
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const fetchFor = useCallback(async (token: string) => {
    if (!token) return;
    setError("");
    try {
      const next = await load(token);
      setRemoteData(next);
    } catch {
      // Fallback to multi-account local state when remote API is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnvironment) return;
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    void supabase.auth.getSession().then(({ data: auth }) => {
      if (cancelled) return;
      const token = auth.session?.access_token;
      if (!token) return;
      tokenRef.current = token;
      const metaAvatar = auth.session!.user.user_metadata?.avatar_url;
      if (typeof metaAvatar === "string" && metaAvatar && !readStoredAvatar(auth.session!.user.id)) {
        void persistAvatar(auth.session!.user.id, metaAvatar);
      }
      void fetchFor(token);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      if (session.access_token !== tokenRef.current) {
        tokenRef.current = session.access_token;
        setRemoteData((current) => (current ? { ...current, token: session.access_token } : current));
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchFor]);

  const data = useMemo<StudentData>(() => {
    const synthesized = buildSessionForAccount(portalAccounts.state, remoteData);
    return {
      token: remoteData?.token || "local-multi-role-session",
      session: synthesized.session,
      assignments: synthesized.assignments,
      submissions: synthesized.submissions,
      aiUsage: remoteData?.aiUsage ?? {
        enabled: true,
        used: 3,
        limit: 30,
        resetsAt: null,
      },
    };
  }, [portalAccounts.state, remoteData]);

  const userId = portalAccounts.activeAccount.id;
  const avatarUrl = useAvatarSync(userId, true);

  const setAvatarUrl = useCallback(
    async (next: string | null) => {
      await persistAvatar(userId, next);
    },
    [userId],
  );

  const value = useMemo<StudentState>(
    () => ({
      data,
      error,
      avatarUrl,
      setAvatarUrl,
      refresh: () => fetchFor(tokenRef.current),
      signOut: async (from) => {
        await closeCurtain(
          from?.x ?? innerWidth / 2,
          from?.y ?? innerHeight / 2,
          "Đã đăng xuất. Hẹn gặp lại!",
        )?.closed;
        if (hasSupabaseEnvironment) {
          await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
        }
        router.replace("/login");
      },
      account: portalAccounts.activeAccount,
      accounts: portalAccounts.accounts,
      supabaseConnected: portalAccounts.supabaseConnected,
      switchAccount: portalAccounts.setActiveAccount,
      roster: portalAccounts.roster,
      subjectClasses: portalAccounts.subjectClasses,
      attendanceSessions: portalAccounts.attendanceSessions,
      allSubmissions: portalAccounts.submissions,
      classAnnouncements: portalAccounts.classAnnouncements,
      clubMembers: portalAccounts.clubMembers,
      clubEvents: portalAccounts.clubEvents,
      updateStudentNote: portalAccounts.updateStudentNote,
      addClassStudent: portalAccounts.addClassStudent,
      addSubjectClass: portalAccounts.addSubjectClass,
      createAttendanceSession: portalAccounts.createAttendanceSession,
      updateAttendanceSessionMark: portalAccounts.updateAttendanceSessionMark,
      createAssignment: portalAccounts.createAssignment,
      submitStudentWork: portalAccounts.submitStudentWork,
      gradeSubmission: portalAccounts.gradeSubmission,
      postClassAnnouncement: portalAccounts.postClassAnnouncement,
      requestJoinClub: portalAccounts.requestJoinClub,
      approveClubMember: portalAccounts.approveClubMember,
      updateClubMemberRole: portalAccounts.updateClubMemberRole,
      removeClubMember: portalAccounts.removeClubMember,
      createClubEvent: portalAccounts.createClubEvent,
    }),
    [avatarUrl, data, error, fetchFor, portalAccounts, router, setAvatarUrl],
  );

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}
