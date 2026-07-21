import { supabase } from "../lib/supabase";

export async function getUpcomingBooking() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      worker:profiles!bookings_worker_id_fkey(
        first_name,
        last_name
      ),
      service:services(
        service_name
      )
    `,
    )
    .eq("customer_id", user.id)
    .in("status", ["Pending", "Approved"])
    .gte("booking_date", today)
    .order("booking_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}
