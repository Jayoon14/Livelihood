import { supabase } from "../lib/supabase";

export async function getReceipt(bookingId: number) {
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    throw new Error("Invalid booking ID.");
  }

  const { data: payment, error } = await supabase
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
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) {
    console.error("Receipt query error:", error);
    throw error;
  }

  if (!payment) {
    throw new Error("No payment record found for this booking.");
  }

  // Get only approved transactions and sort them by approval date
  const approvedTransactions =
    payment.payment_transactions
      ?.filter(
        (transaction: any) =>
          transaction.transaction_status?.trim().toLowerCase() === "approved",
      )
      .sort((first: any, second: any) => {
        const firstDate = new Date(
          first.approved_at ?? first.created_at ?? 0,
        ).getTime();

        const secondDate = new Date(
          second.approved_at ?? second.created_at ?? 0,
        ).getTime();

        return firstDate - secondDate;
      }) ?? [];

  if (approvedTransactions.length === 0) {
    throw new Error("No approved payment transactions found.");
  }

  // Compute totals from approved transactions
  const totalAmount = Number(payment.amount ?? 0);

  const computedAmountPaid = approvedTransactions.reduce(
    (total: number, transaction: any) =>
      total + Number(transaction.amount ?? 0),
    0,
  );

  const remainingBalance = Math.max(totalAmount - computedAmountPaid, 0);

  const isFullyPaid = remainingBalance === 0;

  if (!isFullyPaid) {
    throw new Error(
      `Receipt is not available yet. Remaining balance: ₱${remainingBalance.toFixed(
        2,
      )}.`,
    );
  }

  return {
    ...payment,

    total_amount: totalAmount,
    amount_paid: computedAmountPaid,
    balance: remainingBalance,

    payment_status: isFullyPaid ? "Paid" : payment.payment_status,

    payment_method:
      approvedTransactions.length === 1
        ? approvedTransactions[0].payment_method
        : `${approvedTransactions.length} payment methods`,

    reference_number:
      approvedTransactions.length === 1
        ? approvedTransactions[0].reference_number
        : "Multiple references",

    // Contains every approved partial payment
    approved_transactions: approvedTransactions,
  };
}
