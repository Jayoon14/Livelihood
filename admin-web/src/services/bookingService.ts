import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";
import { createSchedule } from "./scheduleService";

// =========================
// CREATE BOOKING
// =========================

export async function createBooking(booking: {
  customer_id: string;
  worker_id: string;
  service_id: string;
  booking_date: string;
  booking_time: string;
  address: string;
  notes: string;
}) {
  const available = await isWorkerAvailable(
    booking.worker_id,
    booking.booking_date,
    booking.booking_time,
  );

  if (!available) {
    throw new Error(
      "This time slot has already been booked. Please choose another schedule.",
    );
  }

  // Kunin ang presyo ng service

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("price")
    .eq("id", booking.service_id)
    .single();

  if (serviceError) throw serviceError;

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      ...booking,

      price: service.price,

      status: "Pending",

      payment_status: "Unpaid",

      schedule_status: "Pending",

      completion_status: "Not Started",
    })
    .select()
    .single();

  if (error) throw error;

  // =========================
  // NOTIFY WORKER
  // =========================

  await createNotification(
    booking.worker_id,
    data.id,
    "New Booking Request",
    "A customer has sent you a booking request.",
  );

  // =========================
  // NOTIFY ADMINS
  // =========================

  const { data: admins, error: adminError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");

  if (adminError) {
    console.error(adminError);
  }

  if (admins) {
    for (const admin of admins) {
      await createNotification(
        admin.id,
        data.id,
        "New Booking Created",
        "A new booking has been created.",
      );
    }
  }

  return data;
}

// =========================
// GET BOOKINGS
// =========================

export async function getBookings(status = "All") {
  let query = supabase
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
    .order("created_at", {
      ascending: false,
    });

  if (status !== "All") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

// =========================
// GET SINGLE BOOKING
// =========================

export async function getBooking(id: string) {
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
  status: "Pending" | "Approved" | "Completed" | "Cancelled",
) {
  const updateData: {
    status: typeof status;
    completion_status?: "Completed";
  } = {
    status,
  };

  if (status === "Completed") {
    updateData.completion_status = "Completed";
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .update(updateData)
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
      "Your booking has been completed. You may now leave a review.",
    );

    // =========================
    // NOTIFY ADMINS
    // =========================

    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("role", "admin");

    if (adminError) {
      console.error(adminError);
    }

    if (admins) {
      for (const admin of admins) {
        await createNotification(
          admin.id,
          booking.id,
          "Booking Completed",
          "A booking has been completed.",
        );
      }
    }
  }

  return booking;
}
// =========================
// WORKER ACCEPT BOOKING
// =========================

export async function acceptBooking(id: number) {
  const { data: booking, error } = await supabase
    .from("bookings")
    .update({
      status: "Approved",
      schedule_status: "Pending",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Notify Customer

  await createNotification(
    booking.customer_id,
    booking.id,
    "Booking Approved",
    "Your booking has been approved by the worker.",
  );

  // =========================
  // NOTIFY ADMINS
  // =========================

  const { data: admins, error: adminError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");

  if (adminError) {
    console.error(adminError);
  }

  if (admins) {
    for (const admin of admins) {
      await createNotification(
        admin.id,
        booking.id,
        "Booking Approved",
        "A worker approved a booking.",
      );
    }
  }

  await createSchedule({
    booking_id: booking.id,

    worker_id: booking.worker_id,

    customer_id: booking.customer_id,

    schedule_date: booking.booking_date,

    schedule_time: booking.booking_time,

    address: booking.address,

    status: "Scheduled",
  });

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

  // Notify Customer

  await createNotification(
    booking.customer_id,
    booking.id,
    "Booking Cancelled",
    "Unfortunately, the worker cancelled your booking.",
  );

  // =========================
  // NOTIFY ADMINS
  // =========================

  const { data: admins, error: adminError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");

  if (adminError) {
    console.error(adminError);
  }

  if (admins) {
    for (const admin of admins) {
      await createNotification(
        admin.id,
        booking.id,
        "Booking Cancelled",
        "A worker rejected a booking.",
      );
    }
  }

  return booking;
}

// =========================
// GET BOOKING BY ID
// =========================

export async function getBookingById(id: number) {
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
  bookingTime: string,
) {
  const { data: booked, error: bookingError } = await supabase
    .from("bookings")
    .select("id")
    .eq("worker_id", workerId)
    .eq("booking_date", bookingDate)
    .eq("booking_time", bookingTime)
    .neq("status", "Cancelled");

  if (bookingError) {
    throw bookingError;
  }

  if (booked && booked.length > 0) {
    return false;
  }

  const { data: unavailable, error: unavailableError } = await supabase
    .from("unavailable_dates")
    .select("id")
    .eq("worker_id", workerId)
    .eq("unavailable_date", bookingDate);

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

export async function getCustomerBookings(customerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
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
      `,
    )
    .eq("customer_id", customerId)
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

export async function cancelBooking(id: number) {
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

// ===========================
// BOOKING TIMELINE
// ===========================

export function getBookingTimeline(status: string) {
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
      done: status === "Completed" || status === "Approved",
    },

    {
      title: "Completed",
      done: status === "Completed",
    },
  ];
}
