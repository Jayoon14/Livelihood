import { useEffect, useState } from "react";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";

import {
  getWorkerPaymentRequests,
  approvePayment,
  rejectPayment,
} from "../../../services/paymentService";

export default function PaymentRequests() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

async function loadPayments() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("Logged in Worker:", user);

    if (!user) return;

    const data = await getWorkerPaymentRequests(user.id);

    console.log("Worker ID:", user.id);
    console.log("Payments:", data);

    setPayments(data);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}

  async function handleApprove(payment: any) {
    const confirmApprove = confirm(
      "Approve this payment?"
    );

    if (!confirmApprove) return;

    await approvePayment(
      payment.id,
      payment.booking_id
    );

    loadPayments();
  }

  async function handleReject(payment: any) {
    const confirmReject = confirm(
      "Reject this payment?"
    );

    if (!confirmReject) return;

    await rejectPayment(payment.id);

    loadPayments();
  }

  return (
    <WorkerLayout>

      <div className="max-w-6xl mx-auto">

        <div className="bg-white rounded-2xl shadow p-8 mb-6">

          <h1 className="text-3xl font-bold">
            Payment Requests
          </h1>

          <p className="text-gray-500 mt-2">
            Verify online payments submitted by customers.
          </p>

        </div>

        {loading ? (

          <div className="text-center p-10">
            Loading...
          </div>

        ) : payments.length === 0 ? (

          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">

            No payment requests.

          </div>

        ) : (

          <div className="space-y-5">

            {payments.map((payment) => (

              <div
                key={payment.id}
                className="bg-white rounded-2xl shadow p-6"
              >

                <div className="grid md:grid-cols-2 gap-6">

                  <div>

                    <h2 className="font-bold text-xl mb-4">
                      Customer Information
                    </h2>

                    <p>

                      <strong>Name:</strong>{" "}

                      {payment.customer?.first_name}{" "}
                      {payment.customer?.last_name}

                    </p>

                    <p>

                      <strong>Payment Method:</strong>{" "}

                      {payment.payment_method}

                    </p>

                    <p>

                      <strong>Amount:</strong>

                      ₱{payment.amount}

                    </p>

                    <p>

                      <strong>Reference:</strong>{" "}

                      {payment.reference_number || "-"}

                    </p>

                    <p>

                      <strong>Status:</strong>{" "}

                      {payment.payment_status}

                    </p>

                  </div>

                  <div>

                    <h2 className="font-bold text-xl mb-4">
                      Proof of Payment
                    </h2>

                    {payment.proof_of_payment ? (

                      <img
                        src={payment.proof_of_payment}
                        alt="Proof"
                        className="rounded-xl border w-full max-w-sm"
                      />

                    ) : (

                      <div className="text-gray-400">
                        No proof uploaded.
                      </div>

                    )}

                  </div>

                </div>

                <div className="flex gap-4 justify-end mt-8">

                  <button
                    onClick={() => handleReject(payment)}
                    className="px-6 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => handleApprove(payment)}
                    className="px-6 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700"
                  >
                    Approve
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </WorkerLayout>
  );
}