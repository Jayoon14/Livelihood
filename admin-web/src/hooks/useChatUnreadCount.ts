import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getUnreadCount } from "../services/chatService";

export function useChatUnreadCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      setCount(await getUnreadCount(data.user.id));
    } catch (error) {
      console.error("Unable to load chat unread count:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function initialize() {
      await refresh();
      if (cancelled) return;

      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;

      channel = supabase
        .channel(`global-chat-unread-${data.user.id}-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          () => void refresh(),
        )
        .subscribe();
    }

    void initialize();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { count, loading, refresh };
}
