import { supabase } from "../lib/supabase";
import type { PaymentForm } from "../types/paymentForm";

export async function getWorkerPaymentInformation(workerId: string) {
  const { data, error } = await supabase
    .from("worker_payment_information")
    .select("*")
    .eq("worker_id", workerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveWorkerPaymentInformation(
  workerId: string,
  values: PaymentForm,
) {
  if (!workerId) {
    throw new Error("Worker ID is required.");
  }

  const payload = {
    worker_id: workerId,

    accept_cash: values.accept_cash,

    enable_gcash: values.enable_gcash,
    gcash_name: values.gcash_name.trim(),
    gcash_number: values.gcash_number.trim(),
    gcash_qr: values.gcash_qr,

    enable_maya: values.enable_maya,
    maya_name: values.maya_name.trim(),
    maya_number: values.maya_number.trim(),
    maya_qr: values.maya_qr,

    enable_bank: values.enable_bank,
    bank_name: values.bank_name.trim(),
    account_name: values.account_name.trim(),

    // Existing column, ginagamit bilang card number.
    account_number: values.account_number.replace(/\s/g, "").trim(),

    card_expiration: values.card_expiration.trim(),

    bank_qr: values.bank_qr,
  };

  const { data: existing, error: lookupError } = await supabase
    .from("worker_payment_information")
    .select("id")
    .eq("worker_id", workerId)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("worker_payment_information")
      .update(payload)
      .eq("worker_id", workerId);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: insertError } = await supabase
    .from("worker_payment_information")
    .insert(payload);

  if (insertError) {
    throw insertError;
  }
}
