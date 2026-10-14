import type {
  AcademicSession,
  ClassSummary,
  Role,
} from "@sao-do/contracts";
import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { academicRequest, hasAcademicApi } from "@/lib/academicApi";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export type AppClass = Pick<ClassSummary, "id" | "code" | "name"> & {
  teacherName?: string;
  studentCount?: number;
  capacity?: number;
};

type Membership = {
  tenantId: string;
  tenantName: string;
  role: Role;
};

type SignInResult = { ok: true } | { ok: false; message: string };

type AppDataValue = {
  classes: AppClass[];
  error: string;
  isAuthorized: boolean;
  loading: boolean;
  membership: Membership | null;
  refresh: () => Promise<boolean>;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

const AppDataContext = createContext<AppDataValue | null>(null);
const isConfigured = hasSupabaseConfig && hasAcademicApi;
const configurationError =
  "Ứng dụng chưa được cấu hình Supabase và địa chỉ API học thuật.";

export function AppDataProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [classes, setClasses] = useState<AppClass[]>([]);
  const [loading, setLoading] = useState(isConfigured);
  const [error, setError] = useState(isConfigured ? "" : configurationError);

  const hydrate = useCallback(async (nextSession: Session | null) => {
    setLoading(true);
    setSession(nextSession);
    setMembership(null);
    setClasses([]);

    if (!nextSession || !supabase) {
      setLoading(false);
      return "Bạn chưa đăng nhập.";
    }

    try {
      const academic = await academicRequest<AcademicSession>(
        "/api/classes",
        nextSession.access_token,
      );

      setMembership({
        role: academic.role,
        tenantId: academic.tenant.id,
        tenantName: academic.tenant.name,
      });
      setClasses(
        academic.classes.map((item) => ({
          code: `LỚP-${item.id.slice(0, 4).toUpperCase()}`,
          id: item.id,
          name: item.name,
          teacherName:
            item.teacherId === academic.user.id
              ? academic.user.displayName
              : undefined,
        })),
      );
      setError("");
      setLoading(false);
      return null;
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải dữ liệu trường học. Vui lòng thử lại.";
      setError(message);
      setLoading(false);
      return message;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!isConfigured || !supabase) {
      setError(configurationError);
      setLoading(false);
      return false;
    }
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setError("Không thể kiểm tra phiên đăng nhập.");
      setLoading(false);
      return false;
    }
    return (await hydrate(data.session)) === null;
  }, [hydrate]);

  useEffect(() => {
    if (!isConfigured || !supabase) return;

    void refresh();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setTimeout(() => void hydrate(nextSession), 0);
    });

    return () => subscription.unsubscribe();
  }, [hydrate, refresh]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      if (!isConfigured || !supabase) {
        return { message: configurationError, ok: false };
      }

      setError("");
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError || !data.session) {
        return {
          message:
            signInError?.message ?? "Không thể tạo phiên đăng nhập.",
          ok: false,
        };
      }

      const hydrateError = await hydrate(data.session);
      if (hydrateError) {
        await supabase.auth.signOut({ scope: "local" });
        setSession(null);
        return { message: hydrateError, ok: false };
      }

      return { ok: true };
    },
    [hydrate],
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setMembership(null);
    setClasses([]);
    setError(isConfigured ? "" : configurationError);
  }, []);

  const value = useMemo<AppDataValue>(
    () => ({
      classes,
      error,
      isAuthorized: Boolean(session && membership),
      loading,
      membership,
      refresh,
      session,
      signIn,
      signOut,
    }),
    [
      classes,
      error,
      loading,
      membership,
      refresh,
      session,
      signIn,
      signOut,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}

export const roleLabels: Record<Role, string> = {
  admin: "Quản trị viên",
  staff: "Cán bộ phòng ban",
  student: "Sinh viên",
  teacher: "Giảng viên",
};
