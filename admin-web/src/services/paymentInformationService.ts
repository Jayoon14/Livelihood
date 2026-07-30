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

  /**
   * Legacy field retained for schema compatibility.
   * Do not store card expiration details.
   */
  card_expiration: string;

  bank_qr: string | null;

  created_at?: string;
  updated_at?: string;
}

const PAYMENT_INFORMATION_COLUMNS = `
  id,
  worker_id,
  accept_cash,
  enable_gcash,
  gcash_name,
  gcash_number,
  gcash_qr,
  enable_maya,
  maya_name,
  maya_number,
  maya_qr,
  enable_bank,
  bank_name,
  account_name,
  account_number,
  card_expiration,
  bank_qr,
  created_at,
  updated_at
`;

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error && error.message.trim()) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();

    if (message) {
      return new Error(message);
    }
  }

  return new Error(fallback);
}

function requireUserId(userId: string): string {
  const value = userId.trim();

  if (!value) {
    throw new Error("Worker ID is required.");
  }

  return value;
}

async function getCurrentWorkerId(expectedWorkerId?: string): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw toError(error, "Unable to verify your session.");
  }

  if (!user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  if (
    expectedWorkerId &&
    requireUserId(expectedWorkerId) !== user.id
  ) {
    throw new Error(
      "You cannot access another worker's payment information.",
    );
  }

  return user.id;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function validateMobileNumber(
  value: string,
  provider: "GCash" | "Maya",
): string {
  const number = normalizeDigits(value);

  if (!/^09\d{9}$/.test(number)) {
    throw new Error(
      `${provider} number must be an 11-digit Philippine mobile number beginning with 09.`,
    );
  }

  return number;
}

function validateAccountNumber(value: string): string {
  const accountNumber = value.replace(/\s+/g, "").trim();

  if (!/^[A-Za-z0-9-]{6,34}$/.test(accountNumber)) {
    throw new Error(
      "Bank account number must contain 6 to 34 letters, numbers, or hyphens.",
    );
  }

  return accountNumber;
}

function validateUrl(value: string, fieldName: string): string | null {
  const text = value.trim();

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error();
    }

    return url.toString();
  } catch {
    throw new Error(`${fieldName} contains an invalid URL.`);
  }
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
    if (!normalizeText(values.gcash_name)) {
      throw new Error("GCash account name is required.");
    }

    validateMobileNumber(values.gcash_number, "GCash");
    validateUrl(values.gcash_qr, "GCash QR code");
  }

  if (values.enable_maya) {
    if (!normalizeText(values.maya_name)) {
      throw new Error("Maya account name is required.");
    }

    validateMobileNumber(values.maya_number, "Maya");
    validateUrl(values.maya_qr, "Maya QR code");
  }

  if (values.enable_bank) {
    if (!normalizeText(values.bank_name)) {
      throw new Error("Bank name is required.");
    }

    if (!normalizeText(values.account_name)) {
      throw new Error("Bank account name is required.");
    }

    validateAccountNumber(values.account_number);
    validateUrl(values.bank_qr, "Bank QR code");
  }
}

export async function getMyPaymentInformation(): Promise<WorkerPaymentInformation | null> {
  const workerId = await getCurrentWorkerId();

  const { data, error } = await supabase
    .from("worker_payment_information")
    .select(PAYMENT_INFORMATION_COLUMNS)
    .eq("worker_id", workerId)
    .maybeSingle();

  if (error) {
    throw toError(error, "Unable to load payment information.");
  }

  return (data as WorkerPaymentInformation | null) ?? null;
}

export async function getWorkerPaymentInformation(
  workerId: string,
): Promise<WorkerPaymentInformation | null> {
  await getCurrentWorkerId(workerId);
  return getMyPaymentInformation();
}

export async function saveMyPaymentInformation(
  values: PaymentForm,
): Promise<WorkerPaymentInformation> {
  const workerId = await getCurrentWorkerId();

  validatePaymentForm(values);

  const payload = {
    worker_id: workerId,
    accept_cash: Boolean(values.accept_cash),

    enable_gcash: Boolean(values.enable_gcash),
    gcash_name: values.enable_gcash
      ? normalizeText(values.gcash_name)
      : "",
    gcash_number: values.enable_gcash
      ? validateMobileNumber(values.gcash_number, "GCash")
      : "",
    gcash_qr: values.enable_gcash
      ? validateUrl(values.gcash_qr, "GCash QR code")
      : null,

    enable_maya: Boolean(values.enable_maya),
    maya_name: values.enable_maya
      ? normalizeText(values.maya_name)
      : "",
    maya_number: values.enable_maya
      ? validateMobileNumber(values.maya_number, "Maya")
      : "",
    maya_qr: values.enable_maya
      ? validateUrl(values.maya_qr, "Maya QR code")
      : null,

    enable_bank: Boolean(values.enable_bank),
    bank_name: values.enable_bank
      ? normalizeText(values.bank_name)
      : "",
    account_name: values.enable_bank
      ? normalizeText(values.account_name)
      : "",
    account_number: values.enable_bank
      ? validateAccountNumber(values.account_number)
      : "",

    // Legacy column intentionally kept empty.
    card_expiration: "",

    bank_qr: values.enable_bank
      ? validateUrl(values.bank_qr, "Bank QR code")
      : null,

    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("worker_payment_information")
    .upsert(payload, {
      onConflict: "worker_id",
    })
    .select(PAYMENT_INFORMATION_COLUMNS)
    .single();

  if (error) {
    throw toError(error, "Unable to save payment information.");
  }

  return data as WorkerPaymentInformation;
}

export async function saveWorkerPaymentInformation(
  workerId: string,
  values: PaymentForm,
): Promise<void> {
  await getCurrentWorkerId(workerId);
  await saveMyPaymentInformation(values);
}
