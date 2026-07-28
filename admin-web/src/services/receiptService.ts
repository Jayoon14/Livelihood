import { supabase } from "../lib/supabase";

export interface ReceiptService {
  service_name: string | null;
}

export interface ReceiptBooking {
  id: number;
  booking_date: string | null;
  booking_time: string | null;
  address: string | null;
  services: ReceiptService | ReceiptService[] | null;
}

export interface ReceiptProfile {
  first_name: string | null;
  last_name: string | null;
}

export interface PaymentTransaction {
  id: number;
  amount: number | null;
  payment_method: string | null;
  reference_number: string | null;
  transaction_status: string | null;
  approved_at: string | null;
  created_at: string | null;
}

export interface ReceiptResult {
  id: number;
  booking_id: number;
  customer_id: string;
  worker_id: string;
  amount: number | null;
  total_amount: number;
  amount_paid: number;
  balance: number;
  payment_status: string;
  created_at: string | null;
  booking: ReceiptBooking | null;
  customer: ReceiptProfile | null;
  worker: ReceiptProfile | null;
  payment_transactions: PaymentTransaction[];
  payment_method: string | null;
  reference_number: string | null;
  approved_transactions: PaymentTransaction[];
}

interface RawReceiptPayment {
  id: number;
  booking_id: number;
  customer_id: string;
  worker_id: string;
  amount: number | null;
  amount_paid: number | null;
  balance: number | null;
  payment_status: string | null;
  created_at: string | null;
  booking: ReceiptBooking | ReceiptBooking[] | null;
  customer: ReceiptProfile | ReceiptProfile[] | null;
  worker: ReceiptProfile | ReceiptProfile[] | null;
  payment_transactions: PaymentTransaction[] | null;
}

function wrapError(error: unknown, fallback: string): Error {
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

  return new Error(fallback);
}

function validateBookingId(bookingId: number): number {
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    throw new Error("Invalid booking ID.");
  }

  return bookingId;
}

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getTransactionTimestamp(transaction: PaymentTransaction): number {
  const value = transaction.approved_at ?? transaction.created_at ?? null;

  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export async function getReceipt(bookingId: number): Promise<ReceiptResult> {
  const validatedBookingId = validateBookingId(bookingId);

  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      id,
      booking_id,
      customer_id,
      worker_id,
      amount,
      amount_paid,
      balance,
      payment_status,
      created_at,

      booking:bookings!booking_id(
        id,
        booking_date,
        booking_time,
        address,
        services(
          service_name
        )
      ),

      customer:profiles!customer_id(
        first_name,
        last_name
      ),

      worker:profiles!worker_id(
        first_name,
        last_name
      ),

      payment_transactions(
        id,
        amount,
        payment_method,
        reference_number,
        transaction_status,
        approved_at,
        created_at
      )
    `,
    )
    .eq("booking_id", validatedBookingId)
    .maybeSingle();

  if (error) {
    throw wrapError(error, "Unable to load receipt.");
  }

  if (!data) {
    throw new Error("No payment record found for this booking.");
  }

  const payment = data as unknown as RawReceiptPayment;

  const approvedTransactions = [...(payment.payment_transactions ?? [])]
    .filter(
      (transaction) =>
        transaction.transaction_status?.trim().toLowerCase() === "approved",
    )
    .sort(
      (first, second) =>
        getTransactionTimestamp(first) - getTransactionTimestamp(second),
    );

  if (approvedTransactions.length === 0) {
    throw new Error("No approved payment transactions found.");
  }

  const totalAmount = Number(payment.amount ?? 0);

  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    throw new Error("The payment total is invalid.");
  }

  const computedAmountPaid = approvedTransactions.reduce(
    (total, transaction) => {
      const transactionAmount = Number(transaction.amount ?? 0);

      return Number.isFinite(transactionAmount)
        ? total + transactionAmount
        : total;
    },
    0,
  );

  const remainingBalance = Math.max(totalAmount - computedAmountPaid, 0);

  if (remainingBalance > 0) {
    throw new Error(
      `Receipt is not available yet. Remaining balance: ₱${remainingBalance.toFixed(
        2,
      )}.`,
    );
  }

  return {
    id: Number(payment.id),
    booking_id: Number(payment.booking_id),
    customer_id: String(payment.customer_id),
    worker_id: String(payment.worker_id),
    amount: payment.amount,
    total_amount: totalAmount,
    amount_paid: computedAmountPaid,
    balance: remainingBalance,
    payment_status: "Paid",
    created_at: payment.created_at,
    booking: normalizeRelation(payment.booking),
    customer: normalizeRelation(payment.customer),
    worker: normalizeRelation(payment.worker),
    payment_transactions: payment.payment_transactions ?? [],
    payment_method:
      approvedTransactions.length === 1
        ? approvedTransactions[0].payment_method
        : `${approvedTransactions.length} payment methods`,
    reference_number:
      approvedTransactions.length === 1
        ? approvedTransactions[0].reference_number
        : "Multiple references",
    approved_transactions: approvedTransactions,
  };
}
