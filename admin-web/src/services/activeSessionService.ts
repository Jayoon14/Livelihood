import { supabase } from "../lib/supabase";
import { getDeviceId } from "../utils/deviceId";

export async function claimActiveSession(): Promise<boolean> {
  const deviceId = getDeviceId();

  const { data, error } = await supabase.rpc(
    "claim_active_user_session",
    {
      p_device_id: deviceId,
    },
  );

  if (error) {
    console.error("Claim active session error:", error);
    throw new Error(
      "Unable to verify your active login session.",
    );
  }

  return data === true;
}

export async function refreshActiveSession(): Promise<boolean> {
  const deviceId = getDeviceId();

  const { data, error } = await supabase.rpc(
    "refresh_active_user_session",
    {
      p_device_id: deviceId,
    },
  );

  if (error) {
    console.error("Refresh active session error:", error);

    /*
     * A temporary network or Supabase error is not proof that another
     * device owns the account. Throw so the session manager can retry
     * without forcing the user to sign out.
     */
    throw new Error(
      "Unable to refresh the active login session.",
    );
  }

  return data === true;
}

export async function releaseActiveSession(): Promise<boolean> {
  const deviceId = getDeviceId();

  const { data, error } = await supabase.rpc(
    "release_active_user_session",
    {
      p_device_id: deviceId,
    },
  );

  if (error) {
    console.error("Release active session error:", error);
    return false;
  }

  return data === true;
}