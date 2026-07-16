import { supabase } from "../lib/supabase";

export async function getUpcomingBooking(customerId: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        first_name,
        last_name,
        profile_picture
      ),
      service:services(
        service_name
      )
    `)
    .eq("customer_id", customerId)
    .in("status", ["Pending", "Approved"])
    .gte("booking_date", today)
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}