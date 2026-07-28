import { supabase } from "../lib/supabase";

export type BookingStatus =
  | "Pending"
  | "Approved"
  | "On Going"
  | "Completed"
  | "Cancelled"
  | "Rejected";

export interface AdminBookingProfile {
  full_name: string | null;
  email: string | null;
}

export interface AdminBooking {
  id: number;
  status: string;
  created_at: string;
  customer_id?: string | null;
  worker_id?: string | null;
  customer: AdminBookingProfile | null;
  worker: AdminBookingProfile | null;
  [key: string]: unknown;
}

type RelatedProfileValue =
  | AdminBookingProfile
  | AdminBookingProfile[]
  | null
  | undefined;

const ALLOWED_BOOKING_STATUSES: readonly BookingStatus[] = [
  "Pending",
  "Approved",
  "On Going",
  "Completed",
  "Cancelled",
  "Rejected",
];

function wrapError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return new Error(error.message);
  }

  return new Error(fallbackMessage);
}

function validateBookingId(id: number): number {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("A valid booking ID is required.");
  }

  return id;
}

function validateBookingStatus(status: string): BookingStatus {
  const normalizedStatus = status.trim();

  if (!ALLOWED_BOOKING_STATUSES.includes(normalizedStatus as BookingStatus)) {
    throw new Error(`Invalid booking status: ${normalizedStatus || "empty"}.`);
  }

  return normalizedStatus as BookingStatus;
}

function normalizeProfile(
  value: RelatedProfileValue,
): AdminBookingProfile | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeBooking(value: Record<string, unknown>): AdminBooking {
  return {
    ...value,
    id: Number(value.id),
    status: String(value.status ?? ""),
    created_at: String(value.created_at ?? ""),
    customer_id:
      value.customer_id === null || value.customer_id === undefined
        ? null
        : String(value.customer_id),
    worker_id:
      value.worker_id === null || value.worker_id === undefined
        ? null
        : String(value.worker_id),
    customer: normalizeProfile(value.customer as RelatedProfileValue),
    worker: normalizeProfile(value.worker as RelatedProfileValue),
  };
}

export async function getAllBookings(): Promise<AdminBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customer:profiles!customer_id(
        full_name,
        email
      ),
      worker:profiles!worker_id(
        full_name,
        email
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw wrapError(error, "Unable to load bookings.");
  }

  return (data ?? []).map((booking) =>
    normalizeBooking(booking as unknown as Record<string, unknown>),
  );
}

export async function updateBookingStatus(
  id: number,
  status: string,
): Promise<void> {
  const bookingId = validateBookingId(id);
  const validatedStatus = validateBookingStatus(status);

  const { error } = await supabase
    .from("bookings")
    .update({
      status: validatedStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    throw wrapError(error, "Unable to update booking status.");
  }
}
