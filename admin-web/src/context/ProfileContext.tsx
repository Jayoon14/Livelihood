import { createContext, useContext, useEffect, useState } from "react";

import type { ReactNode } from "react";

import { supabase } from "../lib/supabase";

interface ProfileContextType {
  profile: any;
  setProfile: (profile: any) => void;
  refreshProfile: () => Promise<void>;
  updateProfileState: (data: any) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<any>(null);

  async function refreshProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setProfile(data);
  }

  function updateProfileState(data: any) {
    setProfile({
      ...profile,
      ...data,
    });
  }

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        setProfile,
        refreshProfile,
        updateProfileState,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile must be used inside ProfileProvider");
  }

  return context;
}
