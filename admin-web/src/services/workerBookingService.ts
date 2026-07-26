import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

// GET ALL WORKER BOOKINGS

export async function getWorkerBookings(workerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      service:services!service_id(
        id,
        service_name,
        category,
        description,
        price
      ),
      customer:profiles!customer_id(
        id,
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        profile_picture
      )
    `,
    )
    .eq("worker_id", workerId)
    .eq("worker_deleted", false)
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
  status: "Pending" | "Approved" | "Completed" | "Cancelled",
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
  id: number,
  workerId: string,
) {
  const { data: booking, error } = await supabase
    .from("bookings")
    .update({
      status: "Approved",
      trip_status: "Accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("worker_id", workerId)
    .eq("status", "Pending")
    .select(
      `
        id,
        customer_id,
        worker_id,
        status,
        trip_status,
        accepted_at
      `,
    )
    .single();

  if (error) {
    throw error;
  }

  await createNotification(
    booking.customer_id,
    booking.id,
    "Booking Approved",
    "Your booking request has been accepted by the worker.",
  );

  return booking;
}

// WORKER REJECT BOOKING

export async function rejectBooking(
  id: number,
  workerId: string,
) {
  const { data: booking, error } = await supabase
    .from("bookings")
    .update({
      status: "Cancelled",
      trip_status: "Cancelled",
      cancel_reason: "Worker rejected the booking request.",
    })
    .eq("id", id)
    .eq("worker_id", workerId)
    .eq("status", "Pending")
    .select(
      `
        id,
        customer_id,
        worker_id,
        status,
        trip_status,
        cancel_reason
      `,
    )
    .single();

  if (error) {
    throw error;
  }

  await createNotification(
    booking.customer_id,
    booking.id,
    "Booking Declined",
    "The worker declined your booking request.",
  );

  return booking;
}
// WORKER MARK AS ARRIVED

export async function markWorkerArrived(
  id: number,
  workerId: string,
) {
  console.log("Updating booking:", {
    id,
    workerId,
  });

  const { data: booking, error } = await supabase
    .from("bookings")
    .update({
      trip_status: "Arrived",
      arrived_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("worker_id", workerId)
    .eq("status", "Approved")
    .eq("trip_status", "Accepted")
    .select("*")
    .single();

  console.log("UPDATE RESULT:", booking);
  console.log("UPDATE ERROR:", error);

  if (error) throw error;

  const { data: verify } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  console.log("READ AFTER UPDATE:", verify);

  return booking;
}
// WORKER START SERVICE

export async function startTrip(
  id: number,
  workerId: string,
) {
  const { data: booking, error } = await supabase
    .from("bookings")
    .update({
      status: "On Going",
      trip_status: "On Trip",
      trip_started_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("worker_id", workerId)
    .eq("status", "Approved")
    .eq("trip_status", "Arrived")
    .select(
      `
        id,
        customer_id,
        worker_id,
        status,
        trip_status,
        trip_started_at
      `,
    )
    .single();

  if (error) {
    throw error;
  }

  await createNotification(
    booking.customer_id,
    booking.id,
    "Service Started",
    "The worker has started your service.",
  );

  return booking;
}
// WORKER COMPLETE BOOKING

// WORKER COMPLETE SERVICE

export async function completeBooking(
  id: number,
  workerId: string,
) {
  const { data: booking, error } = await supabase
    .from("bookings")
    .update({
      status: "Completed",
      trip_status: "Completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("worker_id", workerId)
    .eq("status", "On Going")
    .eq("trip_status", "On Trip")
    .select(
      `
        id,
        customer_id,
        worker_id,
        status,
        trip_status,
        completed_at
      `,
    )
    .single();

  if (error) {
    console.error(
      "Complete service error:",
      error,
    );

    throw error;
  }

  await createNotification(
    booking.customer_id,
    booking.id,
    "Service Completed",
    "The worker marked your service as completed. You may now review the completed work.",
  );

  return booking;
}

// GET SINGLE BOOKING

export async function getBooking(bookingId: number) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
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
    `,
    )
    .eq("id", bookingId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// GET PENDING BOOKINGS

export async function getPendingBookings(workerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customer:profiles!customer_id(
        first_name,
        last_name
      )
    `,
    )
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

export async function getCompletedBookings(workerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customer:profiles!customer_id(
        first_name,
        last_name
      )
    `,
    )
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
