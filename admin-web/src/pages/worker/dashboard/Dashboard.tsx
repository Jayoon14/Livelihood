import { useEffect, useState } from "react";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";

import { getWorkerBookings } from "../../../services/workerBookingService";
import {
  acceptBooking,
  rejectBooking,
} from "../../../services/bookingService";

export default function Dashboard() {
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    try {
      const data = await getWorkerBookings(user.id);
      setBookings(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleAccept(id: number) {
    try {
      await acceptBooking(id);

      alert("Booking Approved.");

      loadDashboard();
    } catch (error) {
      console.error(error);
      alert("Failed to approve booking.");
    }
  }

  async function handleReject(id: number) {
    try {
      await rejectBooking(id);

      alert("Booking Cancelled.");

      loadDashboard();
    } catch (error) {
      console.error(error);
      alert("Failed to cancel booking.");
    }
  }

  const pending = bookings.filter(
    (b) => b.status === "Pending"
  ).length;

  const approved = bookings.filter(
    (b) => b.status === "Approved"
  ).length;

  const completed = bookings.filter(
    (b) => b.status === "Completed"
  ).length;

  const cancelled = bookings.filter(
    (b) => b.status === "Cancelled"
  ).length;

  return (
    <WorkerLayout>
      <div className="p-8">

        <h1 className="text-3xl font-bold mb-8">
          Worker Dashboard
        </h1>


        <div className="grid grid-cols-4 gap-6">

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-gray-500">
              Pending
            </h2>

            <p className="text-4xl font-bold mt-2">
              {pending}
            </p>
          </div>


          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-gray-500">
              Approved
            </h2>

            <p className="text-4xl font-bold mt-2">
              {approved}
            </p>
          </div>


          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-gray-500">
              Completed
            </h2>

            <p className="text-4xl font-bold mt-2">
              {completed}
            </p>
          </div>


          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-gray-500">
              Cancelled
            </h2>

            <p className="text-4xl font-bold mt-2">
              {cancelled}
            </p>
          </div>

        </div>



        <div className="bg-white rounded-xl shadow mt-8 p-6">

          <h2 className="text-xl font-bold mb-5">
            Latest Bookings
          </h2>


          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr className="border-b">

                  <th className="text-left p-3">
                    Customer
                  </th>

                  <th className="text-left p-3">
                    Date
                  </th>

                  <th className="text-left p-3">
                    Time
                  </th>

                  <th className="text-left p-3">
                    Address
                  </th>

                  <th className="text-left p-3">
                    Status
                  </th>

                  <th className="text-left p-3">
                    Action
                  </th>

                </tr>
              </thead>


              <tbody>

                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b"
                  >

                    <td className="p-3">
                      {[
                        booking.customer?.first_name,
                        booking.customer?.middle_name,
                        booking.customer?.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </td>


                    <td className="p-3">
                      {booking.booking_date}
                    </td>


                    <td className="p-3">
                      {booking.booking_time}
                    </td>


                    <td className="p-3">
                      {booking.address}
                    </td>


                    <td className="p-3">

                      <span
                        className={`px-3 py-1 rounded-full text-white ${
                          booking.status === "Pending"
                            ? "bg-yellow-500"
                            : booking.status === "Approved"
                            ? "bg-green-600"
                            : booking.status === "Completed"
                            ? "bg-blue-600"
                            : booking.status === "Cancelled"
                            ? "bg-red-600"
                            : "bg-gray-500"
                        }`}
                      >
                        {booking.status}
                      </span>

                    </td>


                    <td className="p-3">

                      {booking.status === "Pending" ? (

                        <div className="flex gap-2">

                          <button
                            onClick={() =>
                              handleAccept(booking.id)
                            }
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                          >
                            Accept
                          </button>


                          <button
                            onClick={() =>
                              handleReject(booking.id)
                            }
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                          >
                            Reject
                          </button>

                        </div>

                      ) : (
                        "-"
                      )}

                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    </WorkerLayout>
  );
}