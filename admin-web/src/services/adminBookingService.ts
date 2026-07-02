import { supabase } from "../lib/supabase";

export async function getAllBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:profiles!customer_id(
        full_name,
        email
      ),
      worker:profiles!worker_id(
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function updateBookingStatus(
  id: number,
  status: string
) {
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}