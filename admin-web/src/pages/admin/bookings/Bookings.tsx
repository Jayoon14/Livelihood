import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";

import {
  getAllBookings,
  updateBookingStatus,
} from "../../../services/adminBookingService";

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    const data = await getAllBookings();
    setBookings(data);
  }

  async function changeStatus(
    id: number,
    status: string
  ) {
    await updateBookingStatus(id, status);
    loadBookings();
  }

  return (
    <AdminLayout>

      <h1 className="text-3xl font-bold mb-8">
        All Bookings
      </h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">

        <table className="w-full">

          <thead className="bg-slate-100">

            <tr>

              <th className="p-4 text-left">
                Customer
              </th>

              <th className="p-4 text-left">
                Worker
              </th>

              <th className="p-4 text-left">
                Date
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
                  {booking.customer?.full_name}
                </td>

                <td className="p-4">
                  {booking.worker?.full_name}
                </td>

                <td className="p-4">
                  {booking.booking_date}
                </td>

                <td className="p-4">
                  {booking.status}
                </td>

                <td className="p-4 flex gap-2">

                  <button
                    onClick={() =>
                      changeStatus(
                        booking.id,
                        "Approved"
                      )
                    }
                    className="bg-green-600 text-white px-3 py-2 rounded"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() =>
                      changeStatus(
                        booking.id,
                        "Cancelled"
                      )
                    }
                    className="bg-red-600 text-white px-3 py-2 rounded"
                  >
                    Reject
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </AdminLayout>
  );
}