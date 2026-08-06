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

export function ProfileProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [profile, setProfile] =
    useState<ProfileData | null>(null);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(authError);
      return;
    }

    if (!user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setProfile(data as ProfileData);
  }, []);

  const updateProfileState = useCallback(
    (data: Partial<ProfileData>) => {
      setProfile((current) =>
        current
          ? {
              ...current,
              ...data,
            }
          : current,
      );
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshProfile();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshProfile]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      setProfile,
      refreshProfile,
      updateProfileState,
    }),
    [
      profile,
      refreshProfile,
      updateProfileState,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}
