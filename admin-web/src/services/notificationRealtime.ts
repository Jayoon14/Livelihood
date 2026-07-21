import { supabase } from "../lib/supabase";

export function subscribeToNotifications(userId: string, callback: () => void) {
  return supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      callback,
    )
    .subscribe();
}

export function unsubscribeNotifications(channel: any) {
  supabase.removeChannel(channel);
}
