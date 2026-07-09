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
        middle_name,
        last_name,
        email,
        phone
      )
    `)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });


  if (error) {
    throw error;
  }


  return data ?? [];
}




/**
 * Get single booking details
 */
export async function getBookingDetails(id: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name,
        email,
        phone
      )
    `)
    .eq("id", id)
    .single();


  if (error) {
    throw error;
  }


  return data;
}





/**
 * Cancel booking
 * Customer can only cancel Pending booking
 */
export async function cancelBooking(id: string) {
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "Cancelled",
    })
    .eq("id", id)
    .eq("status", "Pending");


  if (error) {
    throw error;
  }
}





/**
 * Count customer bookings
 */
export async function getCustomerBookingCount(
  customerId: string
) {
  const { count, error } = await supabase
    .from("bookings")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("customer_id", customerId);


  if (error) {
    throw error;
  }


  return count ?? 0;
}





/**
 * Get Pending bookings
 */
export async function getPendingBookings(
  customerId: string
) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name
      )
    `)
    .eq("customer_id", customerId)
    .eq("status", "Pending");


  if (error) {
    throw error;
  }


  return data ?? [];
}





/**
 * Get Completed bookings
 */
export async function getCompletedBookings(
  customerId: string
) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name
      )
    `)
    .eq("customer_id", customerId)
    .eq("status", "Completed");


  if (error) {
    throw error;
  }


  return data ?? [];
}