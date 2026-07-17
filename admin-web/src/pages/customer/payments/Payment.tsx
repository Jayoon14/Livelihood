import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import { supabase } from "../../../lib/supabase";

import { getBookingById } from "../../../services/bookingService";

import {
  createPayment,
  completePayment,
} from "../../../services/paymentService";


export default function Payment() {

  const { id } = useParams();

  const navigate = useNavigate();

  const [method, setMethod] = useState("Cash");
  const [loading, setLoading] = useState(false);



  async function handlePay() {

    try {

      setLoading(true);



      if (!id) {

        alert("Booking ID is missing.");

        return;

      }



      const booking = await getBookingById(
        Number(id)
      );



      const {
        data: { user },
      } = await supabase.auth.getUser();



      if (!user) {

        alert("User not authenticated.");

        return;

      }



      const payment = await createPayment(
        booking.id,
        user.id,
        booking.worker_id,
        booking.price,
        method
      );



      await completePayment(
        payment.id,
        booking.id
      );



      alert(
        "Payment recorded successfully."
      );



      navigate(
        `/customer/receipt/${booking.id}`
      );



    } catch (error: any) {


      console.error(error);


      alert(
        error.message || "Payment failed."
      );


    } finally {


      setLoading(false);


    }

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

          onChange={(e) =>
            setMethod(e.target.value)
          }

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





        <button

          onClick={handlePay}

          disabled={loading}

          className="mt-8 w-full rounded-xl bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:bg-gray-400"

        >

          {
            loading
              ? "Processing..."
              : "Confirm Payment"
          }


        </button>



      </div>


    </CustomerLayout>

  );

}