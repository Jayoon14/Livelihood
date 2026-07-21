import { supabase } from "../lib/supabase";

export async function getWorkerPaymentInformation(workerId: string) {
  const { data, error } = await supabase
    .from("worker_payment_information")
    .select("*")
    .eq("worker_id", workerId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function saveWorkerPaymentInformation(
  workerId: string,
  values: any,
) {
  const payload = {
    worker_id: workerId,
    ...values,
  };

  const { data: existing } = await supabase
    .from("worker_payment_information")
    .select("id")
    .eq("worker_id", workerId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("worker_payment_information")
      .update(payload)
      .eq("worker_id", workerId);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("worker_payment_information")
      .insert(payload);

    if (error) throw error;
  }
}
