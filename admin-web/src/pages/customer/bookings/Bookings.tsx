import { useEffect, useState } from "react";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  getWorkerBookings,
  updateBookingStatus,
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

  async function updateStatus(
    id: number,
    status: "Approved" | "Cancelled" | "Completed"
  ) {
    try {
      await updateBookingStatus(id, status);
      loadBookings();
    } catch (error) {
      console.error(error);
      alert("Failed to update booking status.");
    }
  }

  return (
    <WorkerLayout>
      <div className="p-8">

        <h1 className="text-3xl font-bold mb-8">
          My Bookings
        </h1>

        <div className="bg-white rounded-2xl shadow overflow-hidden">

          <table className="w-full">

            <thead className="bg-slate-100">
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
                  Action
                </th>

              </tr>
            </thead>


            <tbody>

              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-t"
                >

                  <td className="p-4">
                    {[
                      booking.customer?.first_name,
                      booking.customer?.middle_name,
                      booking.customer?.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </td>


                  <td className="p-4">
                    {booking.booking_date}
                  </td>


                  <td className="p-4">
                    {booking.booking_time}
                  </td>


                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-white text-sm ${
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

                    {booking.status === "Pending" && (
                      <div className="flex gap-2">

                        <button
                          onClick={() =>
                            updateStatus(
                              booking.id,
                              "Approved"
                            )
                          }
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"
                        >
                          Accept
                        </button>


                        <button
                          onClick={() =>
                            updateStatus(
                              booking.id,
                              "Cancelled"
                            )
                          }
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
                        >
                          Reject
                        </button>

                      </div>
                    )}


                    {booking.status === "Approved" && (
                      <button
                        onClick={() =>
                          updateStatus(
                            booking.id,
                            "Completed"
                          )
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
                      >
                        Complete Job
                      </button>
                    )}


                    {(booking.status === "Completed" ||
                      booking.status === "Cancelled") && (
                      <span className="text-gray-500">
                        No Action
                      </span>
                    )}

                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>
    </WorkerLayout>
  );
}