import { supabase } from "../lib/supabase";


// ==============================
// CREATE PAYMENT
// ==============================

export async function createPayment(
  bookingId: number,
  customerId: string,
  workerId: string,
  amount: number,
  paymentMethod: string
) {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      booking_id: bookingId,
      customer_id: customerId,
      worker_id: workerId,
      amount,
      payment_method: paymentMethod,
      payment_status: "Pending",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}


// ==============================
// GET WORKER PAYMENTS
// ==============================

export async function getWorkerPayments(workerId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}


// ==============================
// GET ALL PAYMENTS
// ==============================

export async function getAllPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      customer:profiles!customer_id(
        first_name,
        last_name
      ),
      worker:profiles!worker_id(
        first_name,
        last_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}


// ==============================
// COMPLETE PAYMENT
// ==============================

export async function completePayment(id: number) {
  const { error } = await supabase
    .from("payments")
    .update({
      payment_status: "Paid",
    })
    .eq("id", id);

  if (error) throw error;
}


// ==============================
// GET WORKER TOTAL EARNINGS
// ==============================

export async function getWorkerTotalEarnings(workerId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("worker_id", workerId)
    .eq("payment_status", "Paid");

  if (error) throw error;

  const total =
    data?.reduce(
      (sum, payment) =>
        sum + Number(payment.amount),
      0
    ) ?? 0;

  return total;
}


// ==============================
// GET TOTAL REVENUE
// ==============================

export async function getTotalRevenue() {
  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("payment_status", "Paid");

  if (error) throw error;

  return (
    data?.reduce(
      (sum, payment) =>
        sum + Number(payment.amount),
      0
    ) ?? 0
  );
}


// ==============================
// GET PAYMENT BY BOOKING
// ==============================

export async function getPaymentByBooking(
  bookingId: number
) {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      customer:profiles!customer_id(
        first_name,
        last_name
      ),
      worker:profiles!worker_id(
        first_name,
        last_name
      )
    `)
    .eq("booking_id", bookingId)
    .single();

  if (error) throw error;

  return data;
}


// ==============================
// GET CUSTOMER PAYMENTS
// ==============================

export async function getCustomerPayments(
  customerId: string
) {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      worker:profiles!worker_id(
        first_name,
        last_name,
        profile_picture
      )
    `)
    .eq("customer_id", customerId)
    .order("created_at", {
      ascending: false,
    });

  if (error) throw error;

  return data ?? [];
}

