import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import { supabase } from "../../../lib/supabase";

import { getBookingById } from "../../../services/bookingService";

import {
  createPayment,
  uploadPaymentProof,
} from "../../../services/paymentService";

import { getWorkerPaymentInformation } from "../../../services/paymentInformationService";

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [method, setMethod] = useState("Cash");
  const [loading, setLoading] = useState(false);

  const [booking, setBooking] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  const [proof, setProof] = useState<File | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

async function loadData() {
  if (!id) return;

  try {

    console.log("Payment page ID:", id);

    const bookingData = await getBookingById(Number(id));

    console.log("Booking:", bookingData);

    setBooking(bookingData);


    const paymentData =
      await getWorkerPaymentInformation(
        bookingData.worker_id
      );

    console.log("Worker Payment Info:", paymentData);


    setPaymentInfo(paymentData);


  } catch (err) {

    console.error("Payment Load Error:", err);

  }
}

 async function handlePay() {
  console.log(proof);

  try {
    setLoading(true);

    if (!id) {
      alert("Booking ID is missing.");
      return;
    }

    const bookingData =
      booking ?? await getBookingById(Number(id));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("User not authenticated.");
      return;
    }

    if (method !== "Cash") {

      if (!paidAmount) {
        alert("Please enter amount paid.");
        return;
      }

      if (!referenceNumber) {
        alert("Please enter reference number.");
        return;
      }

      if (!proof) {
        alert("Please upload proof of payment.");
        return;
      }

    }


    // Upload proof of payment
    let proofUrl = "";

    if (method !== "Cash") {

        proofUrl = await uploadPaymentProof(
          proof!,
          user.id
        );

    }


    const payment = await createPayment(
      bookingData.id,
      user.id,
      bookingData.worker_id,
      bookingData.price,
      method,
      paidAmount,
      referenceNumber,
      proofUrl
    );
    console.log("NEW PAYMENT ID:", payment.id);
    console.log("NEW PAYMENT BOOKING ID:", payment.booking_id);


    console.log(
      "Payment Created:",
      payment
    );


if (method === "Cash") {

  alert(
    "Cash payment request submitted. Please wait for worker confirmation."
  );

  navigate("/customer/bookings");

} else {

  alert(
    "Payment submitted successfully."
  );

    navigate(
      `/customer/receipt/${payment.booking_id}`
    );

}


  } catch (error: any) {

    console.error(error);

    alert(
      error.message ||
      "Payment submission failed."
    );

  } finally {

    setLoading(false);

  }
}
  if (!paymentInfo) {
    return (
      <CustomerLayout>
        <div className="p-10 text-center">
          Loading...
        </div>
      </CustomerLayout>
    );
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
          <option value="Cash">
            Cash
          </option>

          <option value="GCash">
            GCash
          </option>

          <option value="Maya">
            Maya
          </option>

          <option value="Bank Transfer">
            Bank Transfer
          </option>
        </select>


        {/* Payment Details */}
        <div className="mt-6">

          {method === "GCash" &&
            paymentInfo.enable_gcash && (

            <div className="rounded-xl border p-5 space-y-4">

              <h2 className="font-bold text-lg">
                GCash Payment
              </h2>

              <p>
                <strong>Name:</strong>{" "}
                {paymentInfo.gcash_name}
              </p>

              <p>
                <strong>Number:</strong>{" "}
                {paymentInfo.gcash_number}
              </p>

              {paymentInfo.gcash_qr && (
                <img
                  src={paymentInfo.gcash_qr}
                  alt="GCash QR"
                  className="w-64 rounded-xl border"
                />
              )}

            </div>
          )}


          {method === "Maya" &&
            paymentInfo.enable_maya && (

            <div className="rounded-xl border p-5 space-y-4">

              <h2 className="font-bold text-lg">
                Maya Payment
              </h2>

              <p>
                <strong>Name:</strong>{" "}
                {paymentInfo.maya_name}
              </p>

              <p>
                <strong>Number:</strong>{" "}
                {paymentInfo.maya_number}
              </p>

              {paymentInfo.maya_qr && (
                <img
                  src={paymentInfo.maya_qr}
                  alt="Maya QR"
                  className="w-64 rounded-xl border"
                />
              )}

            </div>
          )}


          {method === "Bank Transfer" &&
            paymentInfo.enable_bank && (

            <div className="rounded-xl border p-5 space-y-4">

              <h2 className="font-bold text-lg">
                Bank Transfer
              </h2>

              <p>
                <strong>Bank:</strong>{" "}
                {paymentInfo.bank_name}
              </p>

              <p>
                <strong>Account Name:</strong>{" "}
                {paymentInfo.account_name}
              </p>

              <p>
                <strong>Account Number:</strong>{" "}
                {paymentInfo.account_number}
              </p>

              {paymentInfo.bank_qr && (
                <img
                  src={paymentInfo.bank_qr}
                  alt="Bank QR"
                  className="w-64 rounded-xl border"
                />
              )}

            </div>
          )}

        </div>


        {/* Proof of Payment */}
        {method !== "Cash" && (

          <div className="mt-6 space-y-5">

            <div>
              <label className="font-semibold">
                Amount Paid
              </label>

              <input
                type="number"
                value={paidAmount}
                onChange={(e) =>
                  setPaidAmount(
                    Number(e.target.value)
                  )
                }
                className="border rounded-lg w-full p-3"
              />
            </div>


            <div>
              <label className="font-semibold">
                Reference Number
              </label>

              <input
                value={referenceNumber}
                onChange={(e) =>
                  setReferenceNumber(
                    e.target.value
                  )
                }
                className="border rounded-lg w-full p-3"
              />
            </div>


            <div>
              <label className="font-semibold">
                Upload Proof of Payment
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setProof(
                    e.target.files?.[0] || null
                  )
                }
              />
            </div>

          </div>

        )}


        <button
          onClick={handlePay}
          disabled={loading}
          className="mt-8 w-full rounded-xl bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading
            ? "Processing..."
            : "Confirm Payment"}
        </button>

      </div>
    </CustomerLayout>
  );
}