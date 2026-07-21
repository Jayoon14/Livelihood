import { useEffect, useState } from "react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import AdminLayout from "../../../layouts/AdminLayout";

import {
  getDashboardStats,
  getRecentBookings,
} from "../../../services/reportService";

import {
  getBookingStatusCounts,
  getMonthlyBookings,
  getTopWorkers,
} from "../../../services/dashboardService";

export default function Reports() {
  const [stats, setStats] = useState({
    workers: 0,
    customers: 0,
    bookings: 0,
    reviews: 0,
  });

  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  const [statusData, setStatusData] = useState<any[]>([]);

  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  const [topWorkers, setTopWorkers] = useState<any[]>([]);

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    const summary = await getDashboardStats();

    const bookings = await getRecentBookings();

    const bookingStatus = await getBookingStatusCounts();

    const monthly = await getMonthlyBookings();

    const workers = await getTopWorkers();

    setStats(summary);

    setRecentBookings(bookings);

    setStatusData([
      {
        name: "Pending",
        value: bookingStatus.Pending,
      },

      {
        name: "Approved",
        value: bookingStatus.Approved,
      },

      {
        name: "Completed",
        value: bookingStatus.Completed,
      },

      {
        name: "Cancelled",
        value: bookingStatus.Cancelled,
      },
    ]);

    setMonthlyData(monthly);

    setTopWorkers(workers);
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Reports & Analytics</h1>

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">Workers</p>

            <h2 className="text-4xl font-bold">{stats.workers}</h2>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">Customers</p>

            <h2 className="text-4xl font-bold">{stats.customers}</h2>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">Bookings</p>

            <h2 className="text-4xl font-bold">{stats.bookings}</h2>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500">Reviews</p>

            <h2 className="text-4xl font-bold">{stats.reviews}</h2>
          </div>
        </div>

        {/* ANALYTICS CHARTS */}

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          {/* MONTHLY BOOKINGS */}

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-bold text-xl mb-5">Monthly Bookings</h2>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="month" />

                <YAxis />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="#2563eb"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* BOOKING STATUS */}

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-bold text-xl mb-5">Booking Status</h2>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                >
                  {statusData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RECENT BOOKINGS */}

        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Recent Bookings</h2>
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
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <tr key={booking.id} className="border-t">
                    <td className="p-4">
                      {booking.customer?.first_name}{" "}
                      {booking.customer?.last_name}
                    </td>

                    <td className="p-4">
                      {booking.worker?.first_name} {booking.worker?.last_name}
                    </td>

                    <td className="p-4">{booking.booking_date}</td>

                    <td className="p-4">{booking.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center p-5">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TOP RATED WORKERS */}

        <div className="bg-white rounded-xl shadow mt-10">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Top Rated Workers</h2>
          </div>

          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left">Worker</th>

                <th className="p-4 text-left">Rating</th>

                <th className="p-4 text-left">Reviews</th>
              </tr>
            </thead>

            <tbody>
              {topWorkers.length > 0 ? (
                topWorkers.map((worker) => (
                  <tr key={worker.worker} className="border-t">
                    <td className="p-4">{worker.worker}</td>

                    <td className="p-4">⭐ {worker.rating}</td>

                    <td className="p-4">{worker.reviews}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center p-5">
                    No worker ratings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
