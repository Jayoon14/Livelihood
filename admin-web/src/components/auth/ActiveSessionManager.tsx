import { useEffect } from "react";

import { supabase } from "../../lib/supabase";
import {
  claimActiveSession,
  refreshActiveSession,
  releaseActiveSession,
} from "../../services/activeSessionService";

const SESSION_HEARTBEAT_INTERVAL_MS = 10_000;

export default function ActiveSessionManager() {
  useEffect(() => {
    let mounted = true;
    let heartbeatTimer: ReturnType<typeof window.setInterval> | null = null;
    let requestInProgress = false;

    const stopHeartbeat = () => {
      if (heartbeatTimer !== null) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const forceSessionLogout = async (
      message = "Your account session is no longer active on this device.",
    ) => {
      if (!mounted) {
        return;
      }

      stopHeartbeat();

      sessionStorage.setItem("auth-message", message);

      await releaseActiveSession().catch(() => false);

      await supabase.auth.signOut({
        scope: "local",
      });

      if (mounted) {
        window.location.replace("/");
      }
    };

    const verifyAccountStatus = async (
      userId: string,
    ): Promise<boolean> => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!profile) {
        await forceSessionLogout(
          "Your account profile could no longer be verified. Please sign in again.",
        );

        return false;
      }

      const role = String(profile.role ?? "")
        .trim()
        .toLowerCase();

      const status = String(profile.status ?? "")
        .trim()
        .toLowerCase();

      /*
       * Admin accounts are allowed according to the existing login logic.
       * Customer and Worker accounts must remain approved.
       */
      const accountAllowed =
        role === "admin" || status === "approved";

      if (!accountAllowed) {
        let message =
          "Your account is currently not allowed to access the system.";

        if (status === "disabled") {
          message =
            "Your account has been disabled by the administrator.";
        } else if (status === "blocked") {
          message =
            "Your account has been blocked by the administrator.";
        } else if (status === "rejected") {
          message =
            "Your account has been rejected by the administrator.";
        } else if (status === "pending") {
          message =
            "Your account is still pending administrator approval.";
        }

        await forceSessionLogout(message);

        return false;
      }

      return true;
    };

    const sendHeartbeat = async () => {
      if (
        !mounted ||
        requestInProgress ||
        !navigator.onLine
      ) {
        return;
      }

      requestInProgress = true;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          stopHeartbeat();
          return;
        }

        const accountAllowed =
          await verifyAccountStatus(session.user.id);

        if (!accountAllowed) {
          return;
        }

        const stillOwnsSession =
          await refreshActiveSession();

        if (!stillOwnsSession) {
          await forceSessionLogout();
        }
      } catch (error) {
        /*
         * Temporary network/Supabase errors must not
         * automatically log the user out.
         */
        console.error(
          "Active session heartbeat error:",
          error,
        );
      } finally {
        requestInProgress = false;
      }
    };

    const startHeartbeat = () => {
      if (!mounted || heartbeatTimer !== null) {
        return;
      }

      void sendHeartbeat();

      heartbeatTimer = window.setInterval(() => {
        void sendHeartbeat();
      }, SESSION_HEARTBEAT_INTERVAL_MS);
    };

    /*
     * Only used for an already-existing session restored
     * when the application first loads.
     */
    const validateRestoredSession = async () => {
      if (!mounted || requestInProgress) {
        return;
      }

      requestInProgress = true;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          stopHeartbeat();
          return;
        }

        const accountAllowed =
          await verifyAccountStatus(session.user.id);

        if (!accountAllowed) {
          return;
        }

        const allowed = await claimActiveSession();

        if (!allowed) {
          await forceSessionLogout(
            "This account is already active on another device.",
          );

          return;
        }

        startHeartbeat();
      } catch (error) {
        console.error(
          "Restored session validation error:",
          error,
        );
      } finally {
        requestInProgress = false;
      }
    };

    const handleSessionClaimed = () => {
      /*
       * A new login has successfully completed
       * claimActiveSession().
       *
       * Only now should the heartbeat begin.
       */
      startHeartbeat();
    };

    const handleOnline = () => {
      void sendHeartbeat();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          return;
        }

        if (event === "SIGNED_OUT" || !session) {
          stopHeartbeat();
          return;
        }

        /*
         * IMPORTANT:
         *
         * Do NOT immediately start the heartbeat here.
         *
         * SIGNED_IN fires before authService.login()
         * finishes claimActiveSession(), which caused the
         * login -> loading -> logout race condition.
         *
         * New sessions are started through the
         * "active-session-claimed" event instead.
         */
      },
    );

    window.addEventListener(
      "active-session-claimed",
      handleSessionClaimed,
    );

    window.addEventListener(
      "online",
      handleOnline,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    void validateRestoredSession();

    return () => {
      mounted = false;

      stopHeartbeat();

      subscription.unsubscribe();

      window.removeEventListener(
        "active-session-claimed",
        handleSessionClaimed,
      );

      window.removeEventListener(
        "online",
        handleOnline,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, []);

  return null;
}