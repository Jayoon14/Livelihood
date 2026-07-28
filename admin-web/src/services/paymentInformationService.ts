import { supabase } from "../lib/supabase";
import type { PaymentForm } from "../types/paymentForm";

export interface WorkerPaymentInformation {
  id?: number;
  worker_id: string;

  accept_cash: boolean;

  enable_gcash: boolean;
  gcash_name: string;
  gcash_number: string;
  gcash_qr: string | null;

  enable_maya: boolean;
  maya_name: string;
  maya_number: string;
  maya_qr: string | null;

  enable_bank: boolean;
  bank_name: string;
  account_name: string;
  account_number: string;
  card_expiration: string;
  bank_qr: string | null;

  created_at?: string;
  updated_at?: string;
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

function requireWorkerId(workerId: string): string {
  const normalizedWorkerId = workerId.trim();

  if (!normalizedWorkerId) {
    throw new Error("Worker ID is required.");
  }

  return normalizedWorkerId;
}

function normalizeOptionalText(value: string): string {
  return value.trim();
}

function normalizeAccountNumber(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function validatePaymentForm(values: PaymentForm): void {
  if (
    !values.accept_cash &&
    !values.enable_gcash &&
    !values.enable_maya &&
    !values.enable_bank
  ) {
    throw new Error("Please enable at least one payment method.");
  }

  if (values.enable_gcash) {
    if (!values.gcash_name.trim()) {
      throw new Error("GCash account name is required.");
    }

    if (!values.gcash_number.trim()) {
      throw new Error("GCash number is required.");
    }
  }

  if (values.enable_maya) {
    if (!values.maya_name.trim()) {
      throw new Error("Maya account name is required.");
    }

    if (!values.maya_number.trim()) {
      throw new Error("Maya number is required.");
    }
  }

  if (values.enable_bank) {
    if (!values.bank_name.trim()) {
      throw new Error("Bank name is required.");
    }

    if (!values.account_name.trim()) {
      throw new Error("Account name is required.");
    }

    if (!normalizeAccountNumber(values.account_number)) {
      throw new Error("Account number is required.");
    }

    if (!values.card_expiration.trim()) {
      throw new Error("Card expiration is required.");
    }
  }
}

export async function getWorkerPaymentInformation(
  workerId: string,
): Promise<WorkerPaymentInformation | null> {
  const normalizedWorkerId = requireWorkerId(workerId);

  const { data, error } = await supabase
    .from("worker_payment_information")
    .select("*")
    .eq("worker_id", normalizedWorkerId)
    .maybeSingle();

  if (error) {
    throw wrapError(
      error,
      "Unable to load worker payment information.",
    );
  }

  return (data as WorkerPaymentInformation | null) ?? null;
}

export async function saveWorkerPaymentInformation(
  workerId: string,
  values: PaymentForm,
): Promise<void> {
  const normalizedWorkerId = requireWorkerId(workerId);

  validatePaymentForm(values);

  const payload: Omit<
    WorkerPaymentInformation,
    "id" | "created_at" | "updated_at"
  > & {
    updated_at: string;
  } = {
    worker_id: normalizedWorkerId,

    accept_cash: values.accept_cash,

    enable_gcash: values.enable_gcash,
    gcash_name: values.enable_gcash
      ? normalizeOptionalText(values.gcash_name)
      : "",
    gcash_number: values.enable_gcash
      ? normalizeOptionalText(values.gcash_number)
      : "",
    gcash_qr: values.enable_gcash ? values.gcash_qr : null,

    enable_maya: values.enable_maya,
    maya_name: values.enable_maya
      ? normalizeOptionalText(values.maya_name)
      : "",
    maya_number: values.enable_maya
      ? normalizeOptionalText(values.maya_number)
      : "",
    maya_qr: values.enable_maya ? values.maya_qr : null,

    enable_bank: values.enable_bank,
    bank_name: values.enable_bank
      ? normalizeOptionalText(values.bank_name)
      : "",
    account_name: values.enable_bank
      ? normalizeOptionalText(values.account_name)
      : "",
    account_number: values.enable_bank
      ? normalizeAccountNumber(values.account_number)
      : "",
    card_expiration: values.enable_bank
      ? normalizeOptionalText(values.card_expiration)
      : "",
    bank_qr: values.enable_bank ? values.bank_qr : null,

    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("worker_payment_information")
    .upsert(payload, {
      onConflict: "worker_id",
    });

  if (error) {
    throw wrapError(
      error,
      "Unable to save worker payment information.",
    );
  }
}