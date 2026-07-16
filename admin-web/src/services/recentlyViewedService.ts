import { supabase } from "../lib/supabase";

export async function saveRecentlyViewed(workerId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Check kung existing na
  const { data: existing } = await supabase
    .from("recently_viewed")
    .select("id")
    .eq("customer_id", user.id)
    .eq("worker_id", workerId)
    .maybeSingle();

  if (existing) {
    // Update viewed_at
    await supabase
      .from("recently_viewed")
      .update({
        viewed_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    // Insert bago
    await supabase
      .from("recently_viewed")
      .insert({
        customer_id: user.id,
        worker_id: workerId,
      });
  }
}

export async function getRecentlyViewed(limit = 10) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("recently_viewed")
    .select(`
      viewed_at,
      worker:profiles!worker_id(
        id,
        first_name,
        last_name,
        profile_picture,
        email,
        phone
      )
    `)
    .eq("customer_id", user.id)
    .order("viewed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data ?? [];
}