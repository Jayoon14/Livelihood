import { useEffect, useState } from "react";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";

import {
  getWorkerPaymentTransactions,
  approvePaymentTransaction,
  rejectPaymentTransaction,
} from "../../../services/paymentService";

type PaymentTransaction = {
  id: number;
  payment_id: number;
  booking_id: number;
  amount: number | string;
  payment_method: string | null;
  reference_number: string | null;
  proof_of_payment: string | null;
  transaction_status: string;

  payment?: {
    id: number;
    customer_id: string;
    worker_id: string;
    booking_id: number;

    customer?: {
      first_name?: string | null;
      last_name?: string | null;
    } | null;

    booking?: {
      id?: number;
      booking_date?: string | null;
      booking_time?: string | null;
      address?: string | null;
    } | null;
  } | null;
};

export default function PaymentRequests() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    void loadPayments();
  }, []);

  async function loadPayments() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setPayments([]);
        return;
      }

      const data = await getWorkerPaymentTransactions(user.id);

      console.log("Worker payment transactions:", data);

      setPayments((data ?? []) as PaymentTransaction[]);
    } catch (error) {
      console.error("Load payment requests error:", error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(payment: PaymentTransaction) {
    const confirmApprove = window.confirm(
      `Approve the ₱${formatCurrency(payment.amount)} payment?`,
    );

    if (!confirmApprove) {
      return;
    }

    try {
      setProcessingId(payment.id);

      await approvePaymentTransaction(payment.id);

      await loadPayments();

      alert("Payment transaction approved successfully.");
    } catch (error) {
      console.error("Approve payment error:", error);

      alert(
        error instanceof Error ? error.message : "Failed to approve payment.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(payment: PaymentTransaction) {
    const confirmReject = window.confirm(
      `Reject the ₱${formatCurrency(payment.amount)} payment?`,
    );

    if (!confirmReject) {
      return;
    }

    const reason = window.prompt("Reason for rejection?")?.trim() ?? "";

    try {
      setProcessingId(payment.id);

      await rejectPaymentTransaction(payment.id, reason);

      await loadPayments();

      alert("Payment transaction rejected.");
    } catch (error) {
      console.error("Reject payment error:", error);

      alert(
        error instanceof Error ? error.message : "Failed to reject payment.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  function formatCurrency(amount: number | string) {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  }

  function getCustomerName(payment: PaymentTransaction) {
    const firstName = payment.payment?.customer?.first_name?.trim() ?? "";

    const lastName = payment.payment?.customer?.last_name?.trim() ?? "";

    return `${firstName} ${lastName}`.trim() || "Customer unavailable";
  }

  return (
    <WorkerLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold">Payment Requests</h1>

          <p className="mt-2 text-gray-500">
            Verify payments submitted by customers.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center text-gray-500 shadow">
            No pending payment requests.
          </div>
        ) : (
          <div className="space-y-5">
            {payments.map((payment) => {
              const isProcessing = processingId === payment.id;

              return (
                <div
                  key={payment.id}
                  className="rounded-2xl bg-white p-6 shadow"
                >
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Customer Information */}

                    <div>
                      <h2 className="mb-4 text-xl font-bold">
                        Customer Information
                      </h2>

                      <div className="space-y-1">
                        <p>
                          <strong>Name:</strong> {getCustomerName(payment)}
                        </p>

                        <p>
                          <strong>Payment Method:</strong>{" "}
                          {payment.payment_method || "-"}
                        </p>

                        <p>
                          <strong>Amount:</strong> ₱
                          {formatCurrency(payment.amount)}
                        </p>

                        <p>
                          <strong>Reference:</strong>{" "}
                          {payment.reference_number || "-"}
                        </p>

                        <p>
                          <strong>Status:</strong> {payment.transaction_status}
                        </p>
                      </div>
                    </div>

                    {/* Proof of Payment */}

                    <div>
                      <h2 className="mb-4 text-xl font-bold">
                        Proof of Payment
                      </h2>

                      {payment.proof_of_payment ? (
                        <a
                          href={payment.proof_of_payment}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={payment.proof_of_payment}
                            alt="Proof of Payment"
                            className="w-full max-w-sm rounded-xl border object-contain"
                          />
                        </a>
                      ) : payment.payment_method === "Cash" ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                          Cash payment has no uploaded proof. Confirm that the
                          payment was received before approving it.
                        </div>
                      ) : (
                        <div className="text-gray-400">No proof uploaded.</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        void handleReject(payment);
                      }}
                      disabled={isProcessing}
                      className="rounded-xl bg-red-500 px-6 py-3 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isProcessing ? "Processing..." : "Reject"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleApprove(payment);
                      }}
                      disabled={isProcessing}
                      className="rounded-xl bg-green-600 px-6 py-3 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isProcessing ? "Processing..." : "Approve"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WorkerLayout>
  );
}
