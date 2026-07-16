import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";


/**
 * Get all bookings of logged in customer
 */
export async function getCustomerBookings(
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
        last_name,
        email,
        phone
      )
    `)
    .eq("customer_id", customerId)
    .order("created_at", {
      ascending: false,
    });


  if (error) {
    throw error;
  }


  return data ?? [];
}



/**
 * Get single booking details
 */
export async function getBookingDetails(
  id: string
) {
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
export async function cancelBooking(
  id: number
) {

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



// ===============================
// CREATE BOOKING
// ===============================

export async function createBooking(data: {

  customer_id: string;

  worker_id: string;

  service_id: string;

  booking_date: string;

  booking_time: string;

  address: string;

  notes: string;

}) {


  // GET SERVICE DETAILS

  const {
    data: service,
    error: serviceError,
  } = await supabase
    .from("services")
    .select(`
      service_name,
      category,
      price
    `)
    .eq("id", data.service_id)
    .single();



  if (serviceError) {

    throw serviceError;

  }



  // CREATE BOOKING

  const {
    data: booking,
    error,
  } = await supabase
    .from("bookings")
    .insert({

      customer_id: data.customer_id,

      worker_id: data.worker_id,

      service_id: data.service_id,

      service_name: service.service_name,

      category: service.category,

      price: service.price,

      booking_date: data.booking_date,

      booking_time: data.booking_time,

      address: data.address,

      notes: data.notes,

      status: "Pending",

    })
    .select()
    .single();



  if (error) {

    throw error;

  }



  // NOTIFY WORKER

  await createNotification(

    booking.worker_id,

    booking.id,

    "New Booking",

    "You have received a new booking request."

  );



  return booking;

}
export async function isWorkerAvailable(
  workerId: string,
  bookingDate: string,
  bookingTime: string
) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("worker_id", workerId)
    .eq("booking_date", bookingDate)
    .eq("booking_time", bookingTime)
    .in("status", ["Pending", "Approved", "On Going"]);

  if (error) {
    throw error;
  }

  return data.length === 0;
}