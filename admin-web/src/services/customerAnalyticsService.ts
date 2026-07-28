import { supabase } from "../lib/supabase";

export interface CustomerAnalytics {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  favoriteWorkers: number;
  totalPayments: number;
}

interface BookingStatusRow {
  status: string | null;
}

interface PaymentAmountRow {
  amount: number | string | null;
}

function requireCustomerId(customerId: string): string {
  const normalizedCustomerId = customerId.trim();

  if (!normalizedCustomerId) {
    throw new Error("Customer ID is required.");
  }

  return normalizedCustomerId;
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

function normalizeStatus(status: string | null): string {
  return status?.trim().toLowerCase() ?? "";
}

function toValidAmount(value: number | string | null): number {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export async function getCustomerAnalytics(
  customerId: string,
): Promise<CustomerAnalytics> {
  const normalizedCustomerId = requireCustomerId(customerId);

  const [bookingsResult, favoritesResult, paymentsResult] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("status")
        .eq("customer_id", normalizedCustomerId),

      supabase
        .from("favorites")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("customer_id", normalizedCustomerId),

      supabase
        .from("payments")
        .select("amount")
        .eq("customer_id", normalizedCustomerId)
        .eq("payment_status", "Paid"),
    ]);

  if (bookingsResult.error) {
    throw wrapError(
      bookingsResult.error,
      "Unable to load customer booking analytics.",
    );
  }

  if (favoritesResult.error) {
    throw wrapError(
      favoritesResult.error,
      "Unable to load favorite worker analytics.",
    );
  }

  if (paymentsResult.error) {
    throw wrapError(
      paymentsResult.error,
      "Unable to load customer payment analytics.",
    );
  }

  const bookings =
    (bookingsResult.data as BookingStatusRow[] | null) ?? [];

  const payments =
    (paymentsResult.data as PaymentAmountRow[] | null) ?? [];

  const completedBookings = bookings.filter(
    ({ status }) => normalizeStatus(status) === "completed",
  ).length;

  const pendingBookings = bookings.filter(
    ({ status }) => normalizeStatus(status) === "pending",
  ).length;

  const cancelledBookings = bookings.filter(
    ({ status }) =>
      normalizeStatus(status) === "cancelled" ||
      normalizeStatus(status) === "canceled",
  ).length;

  const totalPayments = payments.reduce(
    (total, payment) => total + toValidAmount(payment.amount),
    0,
  );

  return {
    totalBookings: bookings.length,
    completedBookings,
    pendingBookings,
    cancelledBookings,
    favoriteWorkers: favoritesResult.count ?? 0,
    totalPayments,
  };
}