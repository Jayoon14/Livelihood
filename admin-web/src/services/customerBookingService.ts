import { supabase } from "../lib/supabase";

/**
 * Get all bookings of logged in customer
 */
export async function getCustomerBookings(customerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        id,
        first_name,
        last_name,
        phone,
        email
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

/**
 * Get single booking
 */
export async function getBookingDetails(id: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        id,
        first_name,
        last_name,
        phone,
        email
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

/**
 * Cancel booking
 */
export async function cancelBooking(id: string) {
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "Cancelled",
    })
    .eq("id", id)
    .eq("status", "Pending");

  if (error) throw error;
}

/**
 * Count customer bookings
 */
export async function getCustomerBookingCount(customerId: string) {
  const { count, error } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customerId);

  if (error) {
    console.error(error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Pending bookings
 */
export async function getPendingBookings(customerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("customer_id", customerId)
    .eq("status", "Pending");

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

/**
 * Completed bookings
 */
export async function getCompletedBookings(customerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("customer_id", customerId)
    .eq("status", "Completed");

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}