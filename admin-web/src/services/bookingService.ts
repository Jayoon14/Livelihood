import { supabase } from "../lib/supabase";

export async function createBooking(
  customerId: string,
  workerId: string,
  bookingDate: string,
  bookingTime: string,
  address: string,
  notes: string
) {
  const { error } = await supabase.from("bookings").insert({
    customer_id: customerId,
    worker_id: workerId,
    booking_date: bookingDate,
    booking_time: bookingTime,
    address,
    notes,
    status: "Pending",
  });

  if (error) throw error;
}

export async function getBookings(status = "All") {
  let query = supabase
    .from("bookings")
    .select(`
      *,
      customer:profiles!customer_id(full_name,email),
      worker:profiles!worker_id(full_name,email)
    `)
    .order("created_at", { ascending: false });

  if (status !== "All") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function getBooking(id: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:profiles!customer_id(*),
      worker:profiles!worker_id(*)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

export async function updateBookingStatus(id: string, status: string) {
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

export async function assignWorker(bookingId: string, workerId: string) {
  const { error } = await supabase
    .from("bookings")
    .update({
      worker_id: workerId,
      status: "Approved",
    })
    .eq("id", bookingId);

  if (error) throw error;
}
export async function getBookingById(id: number) {
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
      ),
      worker:profiles!worker_id(
        id,
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}