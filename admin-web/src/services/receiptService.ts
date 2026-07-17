import { supabase } from "../lib/supabase";

export async function getReceipt(bookingId: number) {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      booking:bookings(
        id,
        service_name,
        category,
        booking_date,
        booking_time
      ),
      customer:profiles!customer_id(
        first_name,
        last_name
      ),
      worker:profiles!worker_id(
        first_name,
        last_name
      )
    `)
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("Receipt not found.");
  }

  return data;
}