import type { Session, User } from "@supabase/supabase-js";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "../lib/supabase";
import { releaseActiveSession } from "../services/activeSessionService";

export type UserRole = "admin" | "worker" | "customer";

export interface UserProfile {
  id: string;
  role: UserRole;
  status: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;

  role: UserRole | null;
  status: string | null;

  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface ProfileRow {
  id: string;
  role: unknown;
  status: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeRole(role: unknown): UserRole | null {
  if (typeof role !== "string") {
    return null;
  }

  const normalizedRole = role.trim().toLowerCase();

  if (
    normalizedRole === "admin" ||
    normalizedRole === "worker" ||
    normalizedRole === "customer"
  ) {
    return normalizedRole;
  }

  return null;
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfileFromSession = useCallback(
    async (session: Session | null) => {
      setLoading(true);
      setError(null);

      try {
        if (!session?.user) {
          setUser(null);
          setProfile(null);
          return;
        }

        setUser(session.user);

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select(
            `
              id,
              role,
              status,
              first_name,
              middle_name,
              last_name,
              email
            `,
          )
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile query failed:", profileError);
          setProfile(null);
          setError(
            `Unable to load account profile: ${profileError.message}`,
          );
          return;
        }

        if (!data) {
          console.error(
            "No profile row found for authenticated user:",
            session.user.id,
          );
          setProfile(null);
          setError(
            "No profile record was found for this account.",
          );
          return;
        }

        const profileData = data as ProfileRow;
        const normalizedRole = normalizeRole(profileData.role);

        if (!normalizedRole) {
          console.error("Invalid profile role:", profileData.role);
          setProfile(null);
          setError(
            `Invalid account role: ${String(profileData.role)}`,
          );
          return;
        }

        const normalizedProfile: UserProfile = {
          id: profileData.id,
          role: normalizedRole,
          status: profileData.status?.trim() || null,
          first_name: profileData.first_name ?? null,
          middle_name: profileData.middle_name ?? null,
          last_name: profileData.last_name ?? null,
          email: profileData.email ?? session.user.email ?? null,
        };

        console.log("Authenticated account:", {
          userId: session.user.id,
          role: normalizedProfile.role,
          status: normalizedProfile.status,
        });

        setProfile(normalizedProfile);
      } catch (caughtError) {
        console.error("AuthContext profile error:", caughtError);
        setProfile(null);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to verify the account.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
      setUser(null);
      setProfile(null);
      setError(sessionError.message);
      setLoading(false);
      return;
    }

    await loadProfileFromSession(session);
  }, [loadProfileFromSession]);

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (sessionError) {
        console.error("Initial session error:", sessionError);
        setUser(null);
        setProfile(null);
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      await loadProfileFromSession(session);
    }

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return;
      }

      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        setProfile(null);
        setError(null);
        setLoading(false);
        return;
      }

      window.setTimeout(() => {
        if (active) {
          void loadProfileFromSession(session);
        }
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfileFromSession]);

  const signOut = useCallback(async () => {
    setLoading(true);

    try {
      await releaseActiveSession();

      const { error: signOutError } =
        await supabase.auth.signOut({ scope: "local" });

      if (signOutError) {
        throw signOutError;
      }

      setUser(null);
      setProfile(null);
      setError(null);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to sign out.";

      setError(message);
      throw caughtError;
    } finally {
      setLoading(false);
    }
  }, []);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      loading,
      error,
      role: profile?.role ?? null,
      status: profile?.status ?? null,
      refreshProfile,
      signOut,
    }),
    [
      user,
      profile,
      loading,
      error,
      refreshProfile,
      signOut,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }

  return context;
}