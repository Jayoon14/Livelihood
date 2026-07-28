import { supabase } from "../lib/supabase";

export type NotificationChannel = ReturnType<typeof supabase.channel>;

function requireUserId(userId:string):string{
  const id=userId.trim();
  if(!id) throw new Error("User ID is required.");
  return id;
}

export function subscribeToNotifications(
  userId:string,
  callback:()=>void,
):NotificationChannel{
  const id=requireUserId(userId);

  return supabase
    .channel(`notifications-${id}`)
    .on(
      "postgres_changes",
      {
        event:"INSERT",
        schema:"public",
        table:"notifications",
        filter:`user_id=eq.${id}`,
      },
      callback,
    )
    .subscribe();
}

export async function unsubscribeNotifications(
  channel:NotificationChannel,
):Promise<void>{
  await supabase.removeChannel(channel);
}