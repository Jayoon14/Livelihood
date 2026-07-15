import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import {
  getBooking,
  cancelBooking,
} from "../../../services/bookingService";

import { supabase } from "../../../lib/supabase";
import { hasReviewed } from "../../../services/reviewService";


export default function BookingDetails() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewed, setReviewed] = useState(false);


  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);


  async function loadBooking() {

    try {

      setLoading(true);

      const data = await getBooking(id!);

      setBooking(data);


      const {
        data: { user },
      } = await supabase.auth.getUser();


      if (user) {

        const alreadyReviewed = await hasReviewed(
          Number(id),
          user.id
        );

        setReviewed(alreadyReviewed);

      }

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);

    }

  }


  async function handleCancel() {

    const confirmed = window.confirm(
      "Cancel this booking?"
    );

    if (!confirmed) return;


    try {

      await cancelBooking(Number(id));

      alert("Booking cancelled.");

      loadBooking();

    } catch (error) {

      console.error(error);

      alert("Unable to cancel booking.");

    }

  }
    if (loading) {

    return (
      <CustomerLayout>

        <div className="p-10 text-center">
          Loading...
        </div>

      </CustomerLayout>
    );

  }


  if (!booking) {

    return (
      <CustomerLayout>

        <div className="p-10 text-center">
          Booking not found.
        </div>

      </CustomerLayout>
    );

  }


  const steps = [
    "Pending",
    "Approved",
    "Completed",
  ];


  const currentStep = steps.indexOf(
    booking.status
  );


  return (
    <CustomerLayout>

      <div className="max-w-5xl mx-auto space-y-6 p-6">


        {/* BOOKING DETAILS */}

        <div className="bg-white rounded-xl shadow p-6">

          <h1 className="text-3xl font-bold mb-5">
            Booking Details
          </h1>


          <div className="grid md:grid-cols-2 gap-5">

            <div>

              <p className="text-gray-500">
                Worker
              </p>

              <p className="font-semibold">
                {[
                  booking.worker?.first_name,
                  booking.worker?.middle_name,
                  booking.worker?.last_name,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>

            </div>


            <div>

              <p className="text-gray-500">
                Status
              </p>

              <span
                className={`inline-block px-3 py-1 rounded-full text-white text-sm ${
                  booking.status === "Pending"
                    ? "bg-yellow-500"
                    : booking.status === "Approved"
                    ? "bg-green-600"
                    : booking.status === "Completed"
                    ? "bg-blue-600"
                    : "bg-red-600"
                }`}
              >
                {booking.status}
              </span>

            </div>


            <div>

              <p className="text-gray-500">
                Date
              </p>

              <p className="font-semibold">
                {booking.booking_date}
              </p>

            </div>


            <div>

              <p className="text-gray-500">
                Time
              </p>

              <p className="font-semibold">
                {booking.booking_time}
              </p>

            </div>


            <div className="md:col-span-2">

              <p className="text-gray-500">
                Address
              </p>

              <p className="font-semibold">
                {booking.address}
              </p>

            </div>


            <div className="md:col-span-2">

              <p className="text-gray-500">
                Notes
              </p>

              <p className="font-semibold">
                {booking.notes || "-"}
              </p>

            </div>

          </div>

        </div>
                {/* BOOKING PROGRESS */}

        <div className="bg-white rounded-xl shadow p-6">

          <h2 className="text-2xl font-bold mb-6">
            Booking Progress
          </h2>


          <div className="space-y-5">

            {steps.map((step, index) => (

              <div
                key={step}
                className="flex items-center gap-4"
              >

                <div
                  className={`w-5 h-5 rounded-full ${
                    index <= currentStep
                      ? "bg-green-600"
                      : "bg-gray-300"
                  }`}
                />


                <p
                  className={`font-semibold ${
                    index <= currentStep
                      ? "text-green-700"
                      : "text-gray-400"
                  }`}
                >
                  {step}
                </p>

              </div>

            ))}

          </div>

        </div>



        {/* ACTIONS */}

        <div className="flex flex-wrap gap-4">


          {booking.status === "Pending" && (

            <button
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg"
            >
              Cancel Booking
            </button>

          )}



          {booking.status === "Approved" && (

            <button
              onClick={() =>
                navigate(
                  `/chat/${booking.id}`
                )
              }
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
            >
              Chat Worker
            </button>

          )}



          {booking.status === "Completed" &&
            !reviewed && (

              <button
                onClick={() =>
                  navigate(
                    `/customer/review/${booking.id}`
                  )
                }
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg"
              >
                Leave Review
              </button>

            )}



          {booking.status === "Completed" &&
            reviewed && (

              <div className="bg-green-100 text-green-700 px-6 py-3 rounded-lg font-semibold">
                ✅ Review Submitted
              </div>

            )}


        </div>


      </div>

    </CustomerLayout>
  );

}