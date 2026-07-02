import { supabase } from "../lib/supabase";

export async function getWorkerBookings(workerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:profiles!customer_id(
        id,
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

export async function updateBookingStatus(
  bookingId: number,
  status: string
) {
  const { error } = await supabase
    .from("bookings")
    .update({
      status,
    })
    .eq("id", bookingId);

  if (error) {
    throw error;
  }
}

export async function getBooking(bookingId: number) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:profiles!customer_id(*),
      worker:profiles!worker_id(*)
    `)
    .eq("id", bookingId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}