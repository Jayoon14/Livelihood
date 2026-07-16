import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";


// =========================
// CREATE BOOKING
// =========================

export async function createBooking(
  customerId: string,
  workerId: string,
  bookingDate: string,
  bookingTime: string,
  address: string,
  notes: string
) {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      customer_id: customerId,
      worker_id: workerId,
      booking_date: bookingDate,
      booking_time: bookingTime,
      address,
      notes,
      status: "Pending",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  await createNotification(
    workerId,
    data.id,
    "New Booking Request",
    "A customer has sent you a booking request."
  );

  return data;
}


// =========================
// GET BOOKINGS
// =========================

export async function getBookings(status = "All") {
  let query = supabase
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
    .order("created_at", {
      ascending: false,
    });

  if (status !== "All") {
    query = query.eq(
      "status",
      status
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}


// =========================
// GET SINGLE BOOKING
// =========================

export async function getBooking(id: string) {
  const {
    data,
    error,
  } = await supabase
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
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}


// =========================
// UPDATE BOOKING STATUS
// =========================

export async function updateBookingStatus(
  bookingId: number,
  status:
    | "Pending"
    | "Approved"
    | "Completed"
    | "Cancelled"
) {

  const { data: booking, error } = await supabase
    .from("bookings")
    .update({
      status,
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (status === "Completed") {

    await createNotification(
      booking.customer_id,
      booking.id,
      "Job Completed",
      "Your booking has been completed. You may now leave a review."
    );

  }

  return booking;
}
// =========================
// ASSIGN WORKER
// =========================

export async function assignWorker(
  bookingId: string,
  workerId: string
) {
  const { error } = await supabase
    .from("bookings")
    .update({
      worker_id: workerId,
      status: "Approved",
    })
    .eq("id", bookingId);

  if (error) {
    throw error;
  }
}


// =========================
// WORKER ACCEPT BOOKING
// =========================

export async function acceptBooking(id: number) {

  const { data: booking, error } = await supabase
    .from("bookings")
    .update({
      status: "Approved",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  await createNotification(
    booking.customer_id,
    booking.id,
    "Booking Approved",
    "Your booking has been approved by the worker."
  );

  return booking;
}


// =========================
// WORKER REJECT BOOKING
// =========================

export async function rejectBooking(id: number) {

  const { data: booking, error } = await supabase
    .from("bookings")
    .update({
      status: "Cancelled",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  await createNotification(
    booking.customer_id,
    booking.id,
    "Booking Cancelled",
    "The worker declined your booking."
  );

  return booking;
}


// =========================
// GET BOOKING BY ID
// =========================

export async function getBookingById(id: number) {
  const {
    data,
    error,
  } = await supabase
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
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
// =========================
// CHECK WORKER AVAILABILITY
// =========================

export async function isWorkerAvailable(
  workerId: string,
  bookingDate: string,
  bookingTime: string
) {
  const {
    data: booked,
    error: bookingError,
  } = await supabase
    .from("bookings")
    .select("id")
    .eq(
      "worker_id",
      workerId
    )
    .eq(
      "booking_date",
      bookingDate
    )
    .eq(
      "booking_time",
      bookingTime
    )
    .neq(
      "status",
      "Cancelled"
    );

  if (bookingError) {
    throw bookingError;
  }

  if (booked && booked.length > 0) {
    return false;
  }

  const {
    data: unavailable,
    error: unavailableError,
  } = await supabase
    .from("unavailable_dates")
    .select("id")
    .eq(
      "worker_id",
      workerId
    )
    .eq(
      "unavailable_date",
      bookingDate
    );

  if (unavailableError) {
    throw unavailableError;
  }

  if (unavailable && unavailable.length > 0) {
    return false;
  }

  return true;
}


// ===========================
// CUSTOMER BOOKINGS
// ===========================

export async function getCustomerBookings(
  customerId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!bookings_worker_id_fkey(
        id,
        first_name,
        middle_name,
        last_name,
        profile_picture,
        phone,
        email
      )
    `)
    .eq(
      "customer_id",
      customerId
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}


// ===========================
// CANCEL BOOKING
// ===========================

export async function cancelBooking(
  id: number
) {
  const {
    error,
  } = await supabase
    .from("bookings")
    .update({
      status: "Cancelled",
    })
    .eq(
      "id",
      id
    );

  if (error) {
    throw error;
  }
}


// ===========================
// BOOKING TIMELINE
// ===========================

export function getBookingTimeline(
  status: string
) {
  return [
    {
      title: "Booking Submitted",
      done: true,
    },
    {
      title: "Worker Approved",
      done: status !== "Pending",
    },
    {
      title: "Work In Progress",
      done:
        status === "Completed" ||
        status === "Approved",
    },
    {
      title: "Completed",
      done: status === "Completed",
    },
  ];
}