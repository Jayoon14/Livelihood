import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

export interface CompletionWorkflowResult {
  bookingId: number;
  customerId: string;
  workerId: string;
  paymentStatus: string | null;
  status: "Completed";
  completionStatus: "Customer Confirmed";
}

function requirePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} is invalid.`);
  }

  return value;
}

function requireId(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${field} is required.`);
  }

  return normalized;
}

function errorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();
    if (message) return message;
  }

  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

async function getCurrentCustomerId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(
      `Unable to verify your session: ${error.message}`,
    );
  }

  if (!user) {
    throw new Error(
      "Your session has expired. Please sign in again.",
    );
  }

  return user.id;
}

async function notifySafely(
  userId: string,
  bookingId: number,
  title: string,
  message: string,
): Promise<void> {
  try {
    await createNotification(
      userId,
      bookingId,
      title,
      message,
    );
  } catch (error) {
    console.error(
      `Booking ${bookingId} changed, but notification failed:`,
      error,
    );
  }
}

/**
 * Customer confirms that the worker's submitted completion proof
 * is satisfactory.
 *
 * Payment is NOT automatically marked Paid here. The customer is
 * redirected to payment when the booking is still unpaid.
 */
export async function confirmCompletedWork(
  bookingId: number,
  expectedWorkerId: string,
): Promise<CompletionWorkflowResult> {
  const validBookingId = requirePositiveInteger(
    bookingId,
    "Booking ID",
  );
  const workerId = requireId(
    expectedWorkerId,
    "Worker ID",
  );
  const customerId = await getCurrentCustomerId();

  const { data: currentBooking, error: fetchError } =
    await supabase
      .from("bookings")
      .select(
        `
          id,
          customer_id,
          worker_id,
          status,
          trip_status,
          completion_status,
          payment_status,
          is_deleted
        `,
      )
      .eq("id", validBookingId)
      .eq("customer_id", customerId)
      .eq("worker_id", workerId)
      .eq("is_deleted", false)
      .maybeSingle();

  if (fetchError) {
    throw new Error(
      errorMessage(
        fetchError,
        "Unable to verify the booking.",
      ),
    );
  }

  if (!currentBooking) {
    throw new Error(
      "The booking was not found or does not belong to your account.",
    );
  }

  if (
    currentBooking.completion_status ===
    "Customer Confirmed"
  ) {
    return {
      bookingId: Number(currentBooking.id),
      customerId,
      workerId,
      paymentStatus:
        currentBooking.payment_status ?? null,
      status: "Completed",
      completionStatus: "Customer Confirmed",
    };
  }

  if (
    currentBooking.completion_status !==
    "Worker Completed"
  ) {
    throw new Error(
      "The worker has not submitted a completion proof that can be confirmed.",
    );
  }

  if (
    ![
      "Completed",
      "Waiting Customer Confirmation",
    ].includes(String(currentBooking.status))
  ) {
    throw new Error(
      "The booking is no longer waiting for customer confirmation.",
    );
  }

  const { data: updatedBooking, error: updateError } =
    await supabase
      .from("bookings")
      .update({
        status: "Completed",
        trip_status: "Completed",
        completion_status: "Customer Confirmed",
        completed_at:
          new Date().toISOString(),
      })
      .eq("id", validBookingId)
      .eq("customer_id", customerId)
      .eq("worker_id", workerId)
      .eq(
        "completion_status",
        "Worker Completed",
      )
      .in("status", [
        "Completed",
        "Waiting Customer Confirmation",
      ])
      .eq("is_deleted", false)
      .select(
        `
          id,
          customer_id,
          worker_id,
          payment_status,
          status,
          completion_status
        `,
      )
      .maybeSingle();

  if (updateError) {
    throw new Error(
      errorMessage(
        updateError,
        "Unable to confirm the completed work.",
      ),
    );
  }

  if (!updatedBooking) {
    throw new Error(
      "The work could not be confirmed because the booking status changed. Refresh and try again.",
    );
  }

  await notifySafely(
    workerId,
    validBookingId,
    "Work Confirmed",
    "The customer confirmed your completed service.",
  );

  return {
    bookingId: Number(updatedBooking.id),
    customerId,
    workerId,
    paymentStatus:
      updatedBooking.payment_status ?? null,
    status: "Completed",
    completionStatus: "Customer Confirmed",
  };
}

/**
 * Returns the booking to the active-work state so the worker can
 * correct the service and submit a new completion proof.
 */
export async function requestCompletionRevision(
  bookingId: number,
  expectedWorkerId: string,
  proofId: number,
  reason: string,
  existingNotes?: string | null,
): Promise<void> {
  const validBookingId = requirePositiveInteger(
    bookingId,
    "Booking ID",
  );
  const validProofId = requirePositiveInteger(
    proofId,
    "Completion proof ID",
  );
  const workerId = requireId(
    expectedWorkerId,
    "Worker ID",
  );
  const customerId = await getCurrentCustomerId();
  const normalizedReason = reason.trim();

  if (normalizedReason.length < 10) {
    throw new Error(
      "Please explain the requested revision using at least 10 characters.",
    );
  }

  if (normalizedReason.length > 500) {
    throw new Error(
      "Revision reason must not exceed 500 characters.",
    );
  }

  const { data: updatedBooking, error: updateError } =
    await supabase
      .from("bookings")
      .update({
        status: "On Going",
        trip_status: "On Trip",
        completion_status: "Not Started",
        completed_at: null,
      })
      .eq("id", validBookingId)
      .eq("customer_id", customerId)
      .eq("worker_id", workerId)
      .eq(
        "completion_status",
        "Worker Completed",
      )
      .in("status", [
        "Completed",
        "Waiting Customer Confirmation",
      ])
      .eq("is_deleted", false)
      .select("id")
      .maybeSingle();

  if (updateError) {
    throw new Error(
      errorMessage(
        updateError,
        "Unable to request a revision.",
      ),
    );
  }

  if (!updatedBooking) {
    throw new Error(
      "A revision can no longer be requested because the booking status changed.",
    );
  }

  const revisedNotes = [
    existingNotes?.trim(),
    `Customer revision request: ${normalizedReason}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { error: proofUpdateError } = await supabase
    .from("booking_completion_proofs")
    .update({
      notes: revisedNotes,
    })
    .eq("id", validProofId)
    .eq("booking_id", validBookingId)
    .eq("worker_id", workerId);

  if (proofUpdateError) {
    console.error(
      "Booking returned to ongoing, but revision notes were not saved:",
      proofUpdateError,
    );
  }

  await notifySafely(
    workerId,
    validBookingId,
    "Revision Requested",
    `The customer requested changes to the completed work: ${normalizedReason}`,
  );
}