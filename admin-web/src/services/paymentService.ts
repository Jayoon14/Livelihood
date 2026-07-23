import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

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
) {
  // ==============================
  // CHECK EXISTING PAYMENT
  // ==============================

  const { data: existingPayment, error: existingError } = await supabase
    .from("payments")
    .select("id, payment_status")
    .eq("booking_id", bookingId)
    .in("payment_status", ["Pending", "Paid"])
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingPayment) {
    throw new Error("This booking already has a payment request.");
  }

  // ==============================
  // INSERT PAYMENT
  // ==============================

  const { data, error } = await supabase
    .from("payments")
    .insert({
      booking_id: bookingId,

      customer_id: customerId,

      worker_id: workerId,

      amount,

      amount_paid: amountPaid,

      balance: amount - amountPaid,

      payment_method: paymentMethod,

      reference_number: referenceNumber,

      proof_of_payment: proofOfPayment,

      payment_status: "Pending",

      verification_status:
        paymentMethod === "Cash" ? "Verified" : "Pending Verification",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // ==============================
  // NOTIFY WORKER
  // ==============================

  await createNotification(
    workerId,
    bookingId,
    "New Payment Submitted",
    "A customer has submitted a payment. Please verify the payment proof.",
  );

  // ==============================
  // NOTIFY ADMINS
  // ==============================

  const { data: admins, error: adminError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");

  if (adminError) {
    console.error(adminError);
  }

  if (admins) {
    for (const admin of admins) {
      await createNotification(
        admin.id,
        bookingId,
        "New Payment Submitted",
        "A customer has submitted a payment for verification.",
      );
    }
  }

  return data;
}

// ==============================
// GET WORKER PAYMENTS
// ==============================

export async function getWorkerPayments(workerId: string) {
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
    .eq("worker_id", workerId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

// ==============================
// GET ALL PAYMENTS
// ==============================

export async function getAllPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      *,
      customer:profiles!customer_id(
        first_name,
        last_name
      ),
      worker:profiles!worker_id(
        first_name,
        last_name
      )
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

// ==============================
// COMPLETE PAYMENT
// ==============================

export async function completePayment(paymentId: number, bookingId: number) {
  const { error } = await supabase
    .from("payments")
    .update({
      payment_status: "Paid",
    })
    .eq("id", paymentId);

  if (error) {
    throw error;
  }

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({
      payment_status: "Paid",
    })
    .eq("id", bookingId);

  if (bookingError) {
    throw bookingError;
  }
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

  if (error) {
    throw error;
  }

  return data?.reduce((sum, payment) => sum + Number(payment.amount), 0) ?? 0;
}

// ==============================
// GET TOTAL REVENUE
// ==============================

export async function getTotalRevenue() {
  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("payment_status", "Paid");

  if (error) {
    throw error;
  }

  return data?.reduce((sum, payment) => sum + Number(payment.amount), 0) ?? 0;
}
// ==============================
// GET PAYMENT BY BOOKING
// ==============================

export async function getPaymentByBooking(bookingId: number) {
  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      *,
      customer:profiles!customer_id(
        first_name,
        last_name
      ),
      worker:profiles!worker_id(
        first_name,
        last_name
      )
      `,
    )
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

// ==============================
// GET CUSTOMER PAYMENTS
// ==============================

export async function getCustomerPayments(customerId: string) {
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
        amount,
        transaction_status
      )
    `,
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (
    data?.map((payment) => {
      const approvedAmount = Number(payment.amount_paid ?? 0);

      const pendingAmount =
        payment.payment_transactions
          ?.filter(
            (transaction: any) => transaction.transaction_status === "Pending",
          )
          .reduce(
            (total: number, transaction: any) =>
              total + Number(transaction.amount ?? 0),
            0,
          ) ?? 0;

      const submittedAmount = approvedAmount + pendingAmount;

      return {
        ...payment,

        total_amount: Number(payment.amount ?? 0),

        amount_paid: approvedAmount,

        pending_amount: pendingAmount,

        submitted_amount: submittedAmount,

        display_balance: Math.max(
          Number(payment.amount ?? 0) - submittedAmount,
          0,
        ),
        booking: payment.booking,
        worker: payment.worker,
      };
    }) ?? []
  );
}

// ==============================
// GET WORKER PAYMENT REQUESTS
// ==============================

export async function getWorkerPaymentRequests(workerId: string) {
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
    .eq("worker_id", workerId)
    .eq("payment_status", "Pending")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

// ==============================
// APPROVE PAYMENT
// ==============================

export async function approvePayment(paymentId: number, bookingId: number) {
  // Get customer
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("customer_id")
    .eq("id", paymentId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  // Update payment

  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      payment_status: "Paid",

      verification_status: "Verified",
    })
    .eq("id", paymentId);

  if (paymentError) {
    throw paymentError;
  }

  // Update booking

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({
      payment_status: "Paid",

      status: "Completed",
    })
    .eq("id", bookingId);

  if (bookingError) {
    throw bookingError;
  }

  // Notify Customer

  await createNotification(
    payment.customer_id,
    bookingId,
    "Payment Approved",
    "Your payment has been verified and approved.",
  );

  // ==============================
  // NOTIFY ADMINS
  // ==============================

  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");

  if (admins) {
    for (const admin of admins) {
      await createNotification(
        admin.id,
        bookingId,
        "Payment Approved",
        "A worker approved a customer's payment.",
      );
    }
  }
}

// ==============================
// REJECT PAYMENT
// ==============================

export async function rejectPayment(paymentId: number, bookingId: number) {
  // Get customer

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("customer_id")
    .eq("id", paymentId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  // Update payment

  const { error } = await supabase
    .from("payments")
    .update({
      payment_status: "Rejected",

      verification_status: "Rejected",
    })
    .eq("id", paymentId);

  if (error) {
    throw error;
  }

  // Update booking

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({
      payment_status: "Rejected",
    })
    .eq("id", bookingId);

  if (bookingError) {
    throw bookingError;
  }

  // Notify Customer

  await createNotification(
    payment.customer_id,
    bookingId,
    "Payment Rejected",
    "Your payment was rejected. Please upload a new proof of payment.",
  );

  // ==============================
  // NOTIFY ADMINS
  // ==============================

  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");

  if (admins) {
    for (const admin of admins) {
      await createNotification(
        admin.id,
        bookingId,
        "Payment Rejected",
        "A worker rejected a customer's payment.",
      );
    }
  }
}

// ==============================
// UPLOAD PAYMENT PROOF
// ==============================

export async function uploadPaymentProof(file: File, customerId: string) {
  const extension = file.name.split(".").pop();

  const fileName = `${customerId}_${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("payment-proofs")
    .upload(fileName, file);

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("payment-proofs")
    .getPublicUrl(fileName);

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
) {
  const { data, error } = await supabase
    .from("payment_transactions")
    .insert({
      payment_id: paymentId,
      booking_id: bookingId,
      amount,
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      proof_of_payment: proofOfPayment,
      transaction_status: "Pending",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}
// ======================================
// GET PAYMENT TRANSACTIONS
// ======================================

export async function getPaymentTransactions(paymentId: number) {
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("payment_id", paymentId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}
// ======================================
// GET PAYMENT SUMMARY
// ======================================

export async function getPaymentTransactionSummary(paymentId: number) {
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, amount")
    .eq("id", paymentId)
    .single();

  if (paymentError) {
    throw paymentError;
  }

  const { data: transactions, error: transactionError } = await supabase
    .from("payment_transactions")
    .select("amount, transaction_status")
    .eq("payment_id", paymentId);

  if (transactionError) {
    throw transactionError;
  }

  const totalAmount = Number(payment.amount);

  const approvedAmount =
    transactions
      ?.filter((transaction) => transaction.transaction_status === "Approved")
      .reduce((total, transaction) => total + Number(transaction.amount), 0) ??
    0;

  const pendingAmount =
    transactions
      ?.filter((transaction) => transaction.transaction_status === "Pending")
      .reduce((total, transaction) => total + Number(transaction.amount), 0) ??
    0;

  const remainingBalance = Math.max(totalAmount - approvedAmount, 0);

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

export async function updatePaymentSummary(paymentId: number) {
  const summary = await getPaymentTransactionSummary(paymentId);

  let paymentStatus = "Partially Paid";

  if (summary.approvedAmount === 0) {
    paymentStatus = "Pending";
  }

  if (summary.remainingBalance === 0) {
    paymentStatus = "Paid";
  }

  const { error } = await supabase
    .from("payments")
    .update({
      amount_paid: summary.approvedAmount,
      balance: summary.remainingBalance,
      payment_status: paymentStatus,
    })
    .eq("id", paymentId);

  if (error) {
    throw error;
  }

  return summary;
}
// ======================================
// APPROVE PAYMENT TRANSACTION
// ======================================

export async function approvePaymentTransaction(transactionId: number) {
  // Kunin muna ang transaction
  const { data: transaction, error: fetchError } = await supabase
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
    .eq("id", transactionId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  if (!transaction) {
    throw new Error("Payment transaction not found.");
  }

  if (transaction.transaction_status === "Approved") {
    throw new Error("This payment transaction is already approved.");
  }

  if (transaction.transaction_status === "Rejected") {
    throw new Error("A rejected transaction cannot be approved.");
  }

  // I-approve ang isang transaction
  const { error: updateError } = await supabase
    .from("payment_transactions")
    .update({
      transaction_status: "Approved",
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", transactionId);

  if (updateError) {
    throw updateError;
  }

  // I-compute ulit ang payment summary
  const summary = await updatePaymentSummary(Number(transaction.payment_id));

  // Kapag fully paid na ang booking
  if (summary.remainingBalance === 0) {
    const { error: bookingError } = await supabase
      .from("bookings")
      .update({
        payment_status: "Paid",
        status: "Completed",
      })
      .eq("id", transaction.booking_id);

    if (bookingError) {
      throw bookingError;
    }
  }

  // ==============================
  // NOTIFY CUSTOMER
  // ==============================
  const { data: payment } = await supabase
    .from("payments")
    .select("customer_id")
    .eq("id", transaction.payment_id)
    .single();

  if (payment) {
    await createNotification(
      payment.customer_id,
      transaction.booking_id,
      "Payment Approved",
      "Your payment transaction has been approved.",
    );
  }

  return {
    transactionId: Number(transaction.id),
    paymentId: Number(transaction.payment_id),
    bookingId: Number(transaction.booking_id),
    approvedAmount: Number(transaction.amount),
    summary,
  };
}

// ======================================
// REJECT PAYMENT TRANSACTION
// ======================================

export async function rejectPaymentTransaction(
  transactionId: number,
  reason: string = "",
) {
  // Kunin ang transaction
  const { data: transaction, error: fetchError } = await supabase
    .from("payment_transactions")
    .select(
      `
      id,
      payment_id,
      booking_id,
      transaction_status
    `,
    )
    .eq("id", transactionId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  if (!transaction) {
    throw new Error("Payment transaction not found.");
  }

  if (transaction.transaction_status === "Rejected") {
    throw new Error("This transaction is already rejected.");
  }

  // Reject ang transaction
  const { error: rejectError } = await supabase
    .from("payment_transactions")
    .update({
      transaction_status: "Rejected",
      rejection_reason: reason,
      approved_at: null,
    })
    .eq("id", transactionId);

  if (rejectError) {
    throw rejectError;
  }

  // Update payment summary
  const summary = await updatePaymentSummary(Number(transaction.payment_id));

  // ==============================
  // NOTIFY CUSTOMER
  // ==============================
  const { data: payment } = await supabase
    .from("payments")
    .select("customer_id")
    .eq("id", transaction.payment_id)
    .single();

  if (payment) {
    await createNotification(
      payment.customer_id,
      transaction.booking_id,
      "Payment Rejected",
      reason || "Your payment transaction has been rejected.",
    );
  }

  return {
    paymentId: Number(transaction.payment_id),
    bookingId: Number(transaction.booking_id),
    summary,
  };
}
// ======================================
// GET WORKER PAYMENT TRANSACTIONS
// ======================================

export async function getWorkerPaymentTransactions(workerId: string) {
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
    .eq("payment.worker_id", workerId)
    .eq("transaction_status", "Pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}
// ======================================
// CREATE PAYMENT SUMMARY
// ======================================

export async function createPaymentSummary(
  bookingId: number,
  customerId: string,
  workerId: string,
  totalAmount: number,
) {
  // Iwasan ang duplicate summary record
  const { data: existingPayment, error: existingError } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingPayment) {
    return existingPayment;
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({
      booking_id: bookingId,
      customer_id: customerId,
      worker_id: workerId,

      // Ang existing payments schema mo ay gumagamit ng "amount"
      amount: totalAmount,
      amount_paid: 0,
      balance: totalAmount,

      // Summary record lamang ito
      payment_method: null,
      reference_number: "",
      proof_of_payment: "",

      payment_status: "Pending",
      verification_status: "Pending Verification",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
