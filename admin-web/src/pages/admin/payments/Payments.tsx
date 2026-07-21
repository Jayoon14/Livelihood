import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import {
  getAllPayments,
  completePayment,
} from "../../../services/paymentService";

export default function Payments() {
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    const data = await getAllPayments();
    setPayments(data);
  }

  async function handlePaid(payment: any) {
    if (!window.confirm("Mark this payment as Paid?")) {
      return;
    }

    await completePayment(payment.id, payment.booking_id);

    alert("Payment updated.");

    loadPayments();
  }

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-8">Payments</h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Customer</th>

              <th className="p-4 text-left">Worker</th>

              <th className="p-4 text-left">Amount</th>

              <th className="p-4 text-left">Method</th>

              <th className="p-4 text-left">Status</th>

              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-t">
                <td className="p-4">
                  {payment.customer?.first_name} {payment.customer?.last_name}
                </td>

                <td className="p-4">
                  {payment.worker?.first_name} {payment.worker?.last_name}
                </td>

                <td className="p-4">₱{payment.amount}</td>

                <td className="p-4">{payment.payment_method}</td>

                <td className="p-4">{payment.payment_status}</td>

                <td className="p-4">
                  {payment.payment_status === "Pending" && (
                    <button
                      onClick={() => handlePaid(payment.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded"
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
