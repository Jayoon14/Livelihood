import { supabase } from "../lib/supabase";

export async function getCustomerBookings(customerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        id,
        first_name,
        last_name,
        phone
      )
    `)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}