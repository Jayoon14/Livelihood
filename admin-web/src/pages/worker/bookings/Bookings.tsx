import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";

import {
  getWorkerBookings,
  acceptBooking,
  rejectBooking,
  completeBooking,
} from "../../../services/workerBookingService";


export default function Bookings() {

  const [bookings, setBookings] = useState<any[]>([]);


  useEffect(() => {
    loadBookings();
  }, []);



  async function loadBookings() {

    const {
      data: { user },
    } = await supabase.auth.getUser();


    if (!user) return;


    const data = await getWorkerBookings(user.id);

    setBookings(data);

  }



  async function handleApprove(id: number) {

    try {

      await acceptBooking(id);

      alert("Booking approved successfully.");

      loadBookings();

    } catch (error) {

      console.error(error);

      alert("Unable to approve booking.");

    }

  }




  async function handleReject(id: number) {

    try {

      await rejectBooking(id);

      alert("Booking rejected.");

      loadBookings();

    } catch (error) {

      console.error(error);

      alert("Unable to reject booking.");

    }

  }




  async function handleComplete(id: number) {

    try {

      await completeBooking(id);

      alert("Booking completed.");

      loadBookings();

    } catch (error) {

      console.error(error);

      alert("Unable to complete booking.");

    }

  }



  return (

    <WorkerLayout>

      <div className="p-8">

        <h1 className="text-3xl font-bold mb-6">
          My Bookings
        </h1>


        <div className="bg-white rounded-xl shadow overflow-hidden">

          <table className="w-full">

            <thead className="bg-gray-100">

              <tr>

                <th className="p-4 text-left">
                  Customer
                </th>

                <th className="p-4 text-left">
                  Date
                </th>

                <th className="p-4 text-left">
                  Time
                </th>

                <th className="p-4 text-left">
                  Status
                </th>

                <th className="p-4 text-left">
                  Actions
                </th>

              </tr>

            </thead>


            <tbody>

              {bookings.length > 0 ? (

                bookings.map((booking) => (

                  <tr
                    key={booking.id}
                    className="border-t"
                  >

                    <td className="p-4">
                      {booking.customer?.first_name}{" "}
                      {booking.customer?.last_name}
                    </td>


                    <td className="p-4">
                      {booking.booking_date}
                    </td>


                    <td className="p-4">
                      {booking.booking_time}
                    </td>


                    <td className="p-4">

                      <span
                        className={`px-3 py-1 rounded-full text-sm text-white ${
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

                    </td>


                    <td className="p-4">

                      <div className="flex flex-wrap gap-2">

                        <button
                          onClick={() =>
                            handleApprove(booking.id)
                          }
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"
                        >
                          Accept
                        </button>


                        <button
                          onClick={() =>
                            handleReject(booking.id)
                          }
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
                        >
                          Reject
                        </button>


                        <button
                          onClick={() =>
                            handleComplete(booking.id)
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
                        >
                          Complete
                        </button>


                        {booking.status === "Approved" && (

                          <Link
                            to={`/chat/${booking.id}`}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded"
                          >
                            Chat
                          </Link>

                        )}

                      </div>

                    </td>

                  </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan={5}
                    className="text-center p-6 text-gray-500"
                  >
                    No bookings found.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

    </WorkerLayout>

  );

}