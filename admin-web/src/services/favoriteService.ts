import { supabase } from "../lib/supabase";

// =============================
// ADD FAVORITE
// =============================

export async function addFavorite(
  customerId: string,
  workerId: string
) {
  const { error } = await supabase
    .from("favorites")
    .insert({
      customer_id: customerId,
      worker_id: workerId,
    });

  if (error) throw error;
}


// =============================
// REMOVE FAVORITE
// =============================

export async function removeFavorite(
  customerId: string,
  workerId: string
) {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("customer_id", customerId)
    .eq("worker_id", workerId);

  if (error) throw error;
}


// =============================
// CHECK FAVORITE
// =============================

export async function isFavorite(
  customerId: string,
  workerId: string
): Promise<boolean> {

  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("customer_id", customerId)
    .eq("worker_id", workerId)
    .maybeSingle();


  if (error) {
    throw error;
  }


  return Boolean(data);

}


// =============================
// GET FAVORITES
// =============================

export async function getFavoriteWorkers(
  customerId: string
) {

  const { data, error } = await supabase
    .from("favorites")
    .select(`
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name,
        profile_picture,
        phone,
        email
      )
    `)
    .eq("customer_id", customerId);


  if (error) {
    throw error;
  }


  return (data ?? []).map(
    (item: any) => item.worker
  );

}
