import { supabase } from "../lib/supabase";

export interface UpcomingBookingWorker {
  first_name: string | null;
  last_name: string | null;
  profile_picture: string | null;
}

export interface UpcomingBookingService {
  service_name: string | null;
}

export interface UpcomingBooking {
  id: number;
  customer_id: string;
  worker_id: string | null;
  service_id: number | null;
  booking_date: string;
  booking_time: string | null;
  status: string;
  worker: UpcomingBookingWorker | null;
  service: UpcomingBookingService | null;
}

type WorkerRelation =
  | UpcomingBookingWorker
  | UpcomingBookingWorker[]
  | null;

type ServiceRelation =
  | UpcomingBookingService
  | UpcomingBookingService[]
  | null;

interface RawUpcomingBooking {
  id: number;
  customer_id: string;
  worker_id: string | null;
  service_id: number | null;
  booking_date: string;
  booking_time: string | null;
  status: string;
  worker: WorkerRelation;
  service: ServiceRelation;
}

function wrapError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return new Error((error as { message: string }).message);
  }

  return new Error(fallbackMessage);
}

function requireCustomerId(customerId: string): string {
  const normalizedCustomerId = customerId.trim();

  if (!normalizedCustomerId) {
    throw new Error("Customer ID is required.");
  }

  return normalizedCustomerId;
}

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function getUpcomingBooking(
  customerId: string,
): Promise<UpcomingBooking | null> {
  const normalizedCustomerId = requireCustomerId(customerId);
  const today = getLocalDateString();

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      customer_id,
      worker_id,
      service_id,
      booking_date,
      booking_time,
      status,
      worker:profiles!worker_id(
        first_name,
        last_name,
        profile_picture
      ),
      service:services!service_id(
        service_name
      )
    `)
    .eq("customer_id", normalizedCustomerId)
    .in("status", ["Pending", "Approved"])
    .gte("booking_date", today)
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw wrapError(error, "Unable to load the upcoming booking.");
  }

  if (!data) {
    return null;
  }

  const booking = data as unknown as RawUpcomingBooking;

  return {
    id: booking.id,
    customer_id: booking.customer_id,
    worker_id: booking.worker_id,
    service_id: booking.service_id,
    booking_date: booking.booking_date,
    booking_time: booking.booking_time,
    status: booking.status,
    worker: normalizeRelation(booking.worker),
    service: normalizeRelation(booking.service),
  };
}