import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

export type WorkerBookingStatus =
  | "Pending"
  | "Approved"
  | "On Going"
  | "Completed"
  | "Cancelled";

export type WorkerTripStatus =
  | "Not Started"
  | "Accepted"
  | "Arrived"
  | "On Trip"
  | "Completed"
  | "Cancelled";

export type WorkerCompletionStatus =
  | "Not Started"
  | "Worker Completed"
  | "Customer Confirmed";

type BookingActionResult = {
  id: number;
  customer_id: string;
  worker_id: string;
  status: WorkerBookingStatus;
  trip_status: WorkerTripStatus | null;
  completion_status?: WorkerCompletionStatus | null;
  accepted_at?: string | null;
  arrived_at?: string | null;
  trip_started_at?: string | null;
  completed_at?: string | null;
  cancel_reason?: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected booking error occurred.";
}

async function verifyWorkerSession(
  expectedWorkerId: string,
): Promise<void> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(
      `Unable to verify worker account: ${error.message}`,
    );
  }

  if (!user) {
    throw new Error("Worker is not authenticated.");
  }

  if (user.id !== expectedWorkerId) {
    throw new Error(
      "The authenticated account does not match the worker assigned to this booking.",
    );
  }
}

async function notifyCustomerSafely(
  customerId: string,
  bookingId: number,
  title: string,
  message: string,
): Promise<void> {
  try {
    await createNotification(
      customerId,
      bookingId,
      title,
      message,
    );
  } catch (error) {
    /*
     * The booking update has already succeeded.
     * Notification failure must not make the UI report that
     * the booking action itself failed.
     */
    console.error(
      `Booking ${bookingId} updated, but notification failed:`,
      error,
    );
  }
}

/**
 * Get all visible bookings assigned to a worker.
 */
export async function getWorkerBookings(workerId: string) {
  if (!workerId.trim()) {
    throw new Error("Worker ID is required.");
  }

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
    .eq("is_deleted", false)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Unable to load worker bookings: ${error.message}`,
    );
  }

  return data ?? [];
}

/**
 * Generic status update.
 *
 * Use the specific action functions whenever possible because
 * they enforce valid status transitions.
 */
export async function updateBookingStatus(
  bookingId: number,
  workerId: string,
  status: WorkerBookingStatus,
) {
  await verifyWorkerSession(workerId);

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status,
    })
    .eq("id", bookingId)
    .eq("worker_id", workerId)
    .eq("worker_deleted", false)
    .eq("is_deleted", false)
    .select("id, customer_id, worker_id, status, trip_status")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to update booking status: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The booking was not found or cannot be updated.",
    );
  }

  return data;
}

/**
 * Worker accepts a Pending booking.
 */
export async function acceptBooking(
  bookingId: number,
  workerId: string,
) {
  await verifyWorkerSession(workerId);

  const acceptedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "Approved",
      schedule_status: "Approved",
      trip_status: "Accepted",
      completion_status: "Not Started",
      accepted_at: acceptedAt,
      cancel_reason: null,
    })
    .eq("id", bookingId)
    .eq("worker_id", workerId)
    .eq("status", "Pending")
    .eq("worker_deleted", false)
    .eq("is_deleted", false)
    .select(
      `
        id,
        customer_id,
        worker_id,
        status,
        trip_status,
        completion_status,
        accepted_at
      `,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to accept the booking: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "This booking can no longer be accepted. It may already have been accepted, cancelled, or rejected.",
    );
  }

  const booking = data as BookingActionResult;

  await notifyCustomerSafely(
    booking.customer_id,
    booking.id,
    "Booking Approved",
    "Your booking request has been accepted by the worker.",
  );

  return booking;
}

/**
 * Worker rejects a Pending booking.
 *
 * The current application UI uses Cancelled for rejected
 * bookings, so this preserves that existing behavior.
 */
export async function rejectBooking(
  bookingId: number,
  workerId: string,
  reason = "Worker rejected the booking request.",
) {
  await verifyWorkerSession(workerId);

  const normalizedReason =
    reason.trim() || "Worker rejected the booking request.";

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "Cancelled",
      schedule_status: "Cancelled",
      trip_status: "Cancelled",
      cancel_reason: normalizedReason,
    })
    .eq("id", bookingId)
    .eq("worker_id", workerId)
    .eq("status", "Pending")
    .eq("worker_deleted", false)
    .eq("is_deleted", false)
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
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to reject the booking: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "This booking can no longer be rejected. It may already have been accepted, cancelled, or completed.",
    );
  }

  const booking = data as BookingActionResult;

  await notifyCustomerSafely(
    booking.customer_id,
    booking.id,
    "Booking Declined",
    "The worker declined your booking request.",
  );

  return booking;
}

/**
 * Worker marks that they have arrived at the service location.
 */
export async function markWorkerArrived(
  bookingId: number,
  workerId: string,
) {
  await verifyWorkerSession(workerId);

  const arrivedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .update({
      trip_status: "Arrived",
      arrived_at: arrivedAt,
    })
    .eq("id", bookingId)
    .eq("worker_id", workerId)
    .eq("status", "Approved")
    .eq("trip_status", "Accepted")
    .eq("worker_deleted", false)
    .eq("is_deleted", false)
    .select(
      `
        id,
        customer_id,
        worker_id,
        status,
        trip_status,
        arrived_at
      `,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to mark the worker as arrived: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Arrival cannot be recorded. The booking must be approved and currently accepted.",
    );
  }

  const booking = data as BookingActionResult;

  await notifyCustomerSafely(
    booking.customer_id,
    booking.id,
    "Worker Arrived",
    "The worker has arrived at the service location.",
  );

  return booking;
}

/**
 * Worker starts performing the service.
 *
 * Existing UI values are preserved:
 * status = On Going
 * trip_status = On Trip
 */
export async function startTrip(
  bookingId: number,
  workerId: string,
) {
  await verifyWorkerSession(workerId);

  const tripStartedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "On Going",
      schedule_status: "On Going",
      trip_status: "On Trip",
      completion_status: "Not Started",
      trip_started_at: tripStartedAt,
    })
    .eq("id", bookingId)
    .eq("worker_id", workerId)
    .eq("status", "Approved")
    .eq("trip_status", "Arrived")
    .eq("worker_deleted", false)
    .eq("is_deleted", false)
    .select(
      `
        id,
        customer_id,
        worker_id,
        status,
        trip_status,
        completion_status,
        trip_started_at
      `,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to start the service: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The service cannot be started. The worker must first be marked as arrived.",
    );
  }

  const booking = data as BookingActionResult;

  await notifyCustomerSafely(
    booking.customer_id,
    booking.id,
    "Service Started",
    "The worker has started your service.",
  );

  return booking;
}

/**
 * Worker marks the service as completed.
 *
 * Current application behavior finalizes status as Completed.
 * completion_status records that completion came from the worker.
 */
export async function completeBooking(
  bookingId: number,
  workerId: string,
) {
  await verifyWorkerSession(workerId);

  const completedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "Completed",
      schedule_status: "Completed",
      trip_status: "Completed",
      completion_status: "Worker Completed",
      completed_at: completedAt,
    })
    .eq("id", bookingId)
    .eq("worker_id", workerId)
    .eq("status", "On Going")
    .eq("trip_status", "On Trip")
    .eq("worker_deleted", false)
    .eq("is_deleted", false)
    .select(
      `
        id,
        customer_id,
        worker_id,
        status,
        trip_status,
        completion_status,
        completed_at
      `,
    )
    .maybeSingle();

  if (error) {
    console.error("Complete service error:", error);

    throw new Error(
      `Unable to complete the service: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The service cannot be completed. It must currently be marked as ongoing.",
    );
  }

  const booking = data as BookingActionResult;

  await notifyCustomerSafely(
    booking.customer_id,
    booking.id,
    "Service Completed",
    "The worker marked your service as completed. Please review and confirm the completed work.",
  );

  return booking;
}

/**
 * Get one booking for worker-side details and navigation.
 *
 * Ownership should also be enforced by Supabase RLS.
 */
export async function getBooking(
  bookingId: number,
  workerId?: string,
) {
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
          phone,
          profile_picture
        ),
        worker:profiles!worker_id(
          id,
          first_name,
          middle_name,
          last_name,
          email,
          phone
        ),
        service:services!service_id(
          id,
          service_name,
          category,
          description,
          price
        )
      `,
    )
    .eq("id", bookingId)
    .eq("is_deleted", false);

  if (workerId) {
    await verifyWorkerSession(workerId);

    query = query
      .eq("worker_id", workerId)
      .eq("worker_deleted", false);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load booking: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The booking was not found or is no longer available.",
    );
  }

  return data;
}

/**
 * Get Pending worker bookings.
 */
export async function getPendingBookings(
  workerId: string,
) {
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
          phone,
          profile_picture
        )
      `,
    )
    .eq("worker_id", workerId)
    .eq("status", "Pending")
    .eq("worker_deleted", false)
    .eq("is_deleted", false)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Unable to load pending bookings: ${error.message}`,
    );
  }

  return data ?? [];
}

/**
 * Get Completed worker bookings.
 */
export async function getCompletedBookings(
  workerId: string,
) {
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
          phone,
          profile_picture
        )
      `,
    )
    .eq("worker_id", workerId)
    .eq("status", "Completed")
    .eq("worker_deleted", false)
    .eq("is_deleted", false)
    .order("completed_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Unable to load completed bookings: ${error.message}`,
    );
  }

  return data ?? [];
}

/**
 * Soft-delete a booking from the worker's own list.
 */
export async function deleteWorkerBooking(
  bookingId: number,
  workerId: string,
) {
  await verifyWorkerSession(workerId);

  const { data, error } = await supabase
    .from("bookings")
    .update({
      worker_deleted: true,
    })
    .eq("id", bookingId)
    .eq("worker_id", workerId)
    .eq("is_deleted", false)
    .select("id, worker_deleted")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to remove the booking: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "The booking was not found or has already been removed.",
    );
  }

  return data;
}

/**
 * Useful helper for pages that need a readable error.
 */
export function getWorkerBookingErrorMessage(
  error: unknown,
): string {
  return getErrorMessage(error);
}