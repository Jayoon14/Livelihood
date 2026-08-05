import { supabase } from "../lib/supabase";

export type ProjectLifecycleStatus =
  | "Available"
  | "Reserved"
  | "Working"
  | "Completed"
  | "Cancelled";

export type ExtensionStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | null;

export interface ProjectLifecycleBooking {
  id: number;
  worker_id: string;
  customer_id: string;
  status: string;
  trip_status?: string | null;
  service_name?: string | null;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  actual_start_at?: string | null;
  actual_completed_at?: string | null;
  extended_until?: string | null;
  extension_requested_until?: string | null;
  extension_status?: ExtensionStatus;
  extension_reason?: string | null;
}

function requireBookingId(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("A valid booking ID is required.");
  }

  return value;
}

function requireUserId(value: string, label: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function getRpcErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

export function getEffectiveProjectEnd(
  booking: Pick<
    ProjectLifecycleBooking,
    "scheduled_end_at" | "extended_until"
  >,
): string | null {
  return booking.extended_until ?? booking.scheduled_end_at ?? null;
}

export function deriveProjectLifecycleStatus(
  booking: ProjectLifecycleBooking,
  now = new Date(),
): ProjectLifecycleStatus {
  const normalizedStatus = String(booking.status ?? "")
    .trim()
    .toLowerCase();

  if (normalizedStatus === "completed") {
    return "Completed";
  }

  if (
    normalizedStatus === "cancelled" ||
    normalizedStatus === "rejected"
  ) {
    return "Cancelled";
  }

  const startAt = booking.actual_start_at ?? booking.scheduled_start_at;
  const endAt = getEffectiveProjectEnd(booking);

  const start = startAt ? new Date(startAt).getTime() : Number.NaN;
  const end = endAt ? new Date(endAt).getTime() : Number.NaN;
  const current = now.getTime();

  const explicitlyWorking =
    normalizedStatus === "on going" ||
    normalizedStatus === "ongoing" ||
    String(booking.trip_status ?? "").trim().toLowerCase() === "on trip";

  if (
    explicitlyWorking ||
    (Number.isFinite(start) &&
      start <= current &&
      (!Number.isFinite(end) || current < end) &&
      normalizedStatus === "approved")
  ) {
    return "Working";
  }

  if (
    normalizedStatus === "approved" &&
    Number.isFinite(start) &&
    start > current
  ) {
    return "Reserved";
  }

  return "Available";
}

export function calculateProjectProgress(
  booking: ProjectLifecycleBooking,
  now = new Date(),
): number {
  const startValue =
    booking.actual_start_at ?? booking.scheduled_start_at;
  const endValue = getEffectiveProjectEnd(booking);

  if (!startValue || !endValue) {
    return 0;
  }

  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(((now.getTime() - start) / (end - start)) * 100),
    ),
  );
}

export async function requestProjectExtension(
  bookingId: number,
  workerId: string,
  requestedUntil: string,
  reason = "",
): Promise<void> {
  const id = requireBookingId(bookingId);
  const worker = requireUserId(workerId, "Worker ID");

  const requestedDate = new Date(requestedUntil);

  if (Number.isNaN(requestedDate.getTime())) {
    throw new Error("A valid requested completion date is required.");
  }

  const { error } = await supabase.rpc(
    "request_project_extension",
    {
      p_booking_id: id,
      p_worker_id: worker,
      p_requested_until: requestedDate.toISOString(),
      p_reason: reason.trim() || null,
    },
  );

  if (error) {
    throw new Error(
      getRpcErrorMessage(
        error,
        "Unable to request a project extension.",
      ),
    );
  }
}

export async function respondToProjectExtension(
  bookingId: number,
  customerId: string,
  approved: boolean,
): Promise<void> {
  const id = requireBookingId(bookingId);
  const customer = requireUserId(customerId, "Customer ID");

  const { error } = await supabase.rpc(
    "respond_project_extension",
    {
      p_booking_id: id,
      p_customer_id: customer,
      p_approved: approved,
    },
  );

  if (error) {
    throw new Error(
      getRpcErrorMessage(
        error,
        "Unable to respond to the extension request.",
      ),
    );
  }
}
