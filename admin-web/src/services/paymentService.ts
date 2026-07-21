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
        booking_date,
        booking_time,
        address,
        services(
          service_name
        )
      )
      `,
    )
    .eq("customer_id", customerId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
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
