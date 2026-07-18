import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";

import {
  getCustomerPayments,
} from "../../../services/paymentService";

export default function PaymentHistory() {

  const navigate = useNavigate();

  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {

    const {
      data:{user},
    } = await supabase.auth.getUser();

    if(!user) return;

    const data = await getCustomerPayments(user.id);

    setPayments(data);

  }

  return (

    <CustomerLayout>

      <div className="space-y-6">

        <h1 className="text-3xl font-bold">
          Payment History
        </h1>

        <div className="bg-white rounded-2xl shadow overflow-hidden">

          <table className="w-full">

            <thead className="bg-slate-100">

              <tr>

                <th className="p-4 text-left">
                  Worker
                </th>

                <th className="p-4 text-left">
                  Service
                </th>

                <th className="p-4 text-left">
                  Amount
                </th>

                <th className="p-4 text-left">
                  Method
                </th>

                <th className="p-4 text-left">
                  Status
                </th>

                <th className="p-4 text-left">
                  Receipt
                </th>

              </tr>

            </thead>

            <tbody>

              {payments.map((payment)=>(

                <tr
                  key={payment.id}
                  className="border-t"
                >

                  <td className="p-4">
                    {payment.worker.first_name} {payment.worker.last_name}
                  </td>

                  <td className="p-4">
                  {payment.booking?.service_name ?? "-"}
                </td>

                  <td className="p-4">
                    ₱{payment.amount}
                  </td>

                  <td className="p-4">
                    {payment.payment_method}
                  </td>

                  <td className="p-4">

                    <span
                      className={`px-3 py-1 rounded-full text-white ${
                        payment.payment_status==="Paid"
                        ? "bg-green-600"
                        : "bg-yellow-500"
                      }`}
                    >
                      {payment.payment_status}
                    </span>

                  </td>

                  <td className="p-4">
                {payment.payment_status === "Paid" && (
                  <button
                    onClick={() =>
                      navigate(`/customer/receipt/${payment.booking_id}`)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    View Receipt
                  </button>
                )}
              </td>
                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    </CustomerLayout>

  );

}