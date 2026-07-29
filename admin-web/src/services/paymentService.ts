import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

export const PAYMENT_STATUS = {
  PENDING: "Pending",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  REJECTED: "Rejected",
} as const;

export const VERIFICATION_STATUS = {
  VERIFIED: "Verified",
  PENDING: "Pending Verification",
  REJECTED: "Rejected",
} as const;

export const TRANSACTION_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export type VerificationStatus =
  (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

export type TransactionStatus =
  (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

export interface PaymentProfile {
  id?: string;
  first_name: string | null;
  last_name: string | null;
  profile_picture?: string | null;
}

export interface PaymentBooking {
  id?: number;
  booking_date?: string | null;
  booking_time?: string | null;
  address?: string | null;
  services?: {
    service_name?: string | null;
  } | null;
}

export interface PaymentTransaction {
  id: number;
  payment_id: number;
  booking_id: number;
  amount: number | string;
  payment_method: string | null;
  reference_number: string | null;
  proof_of_payment: string | null;
  transaction_status: TransactionStatus;
  rejection_reason?: string | null;
  approved_at?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface PaymentRecord {
  id: number;
  booking_id: number;
  customer_id: string;
  worker_id: string;
  amount: number | string;
  amount_paid: number | string | null;
  balance: number | string | null;
  payment_method: string | null;
  reference_number: string | null;
  proof_of_payment: string | null;
  payment_status: PaymentStatus;
  verification_status: VerificationStatus;
  created_at?: string;
  customer?: PaymentProfile | PaymentProfile[] | null;
  worker?: PaymentProfile | PaymentProfile[] | null;
  booking?: PaymentBooking | PaymentBooking[] | null;
  payment_transactions?: PaymentTransaction[] | null;
  [key: string]: unknown;
}

export interface CustomerPaymentRecord extends PaymentRecord {
  total_amount: number;
  amount_paid: number;
  pending_amount: number;
  submitted_amount: number;
  display_balance: number;
}

export interface PaymentSummary {
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  remainingBalance: number;
  isFullyPaid: boolean;
}

interface AdminProfile {
  id: string;
}

interface PaymentCustomerLookup {
  customer_id: string;
}

interface PaymentSummaryLookup {
  id: number;
  amount: number | string;
}

interface TransactionLookup {
  id: number;
  payment_id: number;
  booking_id: number;
  amount?: number | string;
  transaction_status: TransactionStatus;
}

interface AmountRecord {
  amount: number | string | null;
}

const PAYMENT_DETAILS_SELECT = `
  *,
  customer:profiles!customer_id(
    first_name,
    last_name
  ),
  worker:profiles!worker_id(
    first_name,
    last_name
  )
`;

function validatePositiveInteger(
  value: number,
  fieldName: string,
): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return value;
}

function validateRequiredText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function validateNonNegativeAmount(
  value: number,
  fieldName: string,
): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a valid non-negative amount.`);
  }

  return value;
}

function validatePositiveAmount(
  value: number,
  fieldName: string,
): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }

  return value;
}

function toAmount(value: unknown): number {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function normalizeRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getPendingTransactionAmount(
  transactions: PaymentTransaction[] | null | undefined,
): number {
  return (transactions ?? [])
    .filter(
      (transaction) =>
        transaction.transaction_status === TRANSACTION_STATUS.PENDING,
    )
    .reduce(
      (total, transaction) => total + toAmount(transaction.amount),
      0,
    );
}

async function getAdminIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");

  if (error) {
    console.error("Unable to load administrator accounts:", error);
    return [];
  }

  return ((data ?? []) as AdminProfile[])
    .map((admin) => admin.id)
    .filter(Boolean);
}

async function notifySafely(
  userId: string,
  bookingId: number,
  title: string,
  message: string,
): Promise<void> {
  try {
    await createNotification(userId, bookingId, title, message);
  } catch (error) {
    console.error("Unable to create payment notification:", error);
  }
}

async function notifyAdminsSafely(
  bookingId: number,
  title: string,
  message: string,
): Promise<void> {
  const adminIds = await getAdminIds();

  await Promise.allSettled(
    adminIds.map((adminId) =>
      createNotification(adminId, bookingId, title, message),
    ),
  );
}

async function getPaymentCustomerId(
  paymentId: number,
): Promise<string> {
  const id = validatePositiveInteger(paymentId, "Payment ID");

  const { data, error } = await supabase
    .from("payments")
    .select("customer_id")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  if (!data?.customer_id) {
    throw new Error("Payment customer was not found.");
  }

  return (data as PaymentCustomerLookup).customer_id;
}

// ==============================
// CREATE PAYMENT
// ==============================

export async function createPayment(
  bookingId: number,
  customerId: string,
  workerId: string,
  amount: number,
  paymentMethod: string,
  amountPaid: number,
  referenceNumber: string,
  proofOfPayment: string,
): Promise<PaymentRecord> {
  const validBookingId = validatePositiveInteger(
    bookingId,
    "Booking ID",
  );
  const validCustomerId = validateRequiredText(
    customerId,
    "Customer ID",
  );
  const validWorkerId = validateRequiredText(workerId, "Worker ID");
  const validAmount = validatePositiveAmount(amount, "Amount");
  const validAmountPaid = validateNonNegativeAmount(
    amountPaid,
    "Amount paid",
  );
  const validPaymentMethod = validateRequiredText(
    paymentMethod,
    "Payment method",
  );
  const validReferenceNumber =
    validPaymentMethod === "Cash"
      ? referenceNumber.trim()
      : validateRequiredText(referenceNumber, "Reference number");
  const validProof =
    validPaymentMethod === "Cash"
      ? proofOfPayment.trim()
      : validateRequiredText(proofOfPayment, "Proof of payment");

  if (validAmountPaid > validAmount) {
    throw new Error("Amount paid cannot exceed the total amount.");
  }

  const { data: existingPayment, error: existingError } =
    await supabase
      .from("payments")
      .select("id, payment_status")
      .eq("booking_id", validBookingId)
      .in("payment_status", [
        PAYMENT_STATUS.PENDING,
        PAYMENT_STATUS.PARTIALLY_PAID,
        PAYMENT_STATUS.PAID,
      ])
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingPayment) {
    throw new Error(
      "This booking already has an active payment request.",
    );
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({
      booking_id: validBookingId,
      customer_id: validCustomerId,
      worker_id: validWorkerId,
      amount: validAmount,
      amount_paid: validAmountPaid,
      balance: Math.max(validAmount - validAmountPaid, 0),
      payment_method: validPaymentMethod,
      reference_number: validReferenceNumber,
      proof_of_payment: validProof,
      payment_status: PAYMENT_STATUS.PENDING,
      verification_status:
        validPaymentMethod === "Cash"
          ? VERIFICATION_STATUS.VERIFIED
          : VERIFICATION_STATUS.PENDING,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Payment creation failed.");
  }

  await Promise.all([
    notifySafely(
      validWorkerId,
      validBookingId,
      "New Payment Submitted",
      "A customer has submitted a payment. Please verify the payment proof.",
    ),
    notifyAdminsSafely(
      validBookingId,
      "New Payment Submitted",
      "A customer has submitted a payment for verification.",
    ),
  ]);

  return data as PaymentRecord;
}

// ==============================
// GET WORKER PAYMENTS
// ==============================

export async function getWorkerPayments(
  workerId: string,
): Promise<PaymentRecord[]> {
  const id = validateRequiredText(workerId, "Worker ID");

  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      *,
      customer:profiles!customer_id(
        first_name,
        last_name
      )
      `,
    )
    .eq("worker_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PaymentRecord[];
}

// ==============================
// GET ALL PAYMENTS
// ==============================

export async function getAllPayments(): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(PAYMENT_DETAILS_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PaymentRecord[];
}

// ==============================
// COMPLETE PAYMENT
// ==============================

export async function completePayment(
  paymentId: number,
  bookingId: number,
): Promise<void> {
  const validPaymentId = validatePositiveInteger(
    paymentId,
    "Payment ID",
  );
  const validBookingId = validatePositiveInteger(
    bookingId,
    "Booking ID",
  );

  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      payment_status: PAYMENT_STATUS.PAID,
      verification_status: VERIFICATION_STATUS.VERIFIED,
      balance: 0,
    })
    .eq("id", validPaymentId);

  if (paymentError) {
    throw paymentError;
  }

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({ payment_status: PAYMENT_STATUS.PAID })
    .eq("id", validBookingId);

  if (bookingError) {
    throw bookingError;
  }
}

// ==============================
// GET WORKER TOTAL EARNINGS
// ==============================

export async function getWorkerTotalEarnings(
  workerId: string,
): Promise<number> {
  const id = validateRequiredText(workerId, "Worker ID");

  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("worker_id", id)
    .eq("payment_status", PAYMENT_STATUS.PAID);

  if (error) {
    throw error;
  }

  return ((data ?? []) as AmountRecord[]).reduce(
    (sum, payment) => sum + toAmount(payment.amount),
    0,
  );
}

// ==============================
// GET TOTAL REVENUE
// ==============================

export async function getTotalRevenue(): Promise<number> {
  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("payment_status", PAYMENT_STATUS.PAID);

  if (error) {
    throw error;
  }

  return ((data ?? []) as AmountRecord[]).reduce(
    (sum, payment) => sum + toAmount(payment.amount),
    0,
  );
}

// ==============================
// GET PAYMENT BY BOOKING
// ==============================

export async function getPaymentByBooking(
  bookingId: number,
): Promise<PaymentRecord | null> {
  const id = validatePositiveInteger(bookingId, "Booking ID");

  const { data, error } = await supabase
    .from("payments")
    .select(PAYMENT_DETAILS_SELECT)
    .eq("booking_id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PaymentRecord | null) ?? null;
}

// ==============================
// GET CUSTOMER PAYMENTS
// ==============================

export async function getCustomerPayments(
  customerId: string,
): Promise<CustomerPaymentRecord[]> {
  const id = validateRequiredText(customerId, "Customer ID");

  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      *,
      worker:profiles!worker_id(
        first_name,
        last_name,
        profile_picture
      ),
      booking:bookings!booking_id(
        id,
        booking_date,
        booking_time,
        address,
        services(
          service_name
        )
      ),
      payment_transactions(
        id,
        payment_id,
        booking_id,
        amount,
        payment_method,
        reference_number,
        proof_of_payment,
        transaction_status,
        rejection_reason,
        approved_at,
        created_at
      )
      `,
    )
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as PaymentRecord[]).map((payment) => {
    const approvedAmount = toAmount(payment.amount_paid);
    const pendingAmount = getPendingTransactionAmount(
      payment.payment_transactions,
    );
    const submittedAmount = approvedAmount + pendingAmount;
    const totalAmount = toAmount(payment.amount);

    return {
      ...payment,
      worker: normalizeRelation(payment.worker),
      booking: normalizeRelation(payment.booking),
      total_amount: totalAmount,
      amount_paid: approvedAmount,
      pending_amount: pendingAmount,
      submitted_amount: submittedAmount,
      display_balance: Math.max(totalAmount - submittedAmount, 0),
    };
  });
}

// ==============================
// GET WORKER PAYMENT REQUESTS
// ==============================

export async function getWorkerPaymentRequests(
  workerId: string,
): Promise<PaymentRecord[]> {
  const id = validateRequiredText(workerId, "Worker ID");

  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      *,
      customer:profiles!payments_customer_id_fkey(
        first_name,
        last_name
      ),
      booking:bookings!payments_booking_id_fkey(
        booking_date,
        booking_time,
        address
      )
      `,
    )
    .eq("worker_id", id)
    .eq("payment_status", PAYMENT_STATUS.PENDING)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PaymentRecord[];
}

// ==============================
// APPROVE PAYMENT
// ==============================

export async function approvePayment(
  paymentId: number,
  bookingId: number,
): Promise<void> {
  const validPaymentId = validatePositiveInteger(
    paymentId,
    "Payment ID",
  );
  const validBookingId = validatePositiveInteger(
    bookingId,
    "Booking ID",
  );
  const customerId = await getPaymentCustomerId(validPaymentId);

  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      payment_status: PAYMENT_STATUS.PAID,
      verification_status: VERIFICATION_STATUS.VERIFIED,
      balance: 0,
    })
    .eq("id", validPaymentId);

  if (paymentError) {
    throw paymentError;
  }

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({
      payment_status: PAYMENT_STATUS.PAID,
      status: "Completed",
    })
    .eq("id", validBookingId);

  if (bookingError) {
    throw bookingError;
  }

  await Promise.all([
    notifySafely(
      customerId,
      validBookingId,
      "Payment Approved",
      "Your payment has been verified and approved.",
    ),
    notifyAdminsSafely(
      validBookingId,
      "Payment Approved",
      "A worker approved a customer's payment.",
    ),
  ]);
}

// ==============================
// REJECT PAYMENT
// ==============================

export async function rejectPayment(
  paymentId: number,
  bookingId: number,
): Promise<void> {
  const validPaymentId = validatePositiveInteger(
    paymentId,
    "Payment ID",
  );
  const validBookingId = validatePositiveInteger(
    bookingId,
    "Booking ID",
  );
  const customerId = await getPaymentCustomerId(validPaymentId);

  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      payment_status: PAYMENT_STATUS.REJECTED,
      verification_status: VERIFICATION_STATUS.REJECTED,
    })
    .eq("id", validPaymentId);

  if (paymentError) {
    throw paymentError;
  }

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({ payment_status: PAYMENT_STATUS.REJECTED })
    .eq("id", validBookingId);

  if (bookingError) {
    throw bookingError;
  }

  await Promise.all([
    notifySafely(
      customerId,
      validBookingId,
      "Payment Rejected",
      "Your payment was rejected. Please upload a new proof of payment.",
    ),
    notifyAdminsSafely(
      validBookingId,
      "Payment Rejected",
      "A worker rejected a customer's payment.",
    ),
  ]);
}

// ==============================
// UPLOAD PAYMENT PROOF
// ==============================

export async function uploadPaymentProof(
  file: File,
  customerId: string,
): Promise<string> {
  const id = validateRequiredText(customerId, "Customer ID");

  if (!(file instanceof File)) {
    throw new Error("A valid payment proof file is required.");
  }

  if (file.size <= 0) {
    throw new Error("The selected payment proof file is empty.");
  }

  const maxFileSize = 10 * 1024 * 1024;

  if (file.size > maxFileSize) {
    throw new Error("Payment proof must not exceed 10 MB.");
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (file.type && !allowedTypes.includes(file.type)) {
    throw new Error(
      "Payment proof must be a JPG, PNG, WEBP, or PDF file.",
    );
  }

  const rawExtension = file.name.split(".").pop()?.toLowerCase();
  const extension = rawExtension || "bin";
  const safeCustomerId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const fileName = `${safeCustomerId}_${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("payment-proofs")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("payment-proofs")
    .getPublicUrl(fileName);

  if (!data.publicUrl) {
    throw new Error("Unable to generate payment proof URL.");
  }

  return data.publicUrl;
}

// ======================================
// CREATE PAYMENT TRANSACTION
// ======================================

export async function createPaymentTransaction(
  paymentId: number,
  bookingId: number,
  amount: number,
  paymentMethod: string,
  referenceNumber: string,
  proofOfPayment: string,
): Promise<PaymentTransaction> {
  const validPaymentId = validatePositiveInteger(
    paymentId,
    "Payment ID",
  );

  const validBookingId = validatePositiveInteger(
    bookingId,
    "Booking ID",
  );

  const validAmount = validatePositiveAmount(amount, "Amount");

  const validMethod = validateRequiredText(
    paymentMethod,
    "Payment method",
  );

  const validReference =
    validMethod === "Cash"
      ? referenceNumber.trim()
      : validateRequiredText(referenceNumber, "Reference number");

  const validProof =
    validMethod === "Cash"
      ? proofOfPayment.trim()
      : validateRequiredText(proofOfPayment, "Proof of payment");

  const summary = await getPaymentTransactionSummary(validPaymentId);

  if (validAmount > summary.remainingBalance) {
    throw new Error(
      "Transaction amount cannot exceed the remaining balance.",
    );
  }

  const { data, error } = await supabase
    .from("payment_transactions")
    .insert({
      payment_id: validPaymentId,
      booking_id: validBookingId,
      amount: validAmount,
      payment_method: validMethod,
      reference_number: validReference,
      proof_of_payment: validProof,
      transaction_status: TRANSACTION_STATUS.PENDING,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Payment transaction creation failed.");
  }

  return data as PaymentTransaction;
}

// ======================================
// GET PAYMENT TRANSACTIONS
// ======================================

export async function getPaymentTransactions(
  paymentId: number,
): Promise<PaymentTransaction[]> {
  const id = validatePositiveInteger(paymentId, "Payment ID");

  const { data, error } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("payment_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as PaymentTransaction[];
}

// ======================================
// GET PAYMENT SUMMARY
// ======================================

export async function getPaymentTransactionSummary(
  paymentId: number,
): Promise<PaymentSummary> {
  const id = validatePositiveInteger(paymentId, "Payment ID");

  const [paymentResult, transactionResult] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount")
      .eq("id", id)
      .single(),
    supabase
      .from("payment_transactions")
      .select("amount, transaction_status")
      .eq("payment_id", id),
  ]);

  if (paymentResult.error) {
    throw paymentResult.error;
  }

  if (transactionResult.error) {
    throw transactionResult.error;
  }

  const payment = paymentResult.data as PaymentSummaryLookup;
  const transactions =
    (transactionResult.data ?? []) as Pick<
      PaymentTransaction,
      "amount" | "transaction_status"
    >[];

  const totalAmount = toAmount(payment.amount);

  const approvedAmount = transactions
    .filter(
      (transaction) =>
        transaction.transaction_status ===
        TRANSACTION_STATUS.APPROVED,
    )
    .reduce(
      (total, transaction) => total + toAmount(transaction.amount),
      0,
    );

  const pendingAmount = transactions
    .filter(
      (transaction) =>
        transaction.transaction_status ===
        TRANSACTION_STATUS.PENDING,
    )
    .reduce(
      (total, transaction) => total + toAmount(transaction.amount),
      0,
    );

  const remainingBalance = Math.max(
    totalAmount - approvedAmount,
    0,
  );

  return {
    totalAmount,
    approvedAmount,
    pendingAmount,
    remainingBalance,
    isFullyPaid: remainingBalance === 0,
  };
}

// ======================================
// UPDATE PAYMENT SUMMARY
// ======================================

export async function updatePaymentSummary(
  paymentId: number,
): Promise<PaymentSummary> {
  const id = validatePositiveInteger(paymentId, "Payment ID");
  const summary = await getPaymentTransactionSummary(id);

  let paymentStatus: PaymentStatus = PAYMENT_STATUS.PARTIALLY_PAID;

  if (summary.approvedAmount === 0) {
    paymentStatus = PAYMENT_STATUS.PENDING;
  }

  if (summary.isFullyPaid) {
    paymentStatus = PAYMENT_STATUS.PAID;
  }

  const { error } = await supabase
    .from("payments")
    .update({
      amount_paid: summary.approvedAmount,
      balance: summary.remainingBalance,
      payment_status: paymentStatus,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  return summary;
}

// ======================================
// APPROVE PAYMENT TRANSACTION
// ======================================

export async function approvePaymentTransaction(
  transactionId: number,
): Promise<{
  transactionId: number;
  paymentId: number;
  bookingId: number;
  approvedAmount: number;
  summary: PaymentSummary;
}> {
  const id = validatePositiveInteger(
    transactionId,
    "Transaction ID",
  );

  const { data, error } = await supabase
    .from("payment_transactions")
    .select(
      `
      id,
      payment_id,
      booking_id,
      amount,
      transaction_status
      `,
    )
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Payment transaction not found.");
  }

  const transaction = data as TransactionLookup;

  if (
    transaction.transaction_status === TRANSACTION_STATUS.APPROVED
  ) {
    throw new Error("This payment transaction is already approved.");
  }

  if (
    transaction.transaction_status === TRANSACTION_STATUS.REJECTED
  ) {
    throw new Error("A rejected transaction cannot be approved.");
  }

  const { error: updateError } = await supabase
    .from("payment_transactions")
    .update({
      transaction_status: TRANSACTION_STATUS.APPROVED,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", id);

  if (updateError) {
    throw updateError;
  }

  const summary = await updatePaymentSummary(transaction.payment_id);

  if (summary.isFullyPaid) {
    const { error: bookingError } = await supabase
      .from("bookings")
      .update({
        payment_status: PAYMENT_STATUS.PAID,
        status: "Completed",
      })
      .eq("id", transaction.booking_id);

    if (bookingError) {
      throw bookingError;
    }
  }

  const customerId = await getPaymentCustomerId(
    transaction.payment_id,
  );

  await notifySafely(
    customerId,
    transaction.booking_id,
    "Payment Approved",
    "Your payment transaction has been approved.",
  );

  return {
    transactionId: transaction.id,
    paymentId: transaction.payment_id,
    bookingId: transaction.booking_id,
    approvedAmount: toAmount(transaction.amount),
    summary,
  };
}

// ======================================
// REJECT PAYMENT TRANSACTION
// ======================================

export async function rejectPaymentTransaction(
  transactionId: number,
  reason = "",
): Promise<{
  paymentId: number;
  bookingId: number;
  summary: PaymentSummary;
}> {
  const id = validatePositiveInteger(
    transactionId,
    "Transaction ID",
  );
  const normalizedReason = reason.trim();

  const { data, error } = await supabase
    .from("payment_transactions")
    .select(
      `
      id,
      payment_id,
      booking_id,
      transaction_status
      `,
    )
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Payment transaction not found.");
  }

  const transaction = data as TransactionLookup;

  if (
    transaction.transaction_status === TRANSACTION_STATUS.REJECTED
  ) {
    throw new Error("This transaction is already rejected.");
  }

  if (
    transaction.transaction_status === TRANSACTION_STATUS.APPROVED
  ) {
    throw new Error("An approved transaction cannot be rejected.");
  }

  const { error: rejectError } = await supabase
    .from("payment_transactions")
    .update({
      transaction_status: TRANSACTION_STATUS.REJECTED,
      rejection_reason: normalizedReason,
      approved_at: null,
    })
    .eq("id", id);

  if (rejectError) {
    throw rejectError;
  }

  const summary = await updatePaymentSummary(transaction.payment_id);
  const customerId = await getPaymentCustomerId(
    transaction.payment_id,
  );

  await notifySafely(
    customerId,
    transaction.booking_id,
    "Payment Rejected",
    normalizedReason ||
      "Your payment transaction has been rejected.",
  );

  return {
    paymentId: transaction.payment_id,
    bookingId: transaction.booking_id,
    summary,
  };
}

// ======================================
// GET WORKER PAYMENT TRANSACTIONS
// ======================================

export async function getWorkerPaymentTransactions(
  workerId: string,
): Promise<PaymentTransaction[]> {
  const id = validateRequiredText(workerId, "Worker ID");

  const { data, error } = await supabase
    .from("payment_transactions")
    .select(
      `
      *,
      payment:payments!payment_id(
        id,
        customer_id,
        worker_id,
        booking_id,
        customer:profiles!payments_customer_id_fkey(
          first_name,
          last_name
        ),
        booking:bookings!payments_booking_id_fkey(
          id,
          booking_date,
          booking_time,
          address
        )
      )
      `,
    )
    .eq("payment.worker_id", id)
    .eq("transaction_status", TRANSACTION_STATUS.PENDING)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PaymentTransaction[];
}

// ======================================
// CREATE PAYMENT SUMMARY
// ======================================

export async function createPaymentSummary(
  bookingId: number,
  customerId: string,
  workerId: string,
  totalAmount: number,
): Promise<PaymentRecord> {
  const validBookingId = validatePositiveInteger(
    bookingId,
    "Booking ID",
  );
  const validCustomerId = validateRequiredText(
    customerId,
    "Customer ID",
  );
  const validWorkerId = validateRequiredText(workerId, "Worker ID");
  const validTotalAmount = validatePositiveAmount(
    totalAmount,
    "Total amount",
  );

  const { data: existingPayment, error: existingError } =
    await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", validBookingId)
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingPayment) {
    return existingPayment as PaymentRecord;
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({
      booking_id: validBookingId,
      customer_id: validCustomerId,
      worker_id: validWorkerId,
      amount: validTotalAmount,
      amount_paid: 0,
      balance: validTotalAmount,
      payment_method: null,
      reference_number: "",
      proof_of_payment: "",
      payment_status: PAYMENT_STATUS.PENDING,
      verification_status: VERIFICATION_STATUS.PENDING,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Payment summary creation failed.");
  }

  return data as PaymentRecord;
}