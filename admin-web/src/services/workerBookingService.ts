import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";


// GET ALL WORKER BOOKINGS

export async function getWorkerBookings(
  workerId: string
) {
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
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}


// UPDATE BOOKING STATUS

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

export async function acceptBooking(
  id: number
) {
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "Approved",
    })
    .eq("id", id);

  if (error) {
    throw error;
  }


  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();


  if (booking) {
    await createNotification(
      booking.customer_id,
      booking.id,
      "Booking Approved",
      "Your booking request has been approved."
    );
  }
}


// WORKER REJECT BOOKING

export async function rejectBooking(
  id: number
) {
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "Cancelled",
    })
    .eq("id", id);

  if (error) {
    throw error;
  }


  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();


  if (booking) {
    await createNotification(
      booking.customer_id,
      booking.id,
      "Booking Cancelled",
      "Unfortunately your booking request was declined."
    );
  }
}


// WORKER COMPLETE BOOKING

export async function completeBooking(
  id: number
) {
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "Completed",
    })
    .eq("id", id);

  if (error) {
    throw error;
  }


  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();


  if (booking) {
    await createNotification(
      booking.customer_id,
      booking.id,
      "Booking Completed",
      "Please leave a review for your completed booking."
    );
  }
}


// GET SINGLE BOOKING

export async function getBooking(
  bookingId: number
) {
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


// GET PENDING BOOKINGS

export async function getPendingBookings(
  workerId: string
) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:profiles!customer_id(
        first_name,
        last_name
      )
    `)
    .eq("worker_id", workerId)
    .eq("status", "Pending")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}


// GET COMPLETED BOOKINGS

export async function getCompletedBookings(
  workerId: string
) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:profiles!customer_id(
        first_name,
        last_name
      )
    `)
    .eq("worker_id", workerId)
    .eq("status", "Completed")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}