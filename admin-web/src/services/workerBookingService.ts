import { supabase } from "../lib/supabase";


export async function getWorkerBookings(workerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:profiles!customer_id(
        id,
        first_name,
        middle_name,
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
  status:
    | "Pending"
    | "Approved"
    | "Completed"
    | "Cancelled"
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





// WORKER ACCEPT BOOKING
export async function acceptBooking(id: number) {
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "Approved",
    })
    .eq("id", id);


  if (error) {
    throw error;
  }
}





// WORKER REJECT BOOKING
export async function rejectBooking(id: number) {
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "Cancelled",
    })
    .eq("id", id);


  if (error) {
    throw error;
  }
}





export async function getBooking(bookingId: number) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:profiles!customer_id(
        id,
        first_name,
        middle_name,
        last_name,
        email,
        phone
      ),
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name,
        email,
        phone
      )
    `)
    .eq("id", bookingId)
    .single();


  if (error) {
    throw error;
  }


  return data;
}