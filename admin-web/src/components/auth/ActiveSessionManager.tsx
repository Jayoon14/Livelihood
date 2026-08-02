import { useEffect } from "react";

import { supabase } from "../../lib/supabase";
import {
  claimActiveSession,
  refreshActiveSession,
} from "../../services/activeSessionService";

const SESSION_HEARTBEAT_INTERVAL_MS = 30_000;

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

    const forceSessionLogout = async () => {
      if (!mounted) {
        return;
      }

      stopHeartbeat();

      sessionStorage.setItem(
        "auth-message",
        "Your account session is no longer active on this device.",
      );

      await supabase.auth.signOut({ scope: "local" });
      window.location.replace("/");
    };

    const sendHeartbeat = async () => {
      if (!mounted || requestInProgress || !navigator.onLine) {
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

        const stillOwnsSession = await refreshActiveSession();

        if (!stillOwnsSession) {
          await forceSessionLogout();
        }
      } catch (error) {
        // Temporary connectivity errors must not force a logout.
        console.error("Active session heartbeat error:", error);
      } finally {
        requestInProgress = false;
      }
    };

    const startHeartbeat = () => {
      if (heartbeatTimer !== null) {
        return;
      }

      heartbeatTimer = window.setInterval(() => {
        void sendHeartbeat();
      }, SESSION_HEARTBEAT_INTERVAL_MS);
    };

    /*
     * Used only for a session restored when the app first loads.
     * New form logins are validated by authService.login(), so they must not
     * be claimed again here during the SIGNED_IN event.
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

        const allowed = await claimActiveSession();

        if (!allowed) {
          await forceSessionLogout();
          return;
        }

        startHeartbeat();
      } catch (error) {
        console.error("Restored session validation error:", error);
      } finally {
        requestInProgress = false;
      }
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      if (event === "SIGNED_OUT" || !session) {
        stopHeartbeat();
        return;
      }

      if (event === "SIGNED_IN") {
        /*
         * authService.login() already claimed this newly created session.
         * Starting the heartbeat here avoids a duplicate claim and prevents
         * the manager from redirecting before the login page can show errors.
         */
        startHeartbeat();
      }
    });

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void validateRestoredSession();

    return () => {
      mounted = false;
      stopHeartbeat();
      subscription.unsubscribe();
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
