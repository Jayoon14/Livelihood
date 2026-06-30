import { useEffect, useState } from "react";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import { getCustomerBookings } from "../../../services/customerBookingService";

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const data = await getCustomerBookings(user.id);

    setBookings(data || []);
    setLoading(false);
  }

  return (
    <CustomerLayout>
      <div className="p-6">

        <h1 className="text-3xl font-bold mb-8">
          My Bookings
        </h1>

        {/* LOADING */}
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            Loading bookings...
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No bookings found.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow p-6 overflow-x-auto">
            <table className="w-full">

              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">Address</th>
                  <th className="p-3 text-left">Worker</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-b">

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
                      {booking.worker?.full_name || "-"}
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          booking.status === "Pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : booking.status === "Approved"
                            ? "bg-blue-100 text-blue-700"
                            : booking.status === "Ongoing"
                            ? "bg-purple-100 text-purple-700"
                            : booking.status === "Completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

      </div>
    </CustomerLayout>
  );
}