import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "../lib/supabase";
import { getUnreadCount, type ChatMessage } from "../services/chatService";

const REFRESH_DELAY_MS = 200;

export function useChatUnreadCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef("");
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      let userId = userIdRef.current;

      if (!userId) {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        userId = data.user?.id ?? "";
        userIdRef.current = userId;
      }

      if (!userId) {
        setCount(0);
        return;
      }

      setCount(await getUnreadCount(userId));
    } catch (error) {
      console.error("Unable to load chat unread count:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleRefresh = useCallback((): void => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      void refresh();
    }, REFRESH_DELAY_MS);
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize(): Promise<void> {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!data.user || cancelled) {
          setCount(0);
          setLoading(false);
          return;
        }

        const currentUserId = data.user.id;
        userIdRef.current = currentUserId;

        await refresh();

        if (cancelled) {
          return;
        }

        channel = supabase
          .channel(`global-chat-unread-${currentUserId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "messages",
            },
            (payload: RealtimePostgresChangesPayload<ChatMessage>) => {
              const next = payload.new as Partial<ChatMessage>;
              const previous = payload.old as Partial<ChatMessage>;

              const relevant =
                next.receiver_id === currentUserId ||
                previous.receiver_id === currentUserId ||
                next.sender_id === currentUserId ||
                previous.sender_id === currentUserId ||
                next.receiver_id === undefined ||
                previous.receiver_id === undefined;

              if (relevant) {
                scheduleRefresh();
              }
            },
          )
          .subscribe();
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to initialize chat unread count:", error);
          setLoading(false);
        }
      }
    }

    void initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        userIdRef.current = session?.user.id ?? "";
        scheduleRefresh();
      },
    );

    return () => {
      cancelled = true;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      authListener.subscription.unsubscribe();

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [refresh, scheduleRefresh]);

  return { count, loading, refresh };
}
