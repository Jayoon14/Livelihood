import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

async function handleStatus(
  id: number,
  status: "Pending" | "Approved" | "Completed" | "Cancelled"
) {
  await updateBookingStatus(id, status);
  loadBookings();
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
              {bookings.map((booking) => (
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
                    {booking.status}
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleStatus(
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
                          handleStatus(
                            booking.id,
                            "Cancelled"
                          )
                        }
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() =>
                          handleStatus(
                            booking.id,
                            "Completed"
                          )
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
                      >
                        Complete
                      </button>

                      {booking.status ===
                        "Approved" && (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WorkerLayout>
  );
}