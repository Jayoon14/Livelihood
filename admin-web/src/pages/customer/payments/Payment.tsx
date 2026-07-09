import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import { getBookingById } from "../../../services/bookingService";
import { createPayment } from "../../../services/paymentService";

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [method, setMethod] = useState("Cash");
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);

    const booking = await getBookingById(Number(id));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await createPayment(
      booking.id,
      user.id,
      booking.worker_id,
      booking.price,
      method
    );

    alert("Payment recorded successfully.");

    navigate("/customer/bookings");
  }

  return (
    <CustomerLayout>
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-8">

        <h1 className="text-3xl font-bold mb-8">
          Payment
        </h1>

        <label className="block mb-3 font-semibold">
          Payment Method
        </label>

        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="border rounded-lg p-3 w-full"
        >
          <option>Cash</option>
          <option>GCash</option>
          <option>Maya</option>
          <option>Bank Transfer</option>
        </select>

        <button
          onClick={handlePay}
          disabled={loading}
          className="mt-8 bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-xl"
        >
          {loading ? "Processing..." : "Confirm Payment"}
        </button>

      </div>
    </CustomerLayout>
  );
}