import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "../lib/supabase";
import {
  ProfileContext,
  type ProfileContextValue,
  type ProfileData,
} from "./ProfileContextValue";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (): Promise<void> => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      /*
       * A missing session is a normal state.
       * Do not treat it as a profile error.
       */
      if (sessionError) {
        console.warn("Unable to check auth session:", sessionError.message);

        setProfile(null);
        return;
      }

      if (!session?.user) {
        setProfile(null);
        return;
      }

      const user = session.user;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Unable to load profile:", error.message);

        setProfile(null);
        return;
      }

      if (!data) {
        setProfile(null);
        return;
      }

      setProfile(data as ProfileData);
    } catch (error) {
      console.error("Unexpected profile loading error:", error);

      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfileState = useCallback((data: Partial<ProfileData>) => {
    setProfile((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        ...data,
      };
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (): Promise<void> => {
      if (!mounted) {
        return;
      }

      await refreshProfile();
    };

    void loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) {
        return;
      }

      /*
       * SIGNED_OUT is a normal auth state.
       */
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setLoading(false);
        return;
      }

      /*
       * Refresh profile after login or
       * other user/session changes.
       */
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        void refreshProfile();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      loading,
      setProfile,
      refreshProfile,
      updateProfileState,
    }),
    [profile, loading, refreshProfile, updateProfileState],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}
