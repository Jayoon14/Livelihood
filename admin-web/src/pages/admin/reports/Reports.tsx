import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import {
  getDashboardStats,
  getRecentBookings,
} from "../../../services/reportService";

export default function Reports() {
  const [stats, setStats] = useState({
    workers: 0,
    customers: 0,
    bookings: 0,
    reviews: 0,
  });

  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    const summary = await getDashboardStats();
    const bookings = await getRecentBookings();

    setStats(summary);
    setRecentBookings(bookings);
  }

  return (
    <AdminLayout>
      <div className="p-8">

        <h1 className="text-3xl font-bold mb-8">
          Reports & Analytics
        </h1>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-4 gap-6 mb-10">

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">Workers</p>
            <h2 className="text-4xl font-bold">
              {stats.workers}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">Customers</p>
            <h2 className="text-4xl font-bold">
              {stats.customers}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">Bookings</p>
            <h2 className="text-4xl font-bold">
              {stats.bookings}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">Reviews</p>
            <h2 className="text-4xl font-bold">
              {stats.reviews}
            </h2>
          </div>

        </div>

        {/* RECENT BOOKINGS */}
        <div className="bg-white rounded-xl shadow">

          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">
              Recent Bookings
            </h2>
          </div>

          <table className="w-full">

            <thead className="bg-gray-100">

              <tr>

                <th className="p-4 text-left">Customer</th>

                <th className="p-4 text-left">Worker</th>

                <th className="p-4 text-left">Date</th>

                <th className="p-4 text-left">Status</th>

              </tr>

            </thead>

            <tbody>

              {recentBookings.map((booking) => (

                <tr
                  key={booking.id}
                  className="border-t"
                >

                  <td className="p-4">
                    {booking.customer?.first_name}{" "}
                    {booking.customer?.last_name}
                  </td>

                  <td className="p-4">
                    {booking.worker?.first_name}{" "}
                    {booking.worker?.last_name}
                  </td>

                  <td className="p-4">
                    {booking.booking_date}
                  </td>

                  <td className="p-4">
                    {booking.status}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>
    </AdminLayout>
  );
}