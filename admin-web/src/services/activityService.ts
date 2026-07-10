import { supabase } from "../lib/supabase";

export async function logActivity(
  userId: string,
  action: string,
  module: string,
  description: string
) {
  const { error } = await supabase
    .from("activity_logs")
    .insert({
      user_id: userId,
      action,
      module,
      description,
    });

  if (error) throw error;
}

export async function getActivityLogs() {
  const { data, error } = await supabase
    .from("activity_logs")
    .select(`
      *,
      user:profiles(
        first_name,
        last_name
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) throw error;

  return data ?? [];
}