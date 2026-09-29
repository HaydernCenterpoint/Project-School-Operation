"use client";

import type { AcademicSession, AiUsage, Assignment, Submission } from "@sao-do/contracts";
import type { Route } from "next";
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
  refresh: () => Promise<void>;
  /** Pass the click origin to play the sign-out curtain from there. */
  signOut: (from?: { x: number; y: number }) => Promise<void>;
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
  const [data, setData] = useState<StudentData | null>(null);
  const [error, setError] = useState(
    hasSupabaseEnvironment ? "" : "Cổng học tập chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
  );
  const tokenRef = useRef("");
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const fetchFor = useCallback(
    async (token: string) => {
      setError("");
      try {
        const next = await load(token);
        if (next.session.role !== "student") {
          router.replace("/portal");
          return;
        }
        setData(next);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu.");
      }
    },
    [router],
  );

  useEffect(() => {
    if (!hasSupabaseEnvironment) return;
    const supabase = getSupabaseBrowserClient();
    const toLogin = () =>
      router.replace(`/login?next=${encodeURIComponent(pathRef.current)}` as Route);
    let cancelled = false;

    void supabase.auth.getSession().then(({ data: auth }) => {
      if (cancelled) return;
      const token = auth.session?.access_token;
      if (!token) return toLogin();
      tokenRef.current = token;
      void fetchFor(token);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return toLogin();
      // Token refreshes only swap the token; data stays as is.
      if (session.access_token !== tokenRef.current) {
        tokenRef.current = session.access_token;
        setData((current) => (current ? { ...current, token: session.access_token } : current));
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchFor, router]);

  const value = useMemo<StudentState>(
    () => ({
      data,
      error,
      refresh: () => fetchFor(tokenRef.current),
      signOut: async (from) => {
        // Cover the page before the session ends: signing out triggers the redirect to /login.
        await closeCurtain(from?.x ?? innerWidth / 2, from?.y ?? innerHeight / 2, "Đã đăng xuất. Hẹn gặp lại!")?.closed;
        await getSupabaseBrowserClient().auth.signOut();
        router.replace("/login");
      },
    }),
    [data, error, fetchFor, router],
  );

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}
