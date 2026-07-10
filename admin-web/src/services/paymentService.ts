import { supabase } from "../lib/supabase";

export async function createPayment(
  bookingId: number,
  customerId: string,
  workerId: string,
  amount: number,
  paymentMethod: string
) {
  const { error } = await supabase
    .from("payments")
    .insert({
      booking_id: bookingId,
      customer_id: customerId,
      worker_id: workerId,
      amount,
      payment_method: paymentMethod,
      payment_status: "Pending",
    });

  if (error) throw error;
}

export async function getWorkerPayments(workerId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

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

export async function completePayment(id: number) {
  const { error } = await supabase
    .from("payments")
    .update({
      payment_status: "Paid",
    })
    .eq("id", id);

  if (error) throw error;
}

export async function getWorkerTotalEarnings(workerId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("worker_id", workerId)
    .eq("payment_status", "Paid");

  if (error) throw error;

  const total =
    data?.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    ) ?? 0;

  return total;
}

export async function getTotalRevenue() {
  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("payment_status", "Paid");

  if (error) throw error;

  return (
    data?.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    ) ?? 0
  );
}