import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

export interface ProfileData {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  profile_picture: string | null;
  role: string | null;
  status?: string | null;
  last_seen?: string | null;
}

export interface ProfileContextValue {
  profile: ProfileData | null;
  setProfile: Dispatch<
    SetStateAction<ProfileData | null>
  >;
  refreshProfile: () => Promise<void>;
  updateProfileState: (
    data: Partial<ProfileData>,
  ) => void;
}

export const ProfileContext =
  createContext<ProfileContextValue | undefined>(
    undefined,
  );

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error(
      "useProfile must be used inside ProfileProvider",
    );
  }

  return context;
}
